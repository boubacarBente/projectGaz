import { NextRequest, NextResponse } from 'next/server';
import { listStockMovements } from '@/lib/stock';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const productId = searchParams.get('productId') ? parseInt(searchParams.get('productId')!, 10) : undefined;

    const result = await listStockMovements({ productId, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json({ error: 'Failed to fetch stock movements' }, { status: 500 });
  }
}
