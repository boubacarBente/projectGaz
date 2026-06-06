import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { desc, like, or, sql } from 'drizzle-orm';

// GET /api/fournisseurs - Liste tous les fournisseurs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100000, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
    const search = searchParams.get('search') || undefined;

    const where = search
      ? or(
          like(suppliers.name, `%${search}%`),
          like(suppliers.phone, `%${search}%`),
          like(suppliers.address, `%${search}%`),
        )
      : undefined;

    const rawDb: import('better-sqlite3').Database = (db as any).$client;

    const offset = (page - 1) * limit;

    const rows = rawDb.prepare(`
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
      ${where ? `WHERE s.name LIKE ? OR s.phone LIKE ? OR s.address LIKE ?` : ''}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...(where ? [`%${search}%`, `%${search}%`, `%${search}%`, limit, offset] : [limit, offset]));

    const countResult = rawDb.prepare(`SELECT COUNT(*) as count FROM suppliers s${where ? ` WHERE s.name LIKE ? OR s.phone LIKE ? OR s.address LIKE ?` : ''}`).get(...(where ? [`%${search}%`, `%${search}%`, `%${search}%`] : [])) as { count: number };

    return NextResponse.json({
      data: rows,
      total: countResult.count,
      page,
      limit,
      totalPages: Math.ceil(countResult.count / limit),
    });
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