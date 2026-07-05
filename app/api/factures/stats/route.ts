import { NextRequest, NextResponse } from 'next/server';
import { rawAll, rawGet } from '@/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const type = searchParams.get('type');
    const period = searchParams.get('period') || 'month';

    const conditions: string[] = [];
    const params: unknown[] = [];
    if (from) { conditions.push('date >= ?'); params.push(from); }
    if (to) { conditions.push('date <= ?'); params.push(to); }
    if (type === 'paid') conditions.push("payment_status = 'Payée'");
    else if (type === 'partial') conditions.push("payment_status = 'Partiel'");
    else if (type === 'pending') conditions.push("payment_status = 'En attente'");

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 1. Aggregates
    const total = await rawGet<{ total: number; paid: number; remaining: number; count: number; paidCount: number }>(`
      SELECT
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(amount_paid), 0) as paid,
        COALESCE(SUM(remaining_amount), 0) as remaining,
        COUNT(*) as count,
        SUM(CASE WHEN payment_status = 'Payée' THEN 1 ELSE 0 END) as paidCount
      FROM sales_invoices
      ${whereClause}
    `, params);

    // 2. By status
    const byStatus = await rawAll<{ status: string; count: number; total: number }>(`
      SELECT payment_status as status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales_invoices
      ${whereClause}
      GROUP BY payment_status
    `, params);

    // 3. By customer (top 10)
    const byCustomer = await rawAll<{ name: string; count: number; total: number; paid: number }>(`
      SELECT customer_name as name, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(amount_paid), 0) as paid
      FROM sales_invoices
      ${whereClause}
      GROUP BY customer_name
      ORDER BY total DESC
      LIMIT 10
    `, params);

    // 4. By period (group by month by default)
    const periodExpr = period === 'year' ? "strftime('%Y', date)" :
                       period === 'month' ? "strftime('%Y-%m', date)" :
                       period === 'week' ? "strftime('%Y-W%W', date)" :
                       "date";
    const byPeriod = await rawAll<{ label: string; total: number; paid: number; count: number }>(`
      SELECT ${periodExpr} as label, COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(amount_paid), 0) as paid, COUNT(*) as count
      FROM sales_invoices
      ${whereClause}
      GROUP BY label
      ORDER BY label ASC
    `, params);

    // 5. Recent invoices (last 10)
    const recentInvoices = await rawAll<{
      id: number; invoiceNumber: string; customerName: string; date: string;
      totalAmount: number; amountPaid: number; remainingAmount: number; paymentStatus: string;
    }>(`
      SELECT id, invoice_number as invoiceNumber, customer_name as customerName, date, total_amount as totalAmount, amount_paid as amountPaid, remaining_amount as remainingAmount, payment_status as paymentStatus
      FROM sales_invoices
      ${whereClause}
      ORDER BY date DESC
      LIMIT 10
    `, params);

    // 6. Daily average (last 30 days)
    const dailyAvgRow = await rawGet<{ avg: number }>(`
      SELECT COALESCE(AVG(day_total), 0) as avg
      FROM (
        SELECT date, SUM(total_amount) as day_total
        FROM sales_invoices
        WHERE date >= date('now', '-30 days')
        ${from || to ? 'AND ' + conditions.join(' AND ') : ''}
        GROUP BY date
      )
    `, params);

    return NextResponse.json({
      total: {
        total: Number(total?.total ?? 0),
        paid: Number(total?.paid ?? 0),
        remaining: Number(total?.remaining ?? 0),
        count: Number(total?.count ?? 0),
        paidCount: Number(total?.paidCount ?? 0),
      },
      byStatus,
      byCustomer,
      byPeriod,
      recentInvoices: recentInvoices.map(inv => ({
        ...inv,
        totalAmount: Number(inv.totalAmount),
        amountPaid: Number(inv.amountPaid),
        remainingAmount: Number(inv.remainingAmount),
      })),
      dailyAvg: Math.round(Number(dailyAvgRow?.avg ?? 0)),
    });
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
