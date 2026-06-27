import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { listPurchaseInvoices } from '@/lib/operations';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplierId = parseInt(id, 10);

    if (isNaN(supplierId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const [supplier] = await db.select()
      .from(schema.suppliers)
      .where(eq(schema.suppliers.id, supplierId))
      .limit(1);

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    // Récupérer les factures d'achat de ce fournisseur, filtrées par période
    const allInvoices = await listPurchaseInvoices(from, to);
    const invoices = allInvoices.filter((inv: (typeof allInvoices)[number]) => inv.supplierId === supplierId);

    const invoicesWithItems = invoices.map((inv: (typeof invoices)[number]) => ({
      id: inv.id,
      reference: inv.reference,
      supplier: inv.supplierName,
      date: inv.date,
      notes: inv.notes || '',
      items: inv.items.map(item => ({
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
      })),
      totalAmount: inv.totalAmount ?? 0,
      isPaid: inv.isPaid ?? false,
      createdAt: inv.createdAt,
    }));

    // Group by period
    const byDay: Record<string, { count: number; total: number; totalItems: number }> = {};
    const byWeek: Record<string, { count: number; total: number; totalItems: number }> = {};
    const byMonth: Record<string, { count: number; total: number; totalItems: number }> = {};
    const byYear: Record<string, { count: number; total: number; totalItems: number }> = {};

    for (const inv of invoicesWithItems) {
      const dateObj = new Date(inv.date);
      const dayKey = inv.date;
      const weekStart = new Date(dateObj);
      weekStart.setDate(dateObj.getDate() - dateObj.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      const monthKey = inv.date.slice(0, 7);
      const yearKey = inv.date.slice(0, 4);
      const invItems = inv.items.reduce((si, item) => si + item.quantity, 0);

      if (!byDay[dayKey]) byDay[dayKey] = { count: 0, total: 0, totalItems: 0 };
      byDay[dayKey].count++;
      byDay[dayKey].total += inv.totalAmount;
      byDay[dayKey].totalItems += invItems;

      if (!byWeek[weekKey]) byWeek[weekKey] = { count: 0, total: 0, totalItems: 0 };
      byWeek[weekKey].count++;
      byWeek[weekKey].total += inv.totalAmount;
      byWeek[weekKey].totalItems += invItems;

      if (!byMonth[monthKey]) byMonth[monthKey] = { count: 0, total: 0, totalItems: 0 };
      byMonth[monthKey].count++;
      byMonth[monthKey].total += inv.totalAmount;
      byMonth[monthKey].totalItems += invItems;

      if (!byYear[yearKey]) byYear[yearKey] = { count: 0, total: 0, totalItems: 0 };
      byYear[yearKey].count++;
      byYear[yearKey].total += inv.totalAmount;
      byYear[yearKey].totalItems += invItems;
    }

    const aggregate = {
      totalInvoices: invoicesWithItems.length,
      totalAmount: invoicesWithItems.reduce((s, i) => s + i.totalAmount, 0),
      totalItems: invoicesWithItems.reduce((s, i) => s + i.items.reduce((si, item) => si + item.quantity, 0), 0),
    };

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        phone: supplier.phone,
        address: supplier.address,
        totalPurchases: supplier.totalPurchases,
      },
      invoices: invoicesWithItems,
      aggregates: {
        all: aggregate,
        byDay: Object.entries(byDay)
          .map(([period, data]) => ({ period, ...data }))
          .sort((a, b) => b.period.localeCompare(a.period)),
        byWeek: Object.entries(byWeek)
          .map(([period, data]) => ({ period, ...data }))
          .sort((a, b) => b.period.localeCompare(a.period)),
        byMonth: Object.entries(byMonth)
          .map(([period, data]) => ({ period, ...data }))
          .sort((a, b) => b.period.localeCompare(a.period)),
        byYear: Object.entries(byYear)
          .map(([period, data]) => ({ period, ...data }))
          .sort((a, b) => b.period.localeCompare(a.period)),
      },
    });
  } catch (error) {
    console.error('Error fetching supplier payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
