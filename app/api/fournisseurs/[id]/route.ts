import { NextResponse } from 'next/server';
import { db } from '@/db';
import { suppliers, purchaseInvoices, purchaseInvoiceItems } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/fournisseurs/[id] - Factures d'un fournisseur
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supplierId = parseInt(id);
  
  try {
    // Get supplier info
    const supplier = await db.select().from(suppliers).where(eq(suppliers.id, supplierId));
    if (!supplier.length) {
      return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 });
    }
    
    // Get all invoices for this supplier
    const invoices = await db.select().from(purchaseInvoices)
      .where(eq(purchaseInvoices.supplierId, supplierId))
      .orderBy(desc(purchaseInvoices.date));
    
    // Get items for each invoice
    const invoicesWithItems = await Promise.all(invoices.map(async (inv) => {
      const items = await db.select().from(purchaseInvoiceItems)
        .where(eq(purchaseInvoiceItems.invoiceId, inv.id));
      return { ...inv, items };
    }));
    
    return NextResponse.json({
      supplier: supplier[0],
      invoices: invoicesWithItems,
    });
  } catch (error) {
    console.error('Error fetching supplier invoices:', error);
    return NextResponse.json({ error: 'Erreur lors du chargement' }, { status: 500 });
  }
}

// PUT /api/fournisseurs/[id] - Modifier un fournisseur
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supplierId = parseInt(id);
  
  try {
    const data = await request.json();
    
    const result = await db.update(suppliers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(suppliers.id, supplierId))
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}

// DELETE /api/fournisseurs/[id] - Supprimer un fournisseur
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supplierId = parseInt(id);
  
  try {
    await db.delete(suppliers).where(eq(suppliers.id, supplierId));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}