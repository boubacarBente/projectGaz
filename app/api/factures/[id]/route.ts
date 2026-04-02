import { getSalesInvoice, updateSalesInvoice, deleteSalesInvoice } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id, 10);
    
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const invoice = await getSalesInvoice(invoiceId);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching sales invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id, 10);
    
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const { customerName, date, paymentMethod, notes, amountPaid, lines } = body;

    const invoice = await updateSalesInvoice(invoiceId, {
      ...(customerName && { customerName }),
      ...(date && { date }),
      ...(paymentMethod && { paymentMethod }),
      ...(notes !== undefined && { notes }),
      ...(amountPaid !== undefined && { amountPaid }),
      ...(lines && { lines }),
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating sales invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = parseInt(id, 10);
    
    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await deleteSalesInvoice(invoiceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sales invoice:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}