import { listWalletTransactions, createWalletTransaction } from '@/lib/operations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100000, Math.max(1, parseInt(searchParams.get('limit') ?? '15', 10)));
    const search = searchParams.get('search') || undefined;
    const type = searchParams.get('type') as 'income' | 'expense' | undefined;
    const result = await listWalletTransactions({ page, limit, search, type });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, type, description } = body;

    if (amount == null || !type || !['income', 'expense'].includes(type)) {
      return NextResponse.json({ error: 'Montant et type requis (income/expense)' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    const transaction = await createWalletTransaction({
      amount,
      type,
      description: description || '',
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating wallet transaction:', error);
    const message = error instanceof Error ? error.message : 'Failed to create transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
