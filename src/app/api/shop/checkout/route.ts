import { appUrl } from '@/lib/app-url';
import dbConnect from '@/lib/db';
import { generateToken } from '@/lib/auth-tokens';
import { expireOrder, generateOrderNumber, releaseExpiredOrders } from '@/lib/orders';
import { normalizeFrenchPhone } from '@/lib/phone';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { computeShippingCost, getShopSettings } from '@/lib/shipping';
import { cartLinesSchema, resolveCart } from '@/lib/shop';
import { reserveStock, restoreStock } from '@/lib/stock';
import { getStripe, isStripeConfigured, toCents } from '@/lib/stripe';
import MerchModel from '@/models/Merch';
import OrderModel from '@/models/Order';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { z } from 'zod';

// Durée de réservation du stock = durée de vie de la session de paiement Stripe
// (Stripe impose au moins 30 minutes ; on prend une marge pour le décalage d'horloge).
const SESSION_MINUTES = 32;
const RESERVATION_MARGIN_MINUTES = 2;

const postalCode = z.string().regex(/^\d{5}$/);

const bodySchema = z.object({
  lines: cartLinesSchema.min(1),
  customer: z.object({
    email: z.string().trim().toLowerCase().email().max(120),
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    phone: z.string().trim().min(1).max(30),
  }),
  delivery: z.discriminatedUnion('mode', [
    z.object({
      mode: z.literal('relay'),
      relayPoint: z.object({
        code: z.string().trim().min(1).max(40),
        network: z.string().trim().max(30).default(''),
        name: z.string().trim().min(1).max(120),
        street: z.string().trim().max(160).default(''),
        postalCode,
        city: z.string().trim().min(1).max(80),
      }),
    }),
    z.object({
      mode: z.literal('home'),
      address: z.object({
        street: z.string().trim().min(3).max(160),
        complement: z.string().trim().max(120).default(''),
        postalCode,
        city: z.string().trim().min(1).max(80),
      }),
    }),
  ]),
  acceptTerms: z.literal(true),
});

const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

/**
 * Crée la commande (statut "en attente de paiement"), réserve le stock puis
 * ouvre la session de paiement Stripe. Rien n'est jamais pris du navigateur
 * hormis la composition du panier et les coordonnées : prix, port et stock
 * sont recalculés ici.
 */
export async function POST(request: Request) {
  const limit = await rateLimit(`checkout:ip:${clientIp(request)}`, 10, 10 * 60 * 1000);
  if (!limit.ok) {
    return fail('Trop de tentatives. Réessayez dans quelques minutes.', 429);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail('Certaines informations sont manquantes ou invalides. Vérifiez le formulaire.', 400);
  }
  const { lines, customer, delivery } = parsed.data;

  const phone = normalizeFrenchPhone(customer.phone);
  if (!phone) {
    return fail('Numéro de téléphone invalide (numéro français attendu, ex. 06 12 34 56 78).', 400);
  }

  const settings = await getShopSettings();
  if (!settings.shopEnabled || !isStripeConfigured()) {
    return fail('La boutique en ligne est momentanément fermée.', 503);
  }

  // Rend d'abord le stock des paiements abandonnés : il est peut-être de nouveau disponible.
  await releaseExpiredOrders();

  const cart = await resolveCart(lines);
  if (cart.hasIssues || cart.lines.length === 0) {
    return fail('Votre panier a changé (article épuisé ou quantité ajustée). Vérifiez-le avant de payer.', 409, {
      cartChanged: true,
    });
  }

  const shipping = computeShippingCost(settings, cart.weightGrams, delivery.mode);
  const offerCode = delivery.mode === 'relay' ? settings.relayOfferCode : settings.homeOfferCode;
  if (!shipping.ok || !offerCode) {
    return fail('Ce mode de livraison n’est pas disponible pour ce panier.', 422);
  }

  // Coût de revient figé sur la commande (alimente les stats de bénéfice).
  const products = await MerchModel.find({ _id: { $in: cart.lines.map((line) => line.merchId) } })
    .select('costPrice')
    .lean();
  const costById = new Map(products.map((product) => [String(product._id), product.costPrice ?? 0]));

  const stockLines = cart.lines.map((line) => ({ merch: line.merchId, size: line.size, quantity: line.quantity }));
  const reservation = await reserveStock(stockLines);
  if (!reservation.ok) {
    return fail('Un article vient d’être épuisé. Vérifiez votre panier.', 409, { cartChanged: true });
  }

  await dbConnect();
  const total = cart.subtotal + shipping.cost;
  const deliveryLabel = delivery.mode === 'relay' ? 'Point relais' : 'À domicile';
  const publicToken = generateToken();
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60;

  let order;
  try {
    order = await OrderModel.create({
      number: await generateOrderNumber(),
      publicToken,
      status: 'pending_payment',
      statusHistory: [{ status: 'pending_payment', at: new Date(), note: 'Commande créée', by: 'client' }],
      items: cart.lines.map((line) => ({
        merch: line.merchId,
        title: line.title,
        size: line.size,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        unitCost: costById.get(line.merchId) ?? 0,
        weightGrams: line.weightGrams,
      })),
      subtotal: cart.subtotal,
      shippingCost: shipping.cost,
      total,
      customer: { ...customer, phone },
      delivery: {
        mode: delivery.mode,
        label: deliveryLabel,
        offerCode,
        relayPoint: delivery.mode === 'relay' ? delivery.relayPoint : undefined,
        address: delivery.mode === 'home' ? delivery.address : undefined,
        weightGrams: shipping.parcelWeightGrams,
      },
      reservedUntil: new Date((expiresAt + RESERVATION_MARGIN_MINUTES * 60) * 1000),
    });
  } catch (error) {
    console.error('Order creation error:', error);
    await restoreStock(stockLines);
    return fail('Impossible de créer la commande. Réessayez.', 500);
  }

  try {
    const base = appUrl();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: 'eur',
        unit_amount: toCents(line.unitPrice),
        product_data: {
          name: line.size ? `${line.title} (${line.size})` : line.title,
          // Stripe n'accepte que des URLs publiques en https.
          images: line.image.startsWith('https://') ? [line.image] : undefined,
        },
      },
    }));

    if (shipping.cost > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: toCents(shipping.cost),
          product_data: { name: `Livraison – ${deliveryLabel}` },
        },
      });
    }

    const session = await getStripe().checkout.sessions.create(
      {
        mode: 'payment',
        locale: 'fr',
        customer_email: customer.email,
        client_reference_id: order._id.toString(),
        line_items: lineItems,
        metadata: { orderId: order._id.toString(), orderNumber: order.number },
        payment_intent_data: {
          description: `Commande ${order.number}`,
          metadata: { orderId: order._id.toString(), orderNumber: order.number },
        },
        expires_at: expiresAt,
        success_url: `${base}/commande/confirmation?token=${publicToken}`,
        cancel_url: `${base}/commande/annulee?token=${publicToken}`,
      },
      // Clé d'idempotence : un renvoi accidentel ne crée pas une deuxième session.
      { idempotencyKey: `checkout-${order._id.toString()}` }
    );

    await OrderModel.updateOne({ _id: order._id }, { $set: { 'payment.stripeSessionId': session.id } });

    if (!session.url) {
      throw new Error('Session Stripe sans URL.');
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe session error:', error);
    // Le client n'a rien payé : on ferme la commande et on rend le stock.
    await expireOrder(order._id, 'Erreur à la création du paiement');
    return fail('Le paiement est momentanément indisponible. Réessayez dans un instant.', 502);
  }
}
