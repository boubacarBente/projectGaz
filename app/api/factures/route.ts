import { listSalesInvoices, createSalesInvoice } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const invoices = await listSalesInvoices(from, to);
    return NextResponse.json(invoices);
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
