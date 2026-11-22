import { requireSession } from '@/lib/api-route-helpers';
import dbConnect from '@/lib/db';
import { releaseExpiredOrders } from '@/lib/orders';
import OrderModel, { ORDER_STATUSES, type IOrder } from '@/models/Order';
import { NextResponse } from 'next/server';

export function serializeOrder(order: IOrder | (Omit<IOrder, keyof import('mongoose').Document> & { _id: { toString: () => string } })) {
  return {
    id: order._id.toString(),
    number: order.number,
    status: order.status,
    statusHistory: order.statusHistory.map((entry) => ({
      status: entry.status,
      at: entry.at.toISOString(),
      note: entry.note,
      by: entry.by,
    })),
    items: order.items.map((item) => ({
      merchId: String(item.merch),
      title: item.title,
      size: item.size,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
    customer: order.customer,
    delivery: {
      mode: order.delivery.mode,
      label: order.delivery.label,
      offerCode: order.delivery.offerCode,
      relayPoint: order.delivery.relayPoint ?? null,
      address: order.delivery.address ?? null,
      weightGrams: order.delivery.weightGrams,
    },
    payment: {
      stripePaymentIntentId: order.payment.stripePaymentIntentId,
      stripeFee: order.payment.stripeFee,
      paidAt: order.payment.paidAt ? order.payment.paidAt.toISOString() : null,
      refundedAt: order.payment.refundedAt ? order.payment.refundedAt.toISOString() : null,
    },
    legal: {
      termsAccepted: order.legal?.termsAccepted ?? null,
      termsAcceptedAt: order.legal?.termsAcceptedAt ? order.legal.termsAcceptedAt.toISOString() : null,
      cgvVersion: order.legal?.cgvVersion ?? null,
    },
    shipment: {
      boxtalOrderId: order.shipment.boxtalOrderId,
      trackingNumber: order.shipment.trackingNumber,
      trackingUrl: order.shipment.trackingUrl,
      labelUrl: order.shipment.labelUrl,
      shippedAt: order.shipment.shippedAt ? order.shipment.shippedAt.toISOString() : null,
      deliveredAt: order.shipment.deliveredAt ? order.shipment.deliveredAt.toISOString() : null,
    },
    internalNote: order.internalNote,
    createdAt: order.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  await dbConnect();
  await releaseExpiredOrders();

  const params = new URL(request.url).searchParams;

  // Compteur pour la pastille de la barre latérale.
  if (params.get('summary') === '1') {
    return NextResponse.json({ toPrepare: await OrderModel.countDocuments({ status: 'paid' }) });
  }

  const filter: Record<string, unknown> = {};
  const status = params.get('status');
  if (status && (ORDER_STATUSES as readonly string[]).includes(status)) {
    filter.status = status;
  } else {
    // Par défaut on masque les paiements jamais aboutis (bruit : paniers abandonnés).
    filter.status = { $nin: ['pending_payment', 'expired'] };
  }

  const q = (params.get('q') ?? '').trim().slice(0, 80);
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { number: pattern },
      { 'customer.email': pattern },
      { 'customer.lastName': pattern },
      { 'customer.firstName': pattern },
    ];
  }

  const orders = await OrderModel.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  return NextResponse.json(orders.map((order) => serializeOrder(order)));
}
