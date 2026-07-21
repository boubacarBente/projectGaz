import { NextRequest, NextResponse } from 'next/server';
import { rawGet } from '@/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const paid = searchParams.get('paid');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const conditions: string[] = [];
    const params: Array<string | number> = [];
    if (supplierId) { conditions.push('pi.supplier_id = ?'); params.push(Number(supplierId)); }
    if (paid === 'true') { conditions.push('pi.is_paid = 1'); }
    if (paid === 'false') { conditions.push('pi.is_paid = 0'); }
    if (from) { conditions.push('pi.date >= ?'); params.push(from); }
    if (to) { conditions.push('pi.date <= ?'); params.push(to); }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // On sépare les agrégations pour éviter le double-comptage de pi.total_amount
    // causé par le LEFT JOIN avec purchase_invoice_items (1 facture → N items → N lignes)
    const totalRow = await rawGet<{ totalAmount: number }>(`
      SELECT COALESCE(SUM(total_amount), 0) as totalAmount
      FROM purchase_invoices pi
      ${whereClause}
    `, params);

    const statsRow = await rawGet<{ totalBottles: number; count: number }>(`
      SELECT
        COALESCE(SUM(pii.quantity), 0) as totalBottles,
        COUNT(DISTINCT pi.id) as count
      FROM purchase_invoices pi
      LEFT JOIN purchase_invoice_items pii ON pii.invoice_id = pi.id
      ${whereClause}
    `, params);

    const totalAmountNum = Number(totalRow?.totalAmount ?? 0);
    const totalBottlesNum = Number(statsRow?.totalBottles ?? 0);
    const countNum = Number(statsRow?.count ?? 0);

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
