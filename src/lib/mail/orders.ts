import dbConnect from '@/lib/db';
import { formatPrice } from '@/lib/merch';
import GroupInfoModel from '@/models/GroupInfo';
import type { IOrder } from '@/models/Order';
import { appUrl, renderEmail } from './layout';
import { sendMail } from './transport';

type OrderForMail = Pick<
  IOrder,
  'number' | 'items' | 'subtotal' | 'shippingCost' | 'total' | 'customer' | 'delivery' | 'shipment'
> & { _id: { toString: () => string } };

function summaryOf(order: OrderForMail) {
  return {
    rows: [
      ...order.items.map((item) => ({
        label: `${item.quantity} × ${item.title}${item.size ? ` (${item.size})` : ''}`,
        value: formatPrice(item.unitPrice * item.quantity),
      })),
      { label: `Livraison : ${order.delivery.label}`, value: formatPrice(order.shippingCost) },
    ],
    total: { label: 'Total', value: formatPrice(order.total) },
  };
}

function deliveryText(order: OrderForMail) {
  const { delivery } = order;
  if (delivery.mode === 'relay' && delivery.relayPoint) {
    const point = delivery.relayPoint;
    return `${point.name}, ${point.street}, ${point.postalCode} ${point.city}`;
  }
  if (delivery.address) {
    const address = delivery.address;
    return `${address.street}${address.complement ? `, ${address.complement}` : ''}, ${address.postalCode} ${address.city}`;
  }
  return '';
}

/** Destinataires des alertes de nouvelle commande : ORDER_NOTIFY_EMAIL, sinon l'email de contact du groupe. */
async function adminRecipients() {
  const fromEnv = (process.env.ORDER_NOTIFY_EMAIL ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  if (fromEnv.length > 0) {
    return fromEnv;
  }

  await dbConnect();
  const info = await GroupInfoModel.findOne({}).select('contactEmail').lean();
  return info?.contactEmail ? [info.contactEmail] : [];
}

/** Adresse à laquelle le client peut répondre (contact du groupe). */
async function replyToContact() {
  return (await adminRecipients())[0];
}

export async function sendNewOrderAdminEmail(order: OrderForMail) {
  const recipients = await adminRecipients();
  if (recipients.length === 0) {
    console.warn('Nouvelle commande : aucun destinataire (ORDER_NOTIFY_EMAIL ou email de contact du groupe).');
    return;
  }

  const content = renderEmail({
    preheader: `${order.customer.firstName} ${order.customer.lastName} · ${formatPrice(order.total)}`,
    title: `Nouvelle commande ${order.number}`,
    paragraphs: [
      `${order.customer.firstName} ${order.customer.lastName} (${order.customer.email}, ${order.customer.phone}) vient de passer commande.`,
      `Livraison : ${deliveryText(order)}.`,
    ],
    summary: summaryOf(order),
    button: { label: 'Ouvrir la commande', url: `${appUrl()}/admin/commandes/${order._id.toString()}` },
  });

  await sendMail({ to: recipients.join(', '), subject: `Nouvelle commande ${order.number} (${formatPrice(order.total)})`, ...content });
}

export async function sendOrderConfirmationEmail(order: OrderForMail) {
  const content = renderEmail({
    preheader: `Merci ! Votre commande ${order.number} est confirmée.`,
    title: 'Merci pour votre commande !',
    paragraphs: [
      `Bonjour ${order.customer.firstName},`,
      `Votre commande ${order.number} est bien enregistrée et payée. Nous préparons votre colis : vous recevrez un nouveau mail avec le suivi dès qu’il sera expédié.`,
      `Adresse de livraison : ${deliveryText(order)}.`,
    ],
    summary: summaryOf(order),
    footnote: 'Une question sur votre commande ? Répondez à ce message en indiquant votre numéro de commande.',
    canReply: true,
  });

  await sendMail({ to: order.customer.email, replyTo: await replyToContact(), subject: `Confirmation de votre commande ${order.number}`, ...content });
}

export async function sendOrderShippedEmail(order: OrderForMail) {
  const tracking = order.shipment.trackingUrl
    ? { label: 'Suivre mon colis', url: order.shipment.trackingUrl }
    : undefined;

  const content = renderEmail({
    preheader: `Votre commande ${order.number} est en route.`,
    title: 'Votre colis est en route',
    paragraphs: [
      `Bonjour ${order.customer.firstName},`,
      `Votre commande ${order.number} vient d’être remise au transporteur.`,
      ...(order.shipment.trackingNumber ? [`Numéro de suivi : ${order.shipment.trackingNumber}.`] : []),
      order.delivery.mode === 'relay'
        ? 'Vous serez prévenu par le transporteur dès que le colis sera disponible en point relais.'
        : 'Le transporteur vous préviendra avant la livraison à votre adresse.',
    ],
    button: tracking,
    canReply: true,
  });

  await sendMail({ to: order.customer.email, replyTo: await replyToContact(), subject: `Votre commande ${order.number} a été expédiée`, ...content });
}

export async function sendOrderCancelledEmail(order: OrderForMail, refunded: boolean) {
  const content = renderEmail({
    preheader: `Votre commande ${order.number} a été annulée.`,
    title: 'Commande annulée',
    paragraphs: [
      `Bonjour ${order.customer.firstName},`,
      refunded
        ? `Votre commande ${order.number} a été annulée et remboursée de ${formatPrice(order.total)}. Le remboursement apparaît sur votre compte sous quelques jours ouvrés selon votre banque.`
        : `Votre commande ${order.number} a été annulée.`,
    ],
    footnote: 'Une question ? Répondez simplement à ce message.',
    canReply: true,
  });

  await sendMail({ to: order.customer.email, replyTo: await replyToContact(), subject: `Votre commande ${order.number} a été annulée`, ...content });
}
