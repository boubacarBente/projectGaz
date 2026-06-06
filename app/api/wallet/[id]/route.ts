import { getWalletTransaction, updateWalletTransaction, deleteWalletTransaction } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txId = parseInt(id, 10);

    if (isNaN(txId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const transaction = await getWalletTransaction(txId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching wallet transaction:', error);
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txId = parseInt(id, 10);

    if (isNaN(txId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const body = await request.json();
    const { amount, type, description } = body;

    if (amount != null && (typeof amount !== 'number' || amount <= 0)) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    if (type != null && !['income', 'expense'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide (income/expense)' }, { status: 400 });
    }

    const transaction = await updateWalletTransaction(txId, {
      ...(amount !== undefined && { amount }),
      ...(type !== undefined && { type }),
      ...(description !== undefined && { description }),
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error updating wallet transaction:', error);
    const message = error instanceof Error ? error.message : 'Failed to update transaction';
    const status = message === 'Transaction introuvable' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txId = parseInt(id, 10);

    if (isNaN(txId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    await deleteWalletTransaction(txId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wallet transaction:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete transaction';
    const status = message === 'Transaction introuvable' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
