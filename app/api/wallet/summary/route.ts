import { getWalletSummary } from '@/lib/operations';
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    if ((from && !isValidDateInput(from)) || (to && !isValidDateInput(to))) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }

    const summary = await getWalletSummary({ from, to });
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching wallet summary:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
