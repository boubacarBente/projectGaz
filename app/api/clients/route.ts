import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { and, or, like, eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const typeId = searchParams.get('typeId');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100000, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          like(schema.customers.name, `%${search}%`),
          like(schema.customers.phone, `%${search}%`),
          like(schema.customers.email, `%${search}%`),
          like(schema.customers.city, `%${search}%`),
        )
      );
    }
    if (typeId) {
      conditions.push(eq(schema.customers.typeId, parseInt(typeId)));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const [customers, totalResult] = await Promise.all([
      db.select().from(schema.customers)
        .where(where)
        .orderBy(sql`id DESC`)
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(schema.customers)
        .where(where),
    ]);

    // Get customer types for the response
    const types = await db.select().from(schema.customerTypes);
    
    // Map types to customers
    const customersWithTypes = customers.map(c => ({
      ...c,
      type: types.find(t => t.id === c.typeId) || null
    }));

    return NextResponse.json({
      data: customersWithTypes,
      total: Number(totalResult[0].count),
      page,
      limit,
      totalPages: Math.ceil(Number(totalResult[0].count) / limit),
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const [newCustomer] = await db.insert(schema.customers).values({
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      city: body.city || null,
      typeId: body.typeId || null,
      notes: body.notes || null,
      totalPurchases: 0,
      isActive: true,
    }).returning();

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}