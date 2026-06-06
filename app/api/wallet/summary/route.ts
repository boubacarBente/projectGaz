import { getWalletSummary } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const summary = await getWalletSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching wallet summary:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
