import { getPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice } from '@/lib/operations';
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

    const invoice = await getPurchaseInvoice(invoiceId);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching purchase invoice:', error);
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
    const { reference, supplier, date, notes, lines } = body;

    const invoice = await updatePurchaseInvoice(invoiceId, {
      ...(reference && { reference }),
      ...(supplier && { supplier }),
      ...(date && { date }),
      ...(notes !== undefined && { notes }),
      ...(lines && { lines }),
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating purchase invoice:', error);
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

    await deletePurchaseInvoice(invoiceId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting purchase invoice:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}