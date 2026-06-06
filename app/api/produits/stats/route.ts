import { NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const [{ total, activeCount, averageSalePrice }] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        activeCount: sql<number>`SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)`,
        averageSalePrice: sql<number>`COALESCE(AVG(sale_price), 0)`,
      })
      .from(schema.products);

    return NextResponse.json({
      total: Number(total),
      activeCount: Number(activeCount),
      averageSalePrice: Math.round(Number(averageSalePrice)),
    });
  } catch (error) {
    console.error('Error fetching product stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
