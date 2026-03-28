import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const typeId = searchParams.get('typeId');

    let customers;
    
    if (search || typeId) {
      const conditions = [];
      if (search) {
        conditions.push(
          eq(schema.customers.name, `%${search}%`) as any
        );
      }
      
      // Note: For full-text search, we'd need raw SQL. 
      // For simplicity, let's fetch all and filter in JS for now
      customers = await db.select().from(schema.customers);
      
      if (search) {
        const searchLower = search.toLowerCase();
        customers = customers.filter(c => 
          c.name.toLowerCase().includes(searchLower) ||
          (c.phone && c.phone.includes(search))
        );
      }
      
      if (typeId) {
        customers = customers.filter(c => c.typeId === parseInt(typeId));
      }
    } else {
      customers = await db.select().from(schema.customers);
    }

    // Get customer types for the response
    const types = await db.select().from(schema.customerTypes);
    
    // Map types to customers
    const customersWithTypes = customers.map(c => ({
      ...c,
      type: types.find(t => t.id === c.typeId) || null
    }));

    return NextResponse.json(customersWithTypes);
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