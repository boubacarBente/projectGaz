import { getRapportData } from '@/lib/operations';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const data = await getRapportData(from, to);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching rapport data:', error);
    return NextResponse.json({ error: 'Failed to fetch rapport data' }, { status: 500 });
  }
}