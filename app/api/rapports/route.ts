import { getRapportData } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const data = await getRapportData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching rapport data:', error);
    return NextResponse.json({ error: 'Failed to fetch rapport data' }, { status: 500 });
  }
}