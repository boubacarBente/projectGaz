import { listPaginatedSalesInvoices, createSalesInvoice } from '@/lib/operations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
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

    if (!customerName || !date || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const invoice = await createSalesInvoice({
      customerId: customerId || undefined,
      customerName,
      date,
      paymentMethod: paymentMethod || 'Espèces',
      notes: notes || '',
      amountPaid: amountPaid || 0,
      lines,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating sales invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
