import { getOperationsSnapshot } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const snapshot = await getOperationsSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('Error fetching operations snapshot:', error);
    // Return empty data if there's an error
    return NextResponse.json({
      purchases: [],
      sales: [],
      totalPurchases: 0,
      totalSales: 0,
      grossProfit: 0,
      soldByProduct: [],
    });
  }
}