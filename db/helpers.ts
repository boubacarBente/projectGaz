import { db } from './index';
import { desc } from 'drizzle-orm';
import { purchaseInvoices } from './schema';

// Types retournés par les helpers avec relations chargées
export type PurchaseInvoiceRow = {
  id: number;
  reference: string;
  supplierId: number | null;
  supplier: { id: number; name: string } | null;
  date: string;
  notes: string | null;
  totalAmount: number | null;
  isPaid: boolean | null;
  createdAt: Date | null;
  items: Array<{
    id: number;
    invoiceId: number;
    productId: number;
    productCode: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
};

/** Récupère toutes les factures d'achat avec le fournisseur et les items */
export async function findPurchaseInvoices() {
  return db.query.purchaseInvoices.findMany({
    with: {
      supplier: { columns: { id: true, name: true } },
      items: true,
    },
    orderBy: [desc(purchaseInvoices.date)],
  });
}

/** Récupère une facture d'achat par son ID avec le fournisseur et les items */
export async function findPurchaseInvoiceById(id: number) {
  const result = await db.query.purchaseInvoices.findFirst({
    where: (pi, { eq }) => eq(pi.id, id),
    with: {
      supplier: { columns: { id: true, name: true } },
      items: true,
    },
  });
  return result ?? null;
}
