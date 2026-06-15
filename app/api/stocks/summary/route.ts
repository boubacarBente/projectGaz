import { NextResponse } from 'next/server';
import { getStockSummary } from '@/lib/stock';

export async function GET() {
  try {
    const summary = await getStockSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    return NextResponse.json({
      totalProducts: 0,
      totalStock: 0,
      totalStockValue: 0,
      totalSaleValue: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    });
  }
}
