import { NextResponse } from 'next/server';
import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { desc } from 'drizzle-orm';

// GET /api/fournisseurs - Liste tous les fournisseurs
export async function GET() {
  try {
    const rawDb: import('better-sqlite3').Database = (db as any).$client;
    const result = rawDb.prepare(`
      SELECT
        s.id,
        s.name,
        s.phone,
        s.address,
        COALESCE((SELECT SUM(pi.total_amount) FROM purchase_invoices pi WHERE pi.supplier_id = s.id), 0) AS totalPurchases,
        s.notes,
        s.is_active AS isActive,
        s.created_at AS createdAt,
        s.updated_at AS updatedAt
      FROM suppliers s
      ORDER BY s.created_at DESC
    `).all();
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