import { listWalletTransactions, createWalletTransaction } from '@/lib/operations';
import { NextRequest, NextResponse } from 'next/server';

function isValidDateInput(date: unknown): date is string {
  if (typeof date !== 'string') return false;
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

function parseOptionalPurchaseInvoiceId(value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100000, Math.max(1, parseInt(searchParams.get('limit') ?? '15', 10)));
    const search = searchParams.get('search') || undefined;
    const type = searchParams.get('type') as 'income' | 'expense' | undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    if ((from && !isValidDateInput(from)) || (to && !isValidDateInput(to))) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }

    const result = await listWalletTransactions({ page, limit, search, type, from, to });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, type, description, date } = body;
    const purchaseInvoiceId = parseOptionalPurchaseInvoiceId(body.purchaseInvoiceId);

    if (amount == null || !type || !['income', 'expense'].includes(type)) {
      return NextResponse.json({ error: 'Montant et type requis (income/expense)' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    if (date !== undefined && !isValidDateInput(date)) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }

    if (purchaseInvoiceId === undefined) {
      return NextResponse.json({ error: "Facture d'usine liée invalide" }, { status: 400 });
    }

    const transaction = await createWalletTransaction({
      amount,
      type,
      description: description || '',
      purchaseInvoiceId,
      ...(date !== undefined && { date }),
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating wallet transaction:', error);
    const message = error instanceof Error ? error.message : 'Failed to create transaction';
    const status = message.includes("facture d'usine liée") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
