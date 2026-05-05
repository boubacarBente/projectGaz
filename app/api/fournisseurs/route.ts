import { NextResponse } from 'next/server';
import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { desc } from 'drizzle-orm';

// GET /api/fournisseurs - Liste tous les fournisseurs
export async function GET() {
  try {
    const result = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement' }, { status: 500 });
  }
}

// POST /api/fournisseurs - Créer un fournisseur
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const result = await db.insert(suppliers).values({
      name: data.name,
      phone: data.phone || null,
      address: data.address || null,
      notes: data.notes || null,
      totalPurchases: 0,
    }).returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error creating supplier:', error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}