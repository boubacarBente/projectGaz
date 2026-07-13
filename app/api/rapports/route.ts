import { getRapportData } from '@/lib/operations';
import type { RapportPaymentStatus } from '@/lib/rapports-types';
import { NextRequest, NextResponse } from 'next/server';

function parseOptionalNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePaymentStatus(value: string | null): RapportPaymentStatus | undefined {
  if (value === 'paid' || value === 'partial' || value === 'pending' || value === 'unpaid') {
    return value;
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const data = await getRapportData({
      from,
      to,
      previousFrom: searchParams.get('previousFrom') || undefined,
      previousTo: searchParams.get('previousTo') || undefined,
      productId: parseOptionalNumber(searchParams.get('productId')),
      customerId: parseOptionalNumber(searchParams.get('customerId')),
      supplierId: parseOptionalNumber(searchParams.get('supplierId')),
      paymentStatus: parsePaymentStatus(searchParams.get('paymentStatus')),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching rapport data:', error);
    return NextResponse.json({ error: 'Failed to fetch rapport data' }, { status: 500 });
  }
}
