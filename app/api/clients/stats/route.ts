import { NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const [{ total, activeCount, totalPurchases }] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        activeCount: sql<number>`SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)`,
        totalPurchases: sql<number>`COALESCE(SUM(total_purchases), 0)`,
      })
      .from(schema.customers);

    const topCustomers = await db
      .select({ id: schema.customers.id, name: schema.customers.name, totalPurchases: schema.customers.totalPurchases })
      .from(schema.customers)
      .orderBy(sql`total_purchases DESC`)
      .limit(5);

    return NextResponse.json({
      total: Number(total),
      activeCount: Number(activeCount),
      totalPurchases: Number(totalPurchases),
      topCustomers,
    });
  } catch (error) {
    console.error('Error fetching customer stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
