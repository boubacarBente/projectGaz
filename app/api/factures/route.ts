import { listPaginatedSalesInvoices, createSalesInvoice } from '@/lib/operations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100000, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
    const search = searchParams.get('search') || undefined;
    const type = searchParams.get('type') as 'paid' | 'partial' | 'pending' | undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const result = await listPaginatedSalesInvoices(page, limit, { from, to, search, type });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching sales invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, customerName, date, paymentMethod, notes, amountPaid, lines } = body;
    const purchaseInvoiceId = body.purchaseInvoiceId == null || body.purchaseInvoiceId === ''
      ? null
      : Number(body.purchaseInvoiceId);

    if (
      !customerName ||
      !date ||
      !lines ||
      !Array.isArray(lines) ||
      lines.length === 0 ||
      (purchaseInvoiceId !== null && (!Number.isInteger(purchaseInvoiceId) || purchaseInvoiceId <= 0))
    ) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const invoice = await createSalesInvoice({
      customerId: customerId || undefined,
      purchaseInvoiceId,
      customerName,
      date,
      paymentMethod: paymentMethod || 'Espèces',
      notes: notes || '',
      amountPaid: amountPaid || 0,
      lines,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error('Error creating sales invoice:', error);
    const message = error instanceof Error ? error.message : 'Failed to create invoice';
    const status = message.includes('Stock insuffisant') || message.includes("facture d'usine liée") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
