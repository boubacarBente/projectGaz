import { listSalesInvoices, createSalesInvoice } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const invoices = await listSalesInvoices();
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching sales invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, date, paymentMethod, notes, amountPaid, lines } = body;

    if (!customerName || !date || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const invoice = await createSalesInvoice({
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