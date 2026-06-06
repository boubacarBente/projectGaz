import { listWalletTransactions, createWalletTransaction } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const transactions = await listWalletTransactions();
    return NextResponse.json(transactions);
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
