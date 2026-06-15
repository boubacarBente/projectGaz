import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const paid = searchParams.get('paid');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (supplierId) { conditions.push('pi.supplier_id = ?'); params.push(Number(supplierId)); }
    if (paid === 'true') { conditions.push('pi.is_paid = 1'); }
    if (paid === 'false') { conditions.push('pi.is_paid = 0'); }
    if (from) { conditions.push('pi.date >= ?'); params.push(from); }
    if (to) { conditions.push('pi.date <= ?'); params.push(to); }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const rawDb: import('better-sqlite3').Database = (db as any).$client;

    // On sépare les agrégations pour éviter le double-comptage de pi.total_amount
    // causé par le LEFT JOIN avec purchase_invoice_items (1 facture → N items → N lignes)
    const totalRow = rawDb.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as totalAmount
      FROM purchase_invoices pi
      ${whereClause}
    `).get(...params) as { totalAmount: number };

    const statsRow = rawDb.prepare(`
      SELECT
        COALESCE(SUM(pii.quantity), 0) as totalBottles,
        COUNT(DISTINCT pi.id) as count
      FROM purchase_invoices pi
      LEFT JOIN purchase_invoice_items pii ON pii.invoice_id = pi.id
      ${whereClause}
    `).get(...params) as { totalBottles: number; count: number };

    const totalAmountNum = Number(totalRow.totalAmount);
    const totalBottlesNum = Number(statsRow.totalBottles);
    const countNum = Number(statsRow.count);

    return NextResponse.json({
      totalAmount: totalAmountNum,
      totalBottles: totalBottlesNum,
      averageCost: countNum > 0 ? Math.round(totalAmountNum / countNum) : 0,
    });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
