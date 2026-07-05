import { NextResponse } from 'next/server';
import { rawAll, rawGet } from '@/db';

// GET /api/fournisseurs/stats?period=day|week|month&supplierId=1&from=2026-01-01&to=2026-12-31
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'total';
    const supplierId = searchParams.get('supplierId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Build WHERE clause
    const conditions: string[] = [];
    const params: unknown[] = [];
    const supplierConditions: string[] = [];
    const supplierParams: unknown[] = [];

    if (supplierId) {
      conditions.push('pi.supplier_id = ?');
      supplierConditions.push('pi.supplier_id = ?');
      params.push(Number(supplierId));
      supplierParams.push(Number(supplierId));
    }
    if (from) {
      conditions.push('pi.date >= ?');
      supplierConditions.push('pi.date >= ?');
      params.push(from);
      supplierParams.push(from);
    }
    if (to) {
      conditions.push('pi.date <= ?');
      supplierConditions.push('pi.date <= ?');
      params.push(to);
      supplierParams.push(to);
    }

    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    const supplierWhereClause = supplierConditions.length > 0 ? ' AND ' + supplierConditions.join(' AND ') : '';

    // Total global
    const totalRow = await rawGet<{ total: number; count: number }>(
      'SELECT COALESCE(SUM(pi.total_amount), 0) as total, COUNT(pi.id) as count FROM purchase_invoices pi' +
      whereClause,
      params,
    );

    // Stats par fournisseur
    const bySupplier = await rawAll(
      'SELECT s.id, s.name, COALESCE(SUM(pi.total_amount), 0) as total, COUNT(pi.id) as count ' +
      'FROM suppliers s LEFT JOIN purchase_invoices pi ON pi.supplier_id = s.id' +
      supplierWhereClause +
      ' GROUP BY s.id, s.name ORDER BY total DESC',
      supplierParams,
    );

    // Stats par période
    let periodSelect: string;
    switch (period) {
      case 'day':
        periodSelect = "pi.date as label";
        break;
      case 'week':
        periodSelect = "strftime('%Y-W%W', pi.date) as label";
        break;
      case 'month':
        periodSelect = "strftime('%Y-%m', pi.date) as label";
        break;
      default:
        periodSelect = "strftime('%Y-%m', pi.date) as label";
    }

    let byPeriod = null;
    if (period !== 'total' && period !== 'today') {
      byPeriod = await rawAll(
        'SELECT ' + periodSelect + ', COALESCE(SUM(pi.total_amount), 0) as total, COUNT(pi.id) as count ' +
        'FROM purchase_invoices pi' + whereClause +
        ' GROUP BY label ORDER BY label ASC',
        params,
      );
    }

    // Dernières factures
    const recentInvoices = await rawAll(
      'SELECT pi.id, pi.reference, pi.date, pi.total_amount as totalAmount, pi.is_paid as isPaid, ' +
      "s.name as supplierName, COALESCE((SELECT SUM(quantity) FROM purchase_invoice_items WHERE invoice_id = pi.id), 0) as totalItems " +
      'FROM purchase_invoices pi JOIN suppliers s ON s.id = pi.supplier_id' +
      whereClause +
      ' ORDER BY pi.created_at DESC LIMIT 10',
      params,
    );

    // Active suppliers count (global, not filtered)
    const activeRow = await rawGet<{ count: number }>('SELECT COUNT(*) as count FROM suppliers WHERE is_active = 1');

    return NextResponse.json({
      total: totalRow ?? { total: 0, count: 0 },
      bySupplier,
      byPeriod,
      recentInvoices,
      activeCount: Number(activeRow?.count ?? 0),
      filters: { period, supplierId: supplierId ? Number(supplierId) : null, from, to },
    });
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement des statistiques' }, { status: 500 });
  }
}
