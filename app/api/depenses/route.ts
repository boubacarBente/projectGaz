import { listPaginatedPurchaseInvoices, createPurchaseInvoice } from '@/lib/operations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
    const search = searchParams.get('search') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const paid = searchParams.get('paid');
    const supplierId = searchParams.get('supplierId') || undefined;
    const result = await listPaginatedPurchaseInvoices(page, limit, {
      from, to, search,
      isPaid: paid === 'true' ? true : paid === 'false' ? false : undefined,
      supplierId: supplierId ? parseInt(supplierId) : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching purchase invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reference, supplierId, date, notes, lines, isPaid } = body;

    if (!reference || !supplierId || !date || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const invoice = await createPurchaseInvoice({
      reference,
      supplierId,
      date,
      notes: notes || '',
      lines,
      isPaid: isPaid ?? false,
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}