import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';

export async function GET() {
  try {
    const types = await db.select().from(schema.customerTypes);
    return NextResponse.json(types);
  } catch (error) {
    console.error('Error fetching customer types:', error);
    return NextResponse.json({ error: 'Failed to fetch customer types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const [newType] = await db.insert(schema.customerTypes).values({
      name: body.name,
      description: body.description || null,
    }).returning();

    return NextResponse.json(newType, { status: 201 });
  } catch (error) {
    console.error('Error creating customer type:', error);
    return NextResponse.json({ error: 'Failed to create customer type' }, { status: 500 });
  }
}