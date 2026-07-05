import { NextResponse } from 'next/server';
import { rawAll, rawGet } from '@/db';

// GET /api/ventes/stats?period=day|week|month|total&customerName=X&status=Payée|Partiel|En attente&from=2026-01-01&to=2026-12-31
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'total';
    const customerName = searchParams.get('customerName');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (customerName) {
      conditions.push('si.customer_name LIKE ?');
      params.push(`%${customerName}%`);
    }
    if (status) {
      conditions.push('si.payment_status = ?');
      params.push(status);
    }
    if (from) {
      conditions.push('si.date >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('si.date <= ?');
      params.push(to);
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    // Total global
    const totalRow = await rawGet<{ total: number; paid: number; remaining: number; count: number; paidCount: number }>(
      'SELECT COALESCE(SUM(si.total_amount), 0) as total, ' +
      'COALESCE(SUM(si.amount_paid), 0) as paid, ' +
      'COALESCE(SUM(si.remaining_amount), 0) as remaining, ' +
      'COUNT(si.id) as count, ' +
      "SUM(CASE WHEN si.payment_status = 'Payée' THEN 1 ELSE 0 END) as paidCount " +
      'FROM sales_invoices si' + whereClause,
      params,
    );

    // Stats par statut
    const byStatus = await rawAll(
      "SELECT si.payment_status as status, COUNT(si.id) as count, COALESCE(SUM(si.total_amount), 0) as total " +
      'FROM sales_invoices si' + whereClause +
      ' GROUP BY si.payment_status ORDER BY total DESC',
      params,
    );

    // Stats par client (top customers)
    const byCustomer = await rawAll(
      'SELECT si.customer_name as name, COUNT(si.id) as count, ' +
      'COALESCE(SUM(si.total_amount), 0) as total, ' +
      'COALESCE(SUM(si.amount_paid), 0) as paid ' +
      'FROM sales_invoices si' + whereClause +
      ' GROUP BY si.customer_name ORDER BY total DESC LIMIT 10',
      params,
    );

    // Stats par période
    let periodSelect: string;
    switch (period) {
      case 'day':
        periodSelect = "si.date as label";
        break;
      case 'week':
        periodSelect = "strftime('%Y-W%W', si.date) as label";
        break;
      case 'month':
        periodSelect = "strftime('%Y-%m', si.date) as label";
        break;
      default:
        periodSelect = "strftime('%Y-%m', si.date) as label";
    }

    let byPeriod = null;
    if (period !== 'total' && period !== 'today') {
      byPeriod = await rawAll(
        'SELECT ' + periodSelect + ', ' +
        'COALESCE(SUM(si.total_amount), 0) as total, ' +
        'COALESCE(SUM(si.amount_paid), 0) as paid, ' +
        'COUNT(si.id) as count ' +
        'FROM sales_invoices si' + whereClause +
        ' GROUP BY label ORDER BY label ASC',
        params,
      );
    }

    // Dernières factures
    const recentInvoices = await rawAll(
      'SELECT si.id, si.invoice_number as invoiceNumber, si.customer_name as customerName, ' +
      'si.date, si.total_amount as totalAmount, si.amount_paid as amountPaid, ' +
      'si.remaining_amount as remainingAmount, si.payment_status as paymentStatus, ' +
      "COALESCE((SELECT SUM(quantity) FROM sales_invoice_items WHERE invoice_id = si.id), 0) as totalItems " +
      'FROM sales_invoices si' + whereClause +
      ' ORDER BY si.created_at DESC LIMIT 10',
      params,
    );

    // Moyenne par jour (pour les 30 derniers jours)
    const dailyAvg = await rawGet<{ avgPerDay: number }>(
      "SELECT COALESCE(AVG(daily_total), 0) as avgPerDay FROM (" +
      "SELECT si.date, SUM(si.total_amount) as daily_total " +
      "FROM sales_invoices si" + whereClause +
      " GROUP BY si.date) sub",
      params,
    );

    return NextResponse.json({
      total: totalRow ?? { total: 0, paid: 0, remaining: 0, count: 0, paidCount: 0 },
      byStatus,
      byCustomer,
      byPeriod: byPeriod as Array<{ label: string; total: number; paid: number; count: number }> | null,
      recentInvoices,
      dailyAvg: dailyAvg?.avgPerDay ?? 0,
      filters: {
        period,
        customerName: customerName || null,
        status: status || null,
        from,
        to,
      },
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des statistiques' }, { status: 500 });
  }
}
