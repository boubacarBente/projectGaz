import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq, asc, and, or, like, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100000, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
    const search = searchParams.get('search') || undefined;

    const conditions = [];
    if (!all) conditions.push(eq(schema.products.isActive, true));
    if (search) {
      conditions.push(
        or(
          like(schema.products.code, `%${search}%`),
          like(schema.products.name, `%${search}%`),
          like(schema.products.capacity, `%${search}%`),
        )
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (page - 1) * limit;

    const [data, totalResult] = await Promise.all([
      db.select().from(schema.products)
        .where(where)
        .orderBy(asc(schema.products.id))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(schema.products)
        .where(where),
    ]);

    return NextResponse.json({
      data,
      total: Number(totalResult[0].count),
      page,
      limit,
      totalPages: Math.ceil(Number(totalResult[0].count) / limit),
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const [newProduct] = await db.insert(schema.products).values({
      code: body.code,
      name: body.name,
      capacity: body.capacity,
      unitPrice: Number(body.unitPrice) || 0,
      salePrice: Number(body.salePrice) || 0,
      isActive: body.isActive ?? true,
    }).returning();

    return NextResponse.json(newProduct, { 
      status: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
