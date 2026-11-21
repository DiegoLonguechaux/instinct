import dbConnect from '@/lib/db';
import { requireSession } from '@/lib/api-route-helpers';
import { round2 } from '@/lib/merch';
import SaleModel from '@/models/Sale';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

function parseDate(value: string | null, endOfDay: boolean) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Jour calendaire en heure de Paris (format YYYY-MM-DD) pour grouper les ventes.
function parisDay(date: Date) {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
}

export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) {
    return error;
  }

  const params = new URL(request.url).searchParams;
  const from = parseDate(params.get('from'), false);
  const to = parseDate(params.get('to'), true);
  const concertId = params.get('concertId');

  const filter: Record<string, unknown> = { status: 'completed' };
  if (from || to) {
    filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };
  }
  if (concertId && mongoose.Types.ObjectId.isValid(concertId)) {
    filter.concert = concertId;
  }

  await dbConnect();
  const sales = await SaleModel.find(filter).sort({ createdAt: 1 }).lean();

  const totals = { sales: sales.length, items: 0, gross: 0, fees: 0, net: 0, cost: 0, profit: 0, avgBasket: 0 };
  const byProduct = new Map<
    string,
    { title: string; quantity: number; revenue: number; profit: number; sizes: Record<string, number> }
  >();
  const bySize = new Map<string, number>();
  const byPayment = new Map<string, { sales: number; gross: number; fees: number }>();
  const byDay = new Map<string, { gross: number; quantity: number }>();
  const byConcert = new Map<string, { gross: number; quantity: number; sales: number }>();

  for (const sale of sales) {
    const quantity = sale.items.reduce((sum, item) => sum + item.quantity, 0);
    const cost = sale.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

    totals.items += quantity;
    totals.gross += sale.total;
    totals.fees += sale.fee;
    totals.cost += cost;

    for (const item of sale.items) {
      const key = String(item.merch);
      const revenue = item.quantity * item.unitPrice;
      const entry = byProduct.get(key) ?? { title: item.title, quantity: 0, revenue: 0, profit: 0, sizes: {} };
      entry.title = item.title;
      entry.quantity += item.quantity;
      entry.revenue += revenue;
      // Commission répartie au prorata de la ligne dans la vente.
      const feeShare = sale.total > 0 ? sale.fee * (revenue / sale.total) : 0;
      entry.profit += revenue - feeShare - item.quantity * item.unitCost;
      if (item.size) {
        entry.sizes[item.size] = (entry.sizes[item.size] ?? 0) + item.quantity;
        bySize.set(item.size, (bySize.get(item.size) ?? 0) + item.quantity);
      }
      byProduct.set(key, entry);
    }

    const payment = byPayment.get(sale.paymentMethod) ?? { sales: 0, gross: 0, fees: 0 };
    payment.sales += 1;
    payment.gross += sale.total;
    payment.fees += sale.fee;
    byPayment.set(sale.paymentMethod, payment);

    const day = parisDay(sale.createdAt);
    const dayEntry = byDay.get(day) ?? { gross: 0, quantity: 0 };
    dayEntry.gross += sale.total;
    dayEntry.quantity += quantity;
    byDay.set(day, dayEntry);

    const concertKey = sale.concertLabel || 'Hors concert';
    const concertEntry = byConcert.get(concertKey) ?? { gross: 0, quantity: 0, sales: 0 };
    concertEntry.gross += sale.total;
    concertEntry.quantity += quantity;
    concertEntry.sales += 1;
    byConcert.set(concertKey, concertEntry);
  }

  totals.net = totals.gross - totals.fees;
  totals.profit = totals.net - totals.cost;
  totals.avgBasket = totals.sales > 0 ? totals.gross / totals.sales : 0;

  return NextResponse.json({
    totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, round2(value)])),
    byProduct: [...byProduct.values()]
      .map((entry) => ({ ...entry, revenue: round2(entry.revenue), profit: round2(entry.profit) }))
      .sort((a, b) => b.quantity - a.quantity),
    bySize: [...bySize.entries()].map(([size, quantity]) => ({ size, quantity })).sort((a, b) => b.quantity - a.quantity),
    byPayment: [...byPayment.entries()].map(([method, entry]) => ({
      method,
      sales: entry.sales,
      gross: round2(entry.gross),
      fees: round2(entry.fees),
    })),
    byDay: [...byDay.entries()].map(([date, entry]) => ({ date, gross: round2(entry.gross), quantity: entry.quantity })),
    byConcert: [...byConcert.entries()]
      .map(([label, entry]) => ({ label, ...entry, gross: round2(entry.gross) }))
      .sort((a, b) => b.gross - a.gross),
  });
}
