import { ensureValidObjectId, requireSession } from '@/lib/api-route-helpers';
import { createShippingOrder, getShipmentDocuments, getTracking } from '@/lib/boxtal';
import dbConnect from '@/lib/db';
import { transitionOrder } from '@/lib/orders';
import { getShopSettings } from '@/lib/shipping';
import OrderModel from '@/models/Order';
import { NextResponse } from 'next/server';
import { serializeOrder } from '../../route';

/**
 * Commande l'étiquette chez Boxtal. Le suivi et le PDF peuvent n'être prêts
 * que quelques secondes plus tard : ils sont alors complétés par le webhook
 * Boxtal ou, à défaut, saisis à la main via « Marquer expédiée ».
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession();
  if (error) {
    return error;
  }

  const { id } = await context.params;
  const invalidId = ensureValidObjectId(id);
  if (invalidId) {
    return invalidId;
  }

  await dbConnect();

  // Verrou atomique : deux clics (ou deux admins) ne commandent pas deux étiquettes.
  const claimed = await OrderModel.findOneAndUpdate(
    { _id: id, status: { $in: ['paid', 'preparing'] }, 'shipment.boxtalOrderId': '' },
    { $set: { 'shipment.boxtalOrderId': 'pending' } },
    { new: true }
  );
  if (!claimed) {
    return NextResponse.json(
      { error: 'Une étiquette existe déjà pour cette commande, ou son statut ne le permet pas.' },
      { status: 409 }
    );
  }

  const releaseClaim = () => OrderModel.updateOne({ _id: id }, { $set: { 'shipment.boxtalOrderId': '' } });

  let boxtalOrderId: string;
  try {
    const settings = await getShopSettings();
    ({ boxtalOrderId } = await createShippingOrder(claimed, {
      weightGrams: claimed.delivery.weightGrams,
      lengthCm: settings.parcelLengthCm,
      widthCm: settings.parcelWidthCm,
      heightCm: settings.parcelHeightCm,
    }));
  } catch (labelError) {
    await releaseClaim();
    console.error('Boxtal label error:', labelError);
    return NextResponse.json(
      {
        error: `Création de l’étiquette impossible : ${labelError instanceof Error ? labelError.message : 'erreur inconnue'}. Vous pouvez expédier le colis par un autre moyen puis utiliser « Marquer expédiée ».`,
      },
      { status: 502 }
    );
  }

  const set: Record<string, unknown> = { 'shipment.boxtalOrderId': boxtalOrderId };

  // Le suivi peut ne pas être prêt tout de suite : on ne bloque pas sur son absence.
  // (Le PDF n'est pas stocké : son lien Boxtal est signé et expire, voir GET ci-dessous.)
  try {
    const tracking = await getTracking(boxtalOrderId);
    if (tracking.trackingNumber) set['shipment.trackingNumber'] = tracking.trackingNumber;
    if (tracking.trackingUrl) set['shipment.trackingUrl'] = tracking.trackingUrl;
  } catch (trackingError) {
    console.error('Boxtal tracking error:', trackingError);
  }

  await OrderModel.updateOne({ _id: id }, { $set: set });

  // Une commande payée passe en préparation dès que l'étiquette existe.
  await transitionOrder(id, ['paid'], 'preparing', {
    note: 'Étiquette Boxtal créée',
    by: session.user.name || session.user.email || '',
  });

  const order = await OrderModel.findById(id).lean();
  return NextResponse.json({ order: order ? serializeOrder(order) : null });
}

/**
 * Ouvre le bordereau PDF. Le lien fourni par Boxtal est signé et expire au bout
 * d'environ un mois : on le redemande à chaque clic plutôt que de le stocker.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const { id } = await context.params;
  const invalidId = ensureValidObjectId(id);
  if (invalidId) {
    return invalidId;
  }

  await dbConnect();
  const order = await OrderModel.findById(id).select('shipment.boxtalOrderId').lean();
  const boxtalOrderId = order?.shipment?.boxtalOrderId;
  if (!boxtalOrderId || boxtalOrderId === 'pending') {
    return NextResponse.json({ error: 'Aucune étiquette pour cette commande.' }, { status: 404 });
  }

  try {
    const { labelUrl } = await getShipmentDocuments(boxtalOrderId);
    if (!labelUrl) {
      return NextResponse.json({ error: 'L’étiquette n’est pas encore prête chez Boxtal, réessayez dans un instant.' }, { status: 404 });
    }
    return NextResponse.redirect(labelUrl);
  } catch (labelError) {
    console.error('Boxtal document error:', labelError);
    return NextResponse.json({ error: 'Impossible de récupérer l’étiquette chez Boxtal.' }, { status: 502 });
  }
}

/** Rafraîchit le numéro et le lien de suivi depuis Boxtal (bouton « Actualiser »). */
export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const { id } = await context.params;
  const invalidId = ensureValidObjectId(id);
  if (invalidId) {
    return invalidId;
  }

  await dbConnect();
  const existing = await OrderModel.findById(id).select('shipment.boxtalOrderId').lean();
  const boxtalOrderId = existing?.shipment?.boxtalOrderId;
  if (!boxtalOrderId || boxtalOrderId === 'pending') {
    return NextResponse.json({ error: 'Aucune étiquette pour cette commande.' }, { status: 404 });
  }

  try {
    const tracking = await getTracking(boxtalOrderId);
    const set: Record<string, string> = {};
    if (tracking.trackingNumber) set['shipment.trackingNumber'] = tracking.trackingNumber;
    if (tracking.trackingUrl) set['shipment.trackingUrl'] = tracking.trackingUrl;
    if (Object.keys(set).length > 0) {
      await OrderModel.updateOne({ _id: id }, { $set: set });
    }
  } catch (trackingError) {
    console.error('Boxtal tracking error:', trackingError);
    return NextResponse.json({ error: 'Impossible de joindre Boxtal pour le moment.' }, { status: 502 });
  }

  const order = await OrderModel.findById(id).lean();
  return NextResponse.json({ order: order ? serializeOrder(order) : null });
}
