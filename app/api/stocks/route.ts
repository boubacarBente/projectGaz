import { NextRequest, NextResponse } from 'next/server';
import { listStockProducts } from '@/lib/stock';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const data = await listStockProducts({ search, lowStockOnly });
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching stocks:', error);
    return NextResponse.json({ error: 'Failed to fetch stocks' }, { status: 500 });
  }
}
