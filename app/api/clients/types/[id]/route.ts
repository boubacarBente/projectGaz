import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [type] = await db
      .select()
      .from(schema.customerTypes)
      .where(eq(schema.customerTypes.id, parseInt(id)));

    if (!type) {
      return NextResponse.json({ error: 'Type not found' }, { status: 404 });
    }

    return NextResponse.json(type);
  } catch (error) {
    console.error('Error fetching customer type:', error);
    return NextResponse.json({ error: 'Failed to fetch customer type' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [updatedType] = await db
      .update(schema.customerTypes)
      .set({
        name: body.name,
        description: body.description || null,
      })
      .where(eq(schema.customerTypes.id, parseInt(id)))
      .returning();

    if (!updatedType) {
      return NextResponse.json({ error: 'Type not found' }, { status: 404 });
    }

    return NextResponse.json(updatedType);
  } catch (error) {
    console.error('Error updating customer type:', error);
    return NextResponse.json({ error: 'Failed to update customer type' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if type is in use by any customer
    const customers = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.typeId, parseInt(id)));

    if (customers.length > 0) {
      return NextResponse.json(
        { error: 'Ce type est utilisé par des clients et ne peut pas être supprimé' },
        { status: 400 }
      );
    }

    await db
      .delete(schema.customerTypes)
      .where(eq(schema.customerTypes.id, parseInt(id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer type:', error);
    return NextResponse.json({ error: 'Failed to delete customer type' }, { status: 500 });
  }
}