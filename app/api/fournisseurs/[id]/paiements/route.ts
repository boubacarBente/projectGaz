import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq, desc } from 'drizzle-orm';

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

    // Fetch all purchase invoices for this supplier
    // Jointure avec suppliers pour récupérer le nom à jour
    const invoices = await db
      .select({
        id: schema.purchaseInvoices.id,
        reference: schema.purchaseInvoices.reference,
        supplierName: schema.suppliers.name,
        date: schema.purchaseInvoices.date,
        notes: schema.purchaseInvoices.notes,
        totalAmount: schema.purchaseInvoices.totalAmount,
        isPaid: schema.purchaseInvoices.isPaid,
        createdAt: schema.purchaseInvoices.createdAt,
      })
      .from(schema.purchaseInvoices)
      .leftJoin(schema.suppliers, eq(schema.purchaseInvoices.supplierId, schema.suppliers.id))
      .where(eq(schema.purchaseInvoices.supplierId, supplierId))
      .orderBy(desc(schema.purchaseInvoices.date));

    // Get invoice items for each invoice
    const invoicesWithItems = await Promise.all(
      invoices.map(async (inv) => {
        const items = await db.select()
          .from(schema.purchaseInvoiceItems)
          .where(eq(schema.purchaseInvoiceItems.invoiceId, inv.id));

        return {
          id: inv.id,
          reference: inv.reference,
          supplier: inv.supplierName ?? '',
          date: inv.date,
          notes: inv.notes || '',
          items: items.map(item => ({
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
          })),
          totalAmount: inv.totalAmount ?? 0,
          isPaid: inv.isPaid ?? false,
          createdAt: inv.createdAt?.toISOString() || '',
        };
      })
    );

    // Group by period
    const byDay: Record<string, { count: number; total: number }> = {};
    const byWeek: Record<string, { count: number; total: number }> = {};
    const byMonth: Record<string, { count: number; total: number }> = {};
    const byYear: Record<string, { count: number; total: number }> = {};

    for (const inv of invoicesWithItems) {
      const dateObj = new Date(inv.date);
      const dayKey = inv.date;
      const weekStart = new Date(dateObj);
      weekStart.setDate(dateObj.getDate() - dateObj.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      const monthKey = inv.date.slice(0, 7);
      const yearKey = inv.date.slice(0, 4);

      if (!byDay[dayKey]) byDay[dayKey] = { count: 0, total: 0 };
      byDay[dayKey].count++;
      byDay[dayKey].total += inv.totalAmount;

      if (!byWeek[weekKey]) byWeek[weekKey] = { count: 0, total: 0 };
      byWeek[weekKey].count++;
      byWeek[weekKey].total += inv.totalAmount;

      if (!byMonth[monthKey]) byMonth[monthKey] = { count: 0, total: 0 };
      byMonth[monthKey].count++;
      byMonth[monthKey].total += inv.totalAmount;

      if (!byYear[yearKey]) byYear[yearKey] = { count: 0, total: 0 };
      byYear[yearKey].count++;
      byYear[yearKey].total += inv.totalAmount;
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
