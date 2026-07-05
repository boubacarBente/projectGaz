import { NextRequest, NextResponse } from 'next/server';
import { db, rawAll, rawGet } from '@/db';
import { suppliers } from '@/db/schema';

// GET /api/fournisseurs - Liste tous les fournisseurs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100000, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)));
    const search = searchParams.get('search') || undefined;

    const offset = (page - 1) * limit;
    const hasSearch = Boolean(search);
    const searchArgs = hasSearch ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

    const rows = await rawAll(`
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
      ${hasSearch ? `WHERE s.name LIKE ? OR s.phone LIKE ? OR s.address LIKE ?` : ''}
      ORDER BY s.created_at DESC
      LIMIT ? OFFSET ?
    `, [...searchArgs, limit, offset]);

    const countResult = await rawGet<{ count: number }>(
      `SELECT COUNT(*) as count FROM suppliers s${hasSearch ? ` WHERE s.name LIKE ? OR s.phone LIKE ? OR s.address LIKE ?` : ''}`,
      searchArgs,
    );

    return NextResponse.json({
      data: rows,
      total: countResult?.count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((countResult?.count ?? 0) / limit),
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
