import { listPurchaseInvoices, createPurchaseInvoice } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const invoices = await listPurchaseInvoices();
    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching purchase invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, supplier, date, notes, lines } = body;

    if (!reference || !supplier || !date || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const invoice = await createPurchaseInvoice({
      reference,
      supplier,
      date,
      notes: notes || '',
      lines,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}