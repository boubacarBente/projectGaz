import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { listPurchaseInvoices, calculateSalesProfitMetrics } from '@/lib/operations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const [customer] = await db.select()
      .from(schema.customers)
      .where(eq(schema.customers.id, customerId))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch all sales invoices for this customer
    const invoices = await db.select()
      .from(schema.salesInvoices)
      .where(eq(schema.salesInvoices.customerId, customerId))
      .orderBy(desc(schema.salesInvoices.date));

    // Get invoice items for each invoice
    const invoicesWithItems = await Promise.all(
      invoices.map(async (inv) => {
        const items = await db.select()
          .from(schema.salesInvoiceItems)
          .where(eq(schema.salesInvoiceItems.invoiceId, inv.id));

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerId: inv.customerId,
          customerName: inv.customerName,
          date: inv.date,
          paymentMethod: inv.paymentMethod || 'Espèces',
          notes: inv.notes || '',
          items: items.map(item => ({
            productId: item.productId,
            productCode: item.productCode,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
          totalAmount: inv.totalAmount ?? 0,
          amountPaid: inv.amountPaid ?? 0,
          remainingAmount: inv.remainingAmount ?? 0,
          paymentStatus: (inv.paymentStatus || 'En attente') as 'Paye' | 'Partiel' | 'En attente',
          createdAt: inv.createdAt?.toISOString() || '',
        };
      })
    );

    // Calculate profit metrics for these invoices
    const purchases = await listPurchaseInvoices();
    const { salesWithProfit } = calculateSalesProfitMetrics(purchases, invoicesWithItems);

    // Group by period
    const byDay: Record<string, { count: number; total: number; paid: number; profit: number }> = {};
    const byWeek: Record<string, { count: number; total: number; paid: number; profit: number }> = {};
    const byMonth: Record<string, { count: number; total: number; paid: number; profit: number }> = {};
    const byYear: Record<string, { count: number; total: number; paid: number; profit: number }> = {};

    for (const inv of salesWithProfit) {
      const dateObj = new Date(inv.date);
      const dayKey = inv.date;
      const weekStart = new Date(dateObj);
      weekStart.setDate(dateObj.getDate() - dateObj.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      const monthKey = inv.date.slice(0, 7);
      const yearKey = inv.date.slice(0, 4);
      const profit = inv.grossProfit ?? 0;

      if (!byDay[dayKey]) byDay[dayKey] = { count: 0, total: 0, paid: 0, profit: 0 };
      byDay[dayKey].count++;
      byDay[dayKey].total += inv.totalAmount;
      byDay[dayKey].paid += inv.amountPaid;
      byDay[dayKey].profit += profit;

      if (!byWeek[weekKey]) byWeek[weekKey] = { count: 0, total: 0, paid: 0, profit: 0 };
      byWeek[weekKey].count++;
      byWeek[weekKey].total += inv.totalAmount;
      byWeek[weekKey].paid += inv.amountPaid;
      byWeek[weekKey].profit += profit;

      if (!byMonth[monthKey]) byMonth[monthKey] = { count: 0, total: 0, paid: 0, profit: 0 };
      byMonth[monthKey].count++;
      byMonth[monthKey].total += inv.totalAmount;
      byMonth[monthKey].paid += inv.amountPaid;
      byMonth[monthKey].profit += profit;

      if (!byYear[yearKey]) byYear[yearKey] = { count: 0, total: 0, paid: 0, profit: 0 };
      byYear[yearKey].count++;
      byYear[yearKey].total += inv.totalAmount;
      byYear[yearKey].paid += inv.amountPaid;
      byYear[yearKey].profit += profit;
    }

    const aggregate = {
      totalInvoices: invoicesWithItems.length,
      totalAmount: invoicesWithItems.reduce((s, i) => s + i.totalAmount, 0),
      totalPaid: invoicesWithItems.reduce((s, i) => s + i.amountPaid, 0),
      totalRemaining: invoicesWithItems.reduce((s, i) => s + i.remainingAmount, 0),
      totalProfit: salesWithProfit.reduce((s, i) => s + (i.grossProfit ?? 0), 0),
      totalItems: invoicesWithItems.reduce((s, i) => s + i.items.reduce((si, item) => si + item.quantity, 0), 0),
    };

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        city: customer.city,
        totalPurchases: customer.totalPurchases,
      },
      invoices: salesWithProfit,
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
    console.error('Error fetching customer payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
