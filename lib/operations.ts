import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  findWalletTransactionById,
  findLastWalletTransaction,
  findWalletTransactionsAfterId,
} from "../db/helpers";
import path from "node:path";
import Database from "better-sqlite3";
import { db } from "../db/index";
import { 
  customerTypes,
  customers,
  products, 
  suppliers,
  purchaseInvoices, 
  purchaseInvoiceItems,
  salesInvoices,
  salesInvoiceItems,
  stock,
  stockMovements,
  settings,
  walletTransactions
} from "../db/schema";
import { eq, desc, asc, like, sql, and, or, gte, lte } from "drizzle-orm";
import { listProducts } from "@/lib/products";

export type PurchaseInvoiceItem = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

export type PurchaseInvoice = {
  id: number;
  reference: string;
  supplier: string;
  date: string;
  notes: string;
  items: PurchaseInvoiceItem[];
  totalAmount: number;
  isPaid: boolean;
  createdAt: string;
};

export type SalesInvoiceItem = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type SalesInvoice = {
  id: number;
  invoiceNumber: string;
  customerId: number | null;
  customerName: string;
  date: string;
  paymentMethod: string;
  notes: string;
  items: SalesInvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: "Paye" | "Partiel" | "En attente";
  createdAt: string;
  costOfGoodsSold?: number;
  grossProfit?: number;
};

function roundAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function recalculateSupplierTotalPurchases(supplierId: number) {
  const invoices = await db.select({ totalAmount: purchaseInvoices.totalAmount })
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.supplierId, supplierId));
  const total = invoices.reduce((sum, inv) => sum + (inv.totalAmount ?? 0), 0);
  await db.update(suppliers)
    .set({ totalPurchases: total })
    .where(eq(suppliers.id, supplierId));
}

function getEventTimestamp(date: string, createdAt: string, fallbackOrder: number) {
  const createdAtTimestamp = Date.parse(createdAt);
  if (Number.isFinite(createdAtTimestamp)) {
    return createdAtTimestamp;
  }

  const dateTimestamp = Date.parse(`${date}T12:00:00`);
  if (Number.isFinite(dateTimestamp)) {
    return dateTimestamp + fallbackOrder;
  }

  return fallbackOrder;
}

export function calculateSalesProfitMetrics(
  purchases: PurchaseInvoice[],
  sales: SalesInvoice[],
) {
  const inventory = new Map<number, { quantity: number; totalCost: number }>();
  const saleSummaries = new Map<number, { costOfGoodsSold: number; grossProfit: number }>();
  const monthlyProfit = new Map<string, number>();

  const purchaseEvents = purchases.flatMap((invoice, invoiceIndex) =>
    invoice.items.map((item, itemIndex) => ({
      type: 'purchase' as const,
      invoiceId: invoice.id,
      productId: item.productId,
      quantity: item.quantity,
      unitAmount: item.unitCost,
      date: invoice.date,
      timestamp: getEventTimestamp(invoice.date, invoice.createdAt, (invoiceIndex * 100) + itemIndex),
    })),
  );

  const saleEvents = sales.flatMap((invoice, invoiceIndex) =>
    invoice.items.map((item, itemIndex) => ({
      type: 'sale' as const,
      invoiceId: invoice.id,
      productId: item.productId,
      quantity: item.quantity,
      unitAmount: item.unitPrice,
      date: invoice.date,
      timestamp: getEventTimestamp(invoice.date, invoice.createdAt, (invoiceIndex * 100) + itemIndex),
    })),
  );

  const events = [...purchaseEvents, ...saleEvents].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    if (a.type !== b.type) return a.type === 'purchase' ? -1 : 1;
    return a.invoiceId - b.invoiceId;
  });

  for (const event of events) {
    const current = inventory.get(event.productId) ?? { quantity: 0, totalCost: 0 };

    if (event.type === 'purchase') {
      current.quantity += event.quantity;
      current.totalCost += event.quantity * event.unitAmount;
      inventory.set(event.productId, current);
      continue;
    }

    const averageCost = current.quantity > 0 ? current.totalCost / current.quantity : 0;
    const costOfGoodsSold = averageCost * event.quantity;
    const revenue = event.unitAmount * event.quantity;
    const grossProfit = revenue - costOfGoodsSold;

    current.quantity -= event.quantity;
    current.totalCost -= costOfGoodsSold;

    if (Math.abs(current.quantity) < 1e-9) {
      current.quantity = 0;
    }

    if (Math.abs(current.totalCost) < 1e-9 || current.quantity === 0) {
      current.totalCost = 0;
    }

    inventory.set(event.productId, current);

    const existingSummary = saleSummaries.get(event.invoiceId) ?? {
      costOfGoodsSold: 0,
      grossProfit: 0,
    };

    existingSummary.costOfGoodsSold += costOfGoodsSold;
    existingSummary.grossProfit += grossProfit;
    saleSummaries.set(event.invoiceId, existingSummary);

    const monthKey = event.date.slice(0, 7);
    monthlyProfit.set(monthKey, (monthlyProfit.get(monthKey) ?? 0) + grossProfit);
  }

  const salesWithProfit = sales.map((invoice) => {
    const summary = saleSummaries.get(invoice.id) ?? { costOfGoodsSold: 0, grossProfit: 0 };

    return {
      ...invoice,
      costOfGoodsSold: roundAmount(summary.costOfGoodsSold),
      grossProfit: roundAmount(summary.grossProfit),
    };
  });

  return {
    salesWithProfit,
    totalGrossProfit: roundAmount(
      salesWithProfit.reduce((sum, invoice) => sum + (invoice.grossProfit ?? 0), 0),
    ),
    monthlyProfit,
  };
}

// --- CODE JSON (commenté - utilisation SQLite) ---

// const dataDirectory = path.join(process.cwd(), "data");
// const purchasesFile = path.join(dataDirectory, "purchase-invoices.json");
// const salesFile = path.join(dataDirectory, "sales-invoices.json");

// async function ensureFile(filePath: string) {
//   await mkdir(dataDirectory, { recursive: true });

//   try {
//     await readFile(filePath, "utf8");
//   } catch {
//     await writeFile(filePath, "[]", "utf8");
//   }
// }

// async function readJsonFile<T>(filePath: string) {
//   await ensureFile(filePath);
//   const content = await readFile(filePath, "utf8");
//   return JSON.parse(content) as T;
// }

// async function writeJsonFile(filePath: string, value: unknown) {
//   await ensureFile(filePath);
//   await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
// }

export async function listPurchaseInvoices(from?: string, to?: string) {
  // --- CODE SQL ---
  const conditions = [];
  if (from) conditions.push(gte(purchaseInvoices.date, from));
  if (to) conditions.push(lte(purchaseInvoices.date, to));

  const invoices = await db.query.purchaseInvoices.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(purchaseInvoices.date)],
    with: {
      supplier: true,
    },
  });

  const invoicesWithItems = await Promise.all(
    invoices.map(async (inv) => {
      const items = await db.select()
        .from(purchaseInvoiceItems)
        .where(eq(purchaseInvoiceItems.invoiceId, inv.id));

      return {
        id: inv.id,
        supplierId: inv.supplierId,
        reference: inv.reference,
        supplier: inv.supplier?.name || '',
        supplierName: inv.supplier?.name || '',
        date: inv.date,
        notes: inv.notes || "",
        items: items.map(item => ({
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost,
        })),
        totalAmount: inv.totalAmount ?? 0,
        isPaid: inv.isPaid ?? false,
        createdAt: inv.createdAt?.toISOString() || "",
      };
    })
  );

  return invoicesWithItems;
}

export async function listSalesInvoices(from?: string, to?: string) {
  // --- CODE JSON (commenté) ---
  // const invoices = await readJsonFile<SalesInvoice[]>(salesFile);
  // return invoices.sort((a, b) => b.date.localeCompare(a.date));

  // --- CODE SQL ---
  const conditions = [];
  if (from) conditions.push(gte(salesInvoices.date, from));
  if (to) conditions.push(lte(salesInvoices.date, to));

  const invoices = await db.select().from(salesInvoices)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(salesInvoices.date));
  
  const invoicesWithItems: SalesInvoice[] = await Promise.all(
    invoices.map(async (inv) => {
      const items = await db.select()
        .from(salesInvoiceItems)
        .where(eq(salesInvoiceItems.invoiceId, inv.id));
      
      return {
        id: inv.id,
        customerId: inv.customerId,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        date: inv.date,
        paymentMethod: inv.paymentMethod || "Espèces",
        notes: inv.notes || "",
        items: items.map(item => ({
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        totalAmount: inv.totalAmount ?? 0,
        amountPaid: inv.amountPaid ?? 0,
        remainingAmount: inv.remainingAmount ?? 0,
        paymentStatus: (inv.paymentStatus as "Paye" | "Partiel" | "En attente") || "En attente",
        createdAt: inv.createdAt?.toISOString() || "",
      };
    })
  );
  
  return invoicesWithItems;
}

type LineInput = {
  productId: number;
  quantity: number;
  amount: number;
};

async function buildPurchaseItems(lines: LineInput[]) {
  const products = await listProducts();

  return lines.map((line) => {
    const product = products.find((item) => item.id === line.productId);

    if (!product) {
      throw new Error("Produit introuvable pour la facture approvisionnement.");
    }

    return {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      quantity: Number(line.quantity) || 0,
      unitCost: Number(line.amount) || 0,
      totalCost: (Number(line.quantity) || 0) * (Number(line.amount) || 0),
    };
  });
}

async function buildSalesItems(lines: LineInput[]) {
  const products = await listProducts();

  return lines.map((line) => {
    const product = products.find((item) => item.id === line.productId);

    if (!product) {
      throw new Error("Produit introuvable pour la facture vente.");
    }

    return {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.amount) || 0,
      totalPrice: (Number(line.quantity) || 0) * (Number(line.amount) || 0),
    };
  });
}

export async function createPurchaseInvoice(input: {
  reference: string;
  supplierId: number;
  date: string;
  notes: string;
  lines: LineInput[];
  isPaid?: boolean;
}) {
  // --- CODE SQL ---
  const items = await buildPurchaseItems(input.lines);
  const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

  // Chercher le nom du fournisseur à partir de l'ID
  const supplierMatch = await db.select({ name: suppliers.name }).from(suppliers)
    .where(eq(suppliers.id, input.supplierId))
    .limit(1);
  const supplierName = supplierMatch.length > 0 ? supplierMatch[0].name : '';

  const result = await db.insert(purchaseInvoices).values({
    reference: input.reference,
    supplierId: input.supplierId,
    date: input.date,
    notes: input.notes,
    totalAmount,
    isPaid: input.isPaid ?? false,
  }).returning({ id: purchaseInvoices.id });

  const invoiceId = result[0].id;

  // Insérer les items et mettre à jour le stock
  for (const item of items) {
    await db.insert(purchaseInvoiceItems).values({
      invoiceId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
    });

    // Ajouter un mouvement d'entrée en stock
    await addStockMovement({
      productId: item.productId,
      type: 'entry',
      quantity: item.quantity,
      reference: `ACHAT-${input.reference}`,
      notes: `Approvisionnement via facture ${input.reference}`,
    });
  }

  // Mettre à jour le total des achats du fournisseur
  await recalculateSupplierTotalPurchases(input.supplierId);

  return {
    id: invoiceId,
    reference: input.reference,
    supplier: supplierName,
    date: input.date,
    notes: input.notes,
    items,
    totalAmount,
    isPaid: input.isPaid ?? false,
    createdAt: new Date().toISOString(),
  };
}

export async function createSalesInvoice(input: {
  customerId?: number | null;
  customerName: string;
  date: string;
  paymentMethod: string;
  notes: string;
  amountPaid: number;
  lines: LineInput[];
}) {
  // --- CODE JSON (commenté) ---
  // const invoices = await listSalesInvoices();
  // const items = await buildSalesItems(input.lines);
  // const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  // const remainingAmount = Math.max(totalAmount - input.amountPaid, 0);

  // const paymentStatus: SalesInvoice["paymentStatus"] =
  //   input.amountPaid <= 0
  //     ? "En attente"
  //     : remainingAmount > 0
  //       ? "Partiel"
  //       : "Paye";

  // const invoice: SalesInvoice = {
  //   id: invoices.reduce((max, item) => Math.max(max, item.id), 0) + 1,
  //   invoiceNumber: `N ${String(invoices.length + 1).padStart(6, "0")}`,
  //   customerName: input.customerName,
  //   date: input.date,
  //   paymentMethod: input.paymentMethod,
  //   notes: input.notes,
  //   items,
  //   totalAmount,
  //   amountPaid: input.amountPaid,
  //   remainingAmount,
  //   paymentStatus,
  //   createdAt: new Date().toISOString(),
  // };

  // await writeJsonFile(salesFile, [invoice, ...invoices]);
  // return invoice;

  // --- CODE SQL ---
  const items = await buildSalesItems(input.lines);
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const remainingAmount = Math.max(totalAmount - input.amountPaid, 0);

  const paymentStatus: SalesInvoice["paymentStatus"] =
    input.amountPaid <= 0
      ? "En attente"
      : remainingAmount > 0
        ? "Partiel"
        : "Paye";

  // Compter les factures
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(salesInvoices);
  const invoiceCount = countResult[0]?.count || 0;
  const invoiceNumber = `N ${String(invoiceCount + 1).padStart(6, "0")}`;

  const result = await db.insert(salesInvoices).values({
    invoiceNumber,
    customerName: input.customerName,
    date: input.date,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    totalAmount,
    amountPaid: input.amountPaid,
    remainingAmount,
    paymentStatus,
  }).returning({ id: salesInvoices.id });

  const invoiceId = result[0].id;

  // Insérer les items
  for (const item of items) {
    await db.insert(salesInvoiceItems).values({
      invoiceId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    });
  }

  // Mettre à jour le total des achats du client
  const [existingCustomer] = await db.select()
    .from(customers)
    .where(eq(customers.name, input.customerName))
    .limit(1);

    if (existingCustomer) {
      await db.update(customers)
        .set({
          totalPurchases: (existingCustomer.totalPurchases ?? 0) + totalAmount,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, existingCustomer.id));

      // Lier la facture au client trouvé pour l'historique des paiements
      await db.update(salesInvoices)
        .set({ customerId: existingCustomer.id })
        .where(eq(salesInvoices.id, invoiceId));
    }

  return {
    id: invoiceId,
    invoiceNumber,
    customerName: input.customerName,
    date: input.date,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    items,
    totalAmount,
    amountPaid: input.amountPaid,
    remainingAmount,
    paymentStatus,
    createdAt: new Date().toISOString(),
  };
}

export async function getPurchaseInvoice(id: number) {
  // --- CODE SQL ---
  const result = await db.query.purchaseInvoices.findFirst({
    where: eq(purchaseInvoices.id, id),
    with: {
      supplier: true,
    },
  });
  if (!result) return null;

  const items = await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));

  return {
    id: result.id,
    reference: result.reference,
    supplier: result.supplier?.name || '',
    supplierName: result.supplier?.name || '',
    date: result.date,
    notes: result.notes || "",
    items: items.map(item => ({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
    })),
    totalAmount: result.totalAmount ?? 0,
    isPaid: result.isPaid ?? false,
    createdAt: result.createdAt?.toISOString() || "",
  };
}

export async function updatePurchaseInvoice(id: number, input: {
  reference?: string;
  supplierId?: number;
  date?: string;
  notes?: string;
  lines?: LineInput[];
  isPaid?: boolean;
}) {
  // --- CODE SQL ---
  // Vérifier si la facture existe
  const existing = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
  if (existing.length === 0) {
    throw new Error('Invoice not found');
  }

  const items = input.lines 
    ? await buildPurchaseItems(input.lines)
    : await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));
  const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

  await db.update(purchaseInvoices).set({
    reference: input.reference,
    supplierId: input.supplierId,
    date: input.date,
    notes: input.notes,
    totalAmount,
    isPaid: input.isPaid,
  }).where(eq(purchaseInvoices.id, id));

  // Si nouvelles lignes, supprimer les anciennes et insérer les nouvelles
  if (input.lines) {
    // Récupérer les anciens items pour calculer les différences de stock
    const oldItems = await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));

    // Construire un map des nouvelles quantités par productId
    const newQuantities = new Map<number, number>();
    for (const item of items) {
      newQuantities.set(item.productId, (newQuantities.get(item.productId) || 0) + item.quantity);
    }

    // Ajuster le stock pour chaque ancien item
    for (const oldItem of oldItems) {
      const oldQty = oldItem.quantity;
      const newQty = newQuantities.get(oldItem.productId) ?? 0;
      const diff = newQty - oldQty;

      if (diff !== 0) {
        await addStockMovement({
          productId: oldItem.productId,
          type: diff > 0 ? 'entry' : 'exit',
          quantity: Math.abs(diff),
          reference: `MODIF-ACHAT-${existing[0].reference}`,
          notes: `Ajustement facture ${existing[0].reference} (${oldQty} → ${newQty})`,
        });
      }

      // Retirer du map les items déjà traités
      newQuantities.delete(oldItem.productId);
    }

    // Les produits restants dans newQuantities sont des nouveaux produits ajoutés
    for (const [productId, qty] of newQuantities) {
      if (qty > 0) {
        await addStockMovement({
          productId,
          type: 'entry',
          quantity: qty,
          reference: `MODIF-ACHAT-${existing[0].reference}`,
          notes: `Ajout produit dans facture ${existing[0].reference}`,
        });
      }
    }

    await db.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));
    for (const item of items) {
      await db.insert(purchaseInvoiceItems).values({
        invoiceId: id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
      });
    }
  }

  // Mettre à jour le total des achats du fournisseur (ancien et nouveau si changé)
  const oldSupplierId = existing[0].supplierId;
  const newSupplierId = input.supplierId ?? oldSupplierId;
  if (oldSupplierId) await recalculateSupplierTotalPurchases(oldSupplierId);
  if (newSupplierId && newSupplierId !== oldSupplierId) await recalculateSupplierTotalPurchases(newSupplierId);

  // Chercher le nom du fournisseur
  const sid = input.supplierId ?? existing[0].supplierId;
  const supplierRows = sid
    ? await db.select({ name: suppliers.name }).from(suppliers).where(eq(suppliers.id, sid)).limit(1)
    : [];
  const resolvedSupplierName = supplierRows.length > 0 ? supplierRows[0].name : '';

  return {
    id,
    reference: input.reference ?? existing[0].reference,
    supplier: resolvedSupplierName,
    supplierName: resolvedSupplierName,
    supplierId: sid!,
    date: input.date ?? existing[0].date,
    notes: (input.notes ?? existing[0].notes) || "",
    items: items.map(item => ({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
    })),
    totalAmount,
    isPaid: input.isPaid ?? existing[0].isPaid,
    createdAt: existing[0].createdAt?.toISOString() || "",
  };
}

export async function deletePurchaseInvoice(id: number) {
  // --- CODE JSON (commenté) ---
  // const invoices = await listPurchaseInvoices();
  // const filtered = invoices.filter((invoice) => invoice.id !== id);
  
  // if (filtered.length === invoices.length) {
  //   throw new Error('Invoice not found');
  // }

  // await writeJsonFile(purchasesFile, filtered);
  // return { success: true };

  // --- CODE SQL ---
  const existing = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
  if (existing.length === 0) {
    throw new Error('Invoice not found');
  }

  // Récupérer les items avant suppression pour annuler les mouvements de stock
  const items = await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));

  // Annuler les mouvements de stock (sortie)
  for (const item of items) {
    await addStockMovement({
      productId: item.productId,
      type: 'exit',
      quantity: item.quantity,
      reference: `ANNUL-ACHAT-${existing[0].reference}`,
      notes: `Annulation facture ${existing[0].reference}`,
    });
  }

  // Supprimer les items
  await db.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));
  // Supprimer la facture
  await db.delete(purchaseInvoices).where(eq(purchaseInvoices.id, id));

  // Mettre à jour le total des achats du fournisseur
  if (existing[0].supplierId) {
    await recalculateSupplierTotalPurchases(existing[0].supplierId);
  }
  
  return { success: true };
}

export async function getSalesInvoice(id: number) {
  // --- CODE JSON (commenté) ---
  // const invoices = await listSalesInvoices();
  // return invoices.find((invoice) => invoice.id === id) || null;

  // --- CODE SQL ---
  const invoices = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id));
  if (invoices.length === 0) return null;
  
  const inv = invoices[0];
  const items = await db.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, id));
  
  const invoice = {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerId: inv.customerId,
    customerName: inv.customerName,
    date: inv.date,
    paymentMethod: inv.paymentMethod || "Espèces",
    notes: inv.notes || "",
    items: items.map(item => ({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    totalAmount: inv.totalAmount ?? 0,
    amountPaid: inv.amountPaid ?? 0,
    remainingAmount: inv.remainingAmount ?? 0,
    paymentStatus: (inv.paymentStatus as "Paye" | "Partiel" | "En attente") || "En attente",
    createdAt: inv.createdAt?.toISOString() || "",
  };

  // Calculer le coût d'achat et le bénéfice par produit
  // (moyenne pondérée de tous les achats, indépendamment de la date)
  const purchases = await listPurchaseInvoices();
  const avgCostPerProduct = new Map<number, { qty: number; cost: number }>();

  for (const p of purchases) {
    for (const item of p.items) {
      if (item.unitCost > 0 && item.quantity > 0) {
        const existing = avgCostPerProduct.get(item.productId) ?? { qty: 0, cost: 0 };
        existing.qty += item.quantity;
        existing.cost += item.quantity * item.unitCost;
        avgCostPerProduct.set(item.productId, existing);
      }
    }
  }

  let costOfGoodsSold = 0;
  for (const item of invoice.items) {
    const avg = avgCostPerProduct.get(item.productId);
    const unitCost = avg ? avg.cost / avg.qty : 0;
    costOfGoodsSold += unitCost * item.quantity;
  }

  const grossProfit = invoice.totalAmount - costOfGoodsSold;

  return {
    ...invoice,
    costOfGoodsSold: roundAmount(costOfGoodsSold),
    grossProfit: roundAmount(grossProfit),
  };
}

export async function updateSalesInvoice(id: number, input: {
  customerName?: string;
  date?: string;
  paymentMethod?: string;
  notes?: string;
  amountPaid?: number;
  lines?: LineInput[];
}) {
  // --- CODE JSON (commenté) ---
  // const invoices = await listSalesInvoices();
  // const index = invoices.findIndex((invoice) => invoice.id === id);
  
  // if (index === -1) {
  //   throw new Error('Invoice not found');
  // }

  // const existingInvoice = invoices[index];
  // const items = input.lines 
  //   ? await buildSalesItems(input.lines)
  //   : existingInvoice.items;
  // const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  // const amountPaid = input.amountPaid ?? existingInvoice.amountPaid;
  // const remainingAmount = Math.max(totalAmount - amountPaid, 0);

  // const paymentStatus: SalesInvoice["paymentStatus"] =
  //   amountPaid <= 0
  //     ? "En attente"
  //     : remainingAmount > 0
  //       ? "Partiel"
  //       : "Paye";

  // const updatedInvoice: SalesInvoice = {
  //   ...existingInvoice,
  //   customerName: input.customerName ?? existingInvoice.customerName,
  //   date: input.date ?? existingInvoice.date,
  //   paymentMethod: input.paymentMethod ?? existingInvoice.paymentMethod,
  //   notes: input.notes ?? existingInvoice.notes,
  //   items,
  //   totalAmount,
  //   amountPaid,
  //   remainingAmount,
  //   paymentStatus,
  // };

  // invoices[index] = updatedInvoice;
  // await writeJsonFile(salesFile, invoices);
  // return updatedInvoice;

  // --- CODE SQL ---
  const existing = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id));
  if (existing.length === 0) {
    throw new Error('Invoice not found');
  }

  const items = input.lines 
    ? await buildSalesItems(input.lines)
    : await db.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, id));
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const amountPaid = input.amountPaid ?? existing[0]?.amountPaid ?? 0;
  const remainingAmount = Math.max(totalAmount - amountPaid, 0);

  const paymentStatus: SalesInvoice["paymentStatus"] =
    amountPaid <= 0
      ? "En attente"
      : remainingAmount > 0
        ? "Partiel"
        : "Paye";

  await db.update(salesInvoices).set({
    customerName: input.customerName,
    date: input.date,
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    totalAmount,
    amountPaid,
    remainingAmount,
    paymentStatus,
  }).where(eq(salesInvoices.id, id));

  if (input.lines) {
    await db.delete(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, id));
    for (const item of items) {
      await db.insert(salesInvoiceItems).values({
        invoiceId: id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      });
    }
  }

  return {
    id,
    invoiceNumber: existing[0].invoiceNumber,
    customerName: input.customerName ?? existing[0].customerName,
    date: input.date ?? existing[0].date,
    paymentMethod: input.paymentMethod ?? existing[0].paymentMethod,
    notes: (input.notes ?? existing[0].notes) || "",
    items: items.map(item => ({
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    totalAmount,
    amountPaid,
    remainingAmount,
    paymentStatus,
    createdAt: existing[0].createdAt?.toISOString() || "",
  };
}

export async function deleteSalesInvoice(id: number) {
  // --- CODE JSON (commenté) ---
  // const invoices = await listSalesInvoices();
  // const filtered = invoices.filter((invoice) => invoice.id !== id);
  
  // if (filtered.length === invoices.length) {
  //   throw new Error('Invoice not found');
  // }

  // await writeJsonFile(salesFile, filtered);
  // return { success: true };

  // --- CODE SQL ---
  const existing = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id));
  if (existing.length === 0) {
    throw new Error('Invoice not found');
  }

  const invoice = existing[0];

  // Soustraire le montant du total des achats du client
  const [customer] = await db.select()
    .from(customers)
    .where(eq(customers.name, invoice.customerName))
    .limit(1);

  if (customer) {
    await db.update(customers)
      .set({
        totalPurchases: Math.max((customer.totalPurchases ?? 0) - (invoice.totalAmount ?? 0), 0),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.id));
  }

  await db.delete(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, id));
  await db.delete(salesInvoices).where(eq(salesInvoices.id, id));
  
  return { success: true };
}

export async function getOperationsSnapshot() {
  const [purchases, sales] = await Promise.all([
    listPurchaseInvoices(),
    listSalesInvoices(),
  ]);

  const totalPurchases = purchases.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0,
  );
  const salesWithProfit = calculateSalesProfitMetrics(purchases, sales).salesWithProfit;
  const totalSales = salesWithProfit.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const grossProfit = salesWithProfit.reduce((sum, invoice) => sum + (invoice.grossProfit ?? 0), 0);

  const soldByProduct = salesWithProfit.flatMap((invoice) => invoice.items).reduce<
    Record<
      string,
      {
        productCode: string;
        productName: string;
        quantity: number;
        revenue: number;
      }
    >
  >((accumulator, item) => {
    const existing = accumulator[item.productCode];

    accumulator[item.productCode] = {
      productCode: item.productCode,
      productName: item.productName,
      quantity: (existing?.quantity ?? 0) + item.quantity,
      revenue: (existing?.revenue ?? 0) + item.totalPrice,
    };

    return accumulator;
  }, {});

  return {
    purchases,
    sales: salesWithProfit,
    totalPurchases,
    totalSales,
    grossProfit: roundAmount(grossProfit),
    soldByProduct: Object.values(soldByProduct).sort(
      (a, b) => b.quantity - a.quantity,
    ),
  };
}

// Stock Management Types
export type StockMovementType = 'entry' | 'exit' | 'adjustment' | 'return';

export type StockMovement = {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  reference: string;
  notes: string;
  createdAt: string;
};

export type StockItem = {
  productId: number;
  productCode: string;
  productName: string;
  capacity: string;
  currentStock: number;
  minStock: number;
  lastEntry: string | null;
  lastExit: string | null;
};

// --- CODE JSON (commenté - utilisation SQLite) ---

// const stockFile = path.join(dataDirectory, "stock.json");
// const stockMovementsFile = path.join(dataDirectory, "stock-movements.json");

// async function readStockFile() {
//   await ensureFile(stockFile);
//   const content = await readFile(stockFile, "utf8");
//   return JSON.parse(content) as StockItem[];
// }

// async function writeStockFile(items: StockItem[]) {
//   await writeFile(stockFile, JSON.stringify(items, null, 2), "utf8");
// }

// async function readStockMovementsFile() {
//   await ensureFile(stockMovementsFile);
//   const content = await readFile(stockMovementsFile, "utf8");
//   return JSON.parse(content) as StockMovement[];
// }

// async function writeStockMovementsFile(movements: StockMovement[]) {
//   await writeFile(stockMovementsFile, JSON.stringify(movements, null, 2), "utf8");
// }

export async function initializeStock() {
  // --- CODE JSON (commenté) ---
  // const products = await listProducts();
  // const stock = await readStockFile();
  
  // // Initialize stock for all products if not exists
  // const existingProductIds = new Set(stock.map(s => s.productId));
  // const newStockItems = products
  //   .filter(p => !existingProductIds.has(p.id))
  //   .map(p => ({
  //     productId: p.id,
  //     productCode: p.code,
  //     productName: p.name,
  //     capacity: p.capacity,
  //     currentStock: 0,
  //     minStock: 10, // Default min stock
  //     lastEntry: null,
  //     lastExit: null,
  //   }));
  
  // if (newStockItems.length > 0) {
  //   await writeStockFile([...stock, ...newStockItems]);
  // }
  
  // return [...stock.filter(s => existingProductIds.has(s.productId)), ...newStockItems];

  // --- CODE SQL ---
  const products = await listProducts();
  const existingStock = await db.select().from(stock);
  const existingProductIds = new Set(existingStock.map(s => s.productId));
  
  const newStockItems = products
    .filter(p => !existingProductIds.has(p.id))
    .map(p => ({
      productId: p.id,
      productCode: p.code,
      productName: p.name,
      capacity: p.capacity,
      currentStock: 0,
      minStock: 10,
    }));
  
  for (const item of newStockItems) {
    await db.insert(stock).values(item);
  }
  
  const allStock = await db.select().from(stock);
  return allStock.map(s => ({
    productId: s.productId,
    productCode: s.productCode,
    productName: s.productName,
    capacity: s.capacity,
    currentStock: s.currentStock,
    minStock: s.minStock,
    lastEntry: s.lastEntry,
    lastExit: s.lastExit,
  }));
}

export async function getStock() {
  // --- CODE JSON (commenté) ---
  // return readStockFile();

  // --- CODE SQL ---
  const allStock = await db.select().from(stock);
  return allStock.map(s => ({
    productId: s.productId,
    productCode: s.productCode,
    productName: s.productName,
    capacity: s.capacity,
    currentStock: s.currentStock,
    minStock: s.minStock,
    lastEntry: s.lastEntry,
    lastExit: s.lastExit,
  }));
}

export async function updateProductMinStock(productId: number, minStock: number) {
  // --- CODE JSON (commenté) ---
  // const stock = await readStockFile();
  // const index = stock.findIndex(s => s.productId === productId);
  
  // if (index === -1) {
  //   throw new Error('Product not found in stock');
  // }
  
  // stock[index].minStock = minStock;
  // await writeStockFile(stock);
  // return stock[index];

  // --- CODE SQL ---
  const existing = await db.select().from(stock).where(eq(stock.productId, productId));
  if (existing.length === 0) {
    throw new Error('Product not found in stock');
  }

  await db.update(stock).set({ minStock }).where(eq(stock.productId, productId));

  const updated = await db.select().from(stock).where(eq(stock.productId, productId));
  return {
    productId: updated[0].productId,
    productCode: updated[0].productCode,
    productName: updated[0].productName,
    capacity: updated[0].capacity,
    currentStock: updated[0].currentStock,
    minStock: updated[0].minStock,
    lastEntry: updated[0].lastEntry,
    lastExit: updated[0].lastExit,
  };
}

export async function addStockMovement(input: {
  productId: number;
  type: StockMovementType;
  quantity: number;
  reference: string;
  notes?: string;
}) {
  // --- CODE JSON (commenté) ---
  // const products = await listProducts();
  // const product = products.find(p => p.id === input.productId);
  
  // if (!product) {
  //   throw new Error('Product not found');
  // }
  
  // const movements = await readStockMovementsFile();
  // const stock = await readStockFile();
  
  // const movement: StockMovement = {
  //   id: movements.length > 0 ? Math.max(...movements.map(m => m.id)) + 1 : 1,
  //   productId: input.productId,
  //   productCode: product.code,
  //   productName: product.name,
  //   type: input.type,
  //   quantity: input.quantity,
  //   reference: input.reference,
  //   notes: input.notes || '',
  //   createdAt: new Date().toISOString(),
  // };
  
  // // Update stock
  // const stockIndex = stock.findIndex(s => s.productId === input.productId);
  // if (stockIndex === -1) {
  //   throw new Error('Product not found in stock');
  // }
  
  // if (input.type === 'entry' || input.type === 'return') {
  //   stock[stockIndex].currentStock += input.quantity;
  //   stock[stockIndex].lastEntry = movement.createdAt;
  // } else if (input.type === 'exit') {
  //   stock[stockIndex].currentStock -= input.quantity;
  //   stock[stockIndex].lastExit = movement.createdAt;
  // } else if (input.type === 'adjustment') {
  //   stock[stockIndex].currentStock = input.quantity;
  // }
  
  // await writeStockFile(stock);
  // await writeStockMovementsFile([movement, ...movements]);
  
  // return { movement, stock: stock[stockIndex] };

  // --- CODE SQL ---
  const products = await listProducts();
  const product = products.find(p => p.id === input.productId);
  
  if (!product) {
    throw new Error('Product not found');
  }

  // Récupérer le stock actuel
  let existingStock = await db.select().from(stock).where(eq(stock.productId, input.productId));
  
  // Si le produit n'a pas d'entrée en stock, l'initialiser (pour les entrées)
  if (existingStock.length === 0) {
    if (input.type === 'entry' || input.type === 'adjustment') {
      await db.insert(stock).values({
        productId: input.productId,
        productCode: product.code,
        productName: product.name,
        capacity: product.capacity,
        currentStock: 0,
        minStock: 10,
        lastEntry: null,
        lastExit: null,
      });
      existingStock = await db.select().from(stock).where(eq(stock.productId, input.productId));
    }
    if (existingStock.length === 0) {
      throw new Error('Product not found in stock');
    }
  }

  const currentStock = existingStock[0];
  let newStockAmount = currentStock.currentStock ?? 0;
  let lastEntry = currentStock.lastEntry;
  let lastExit = currentStock.lastExit;
  const now = new Date().toISOString();

  // Mettre à jour le stock selon le type de mouvement
  const qty = Number(input.quantity) || 0;
  if (input.type === 'entry' || input.type === 'return') {
    newStockAmount += qty;
    lastEntry = now;
  } else if (input.type === 'exit') {
    newStockAmount -= qty;
    lastExit = now;
  } else if (input.type === 'adjustment') {
    newStockAmount = qty;
  }

  await db.update(stock).set({
    currentStock: newStockAmount,
    lastEntry,
    lastExit,
  }).where(eq(stock.productId, input.productId));

  // Enregistrer le mouvement
  const result = await db.insert(stockMovements).values({
    productId: input.productId,
    productCode: product.code,
    productName: product.name,
    type: input.type,
    quantity: qty,
    reference: input.reference,
    notes: input.notes || '',
  }).returning({ id: stockMovements.id });

  const movement: StockMovement = {
    id: result[0].id,
    productId: input.productId,
    productCode: product.code,
    productName: product.name,
    type: input.type,
    quantity: qty,
    reference: input.reference,
    notes: input.notes || '',
    createdAt: now,
  };

  const updatedStock = await db.select().from(stock).where(eq(stock.productId, input.productId));
  return {
    movement,
    stock: {
      productId: updatedStock[0].productId,
      productCode: updatedStock[0].productCode,
      productName: updatedStock[0].productName,
      capacity: updatedStock[0].capacity,
      currentStock: updatedStock[0].currentStock,
      minStock: updatedStock[0].minStock,
      lastEntry: updatedStock[0].lastEntry,
      lastExit: updatedStock[0].lastExit,
    },
  };
}

export async function getStockMovements(limit = 50) {
  // --- CODE JSON (commenté) ---
  // const movements = await readStockMovementsFile();
  // return movements.slice(0, limit);

  // --- CODE SQL ---
  const movements = await db.select()
    .from(stockMovements)
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit);
  
  return movements.map(m => ({
    id: m.id,
    productId: m.productId,
    productCode: m.productCode,
    productName: m.productName,
    type: m.type as StockMovementType,
    quantity: m.quantity,
    reference: m.reference,
    notes: m.notes || "",
    createdAt: m.createdAt?.toISOString() || "",
  }));
}

export async function getLowStockAlerts() {
  // --- CODE JSON (commenté) ---
  // const stock = await readStockFile();
  // return stock.filter(s => s.currentStock <= s.minStock);

  // --- CODE SQL ---
  const allStock = await db.select().from(stock);
  return allStock
    .filter(s => (s.currentStock ?? 0) <= (s.minStock ?? 10))
    .map(s => ({
      productId: s.productId,
      productCode: s.productCode,
      productName: s.productName,
      capacity: s.capacity,
      currentStock: s.currentStock,
      minStock: s.minStock,
      lastEntry: s.lastEntry,
      lastExit: s.lastExit,
    }));
}

export async function getRapportData(from?: string, to?: string) {
  const [purchases, sales, stock] = await Promise.all([
    listPurchaseInvoices(from, to),
    listSalesInvoices(from, to),
    getStock(),
  ]);

  const { salesWithProfit, totalGrossProfit, monthlyProfit } = calculateSalesProfitMetrics(purchases, sales);
  const totalPurchases = purchases.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalSales = salesWithProfit.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const grossProfit = totalGrossProfit;

  // Sales by product
  const soldByProduct = salesWithProfit.flatMap((inv) => inv.items).reduce<
    Record<string, { productCode: string; productName: string; quantity: number; revenue: number }>
  >((acc, item) => {
    const existing = acc[item.productCode];
    acc[item.productCode] = {
      productCode: item.productCode,
      productName: item.productName,
      quantity: (existing?.quantity ?? 0) + item.quantity,
      revenue: (existing?.revenue ?? 0) + item.totalPrice,
    };
    return acc;
  }, {});

  // Monthly data (last 12 months)
  const months: Record<string, { purchases: number; sales: number }> = {};
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months[key] = { purchases: 0, sales: 0 };
  }

  purchases.forEach((inv) => {
    const date = new Date(inv.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].purchases += inv.totalAmount;
    }
  });

  salesWithProfit.forEach((inv) => {
    const date = new Date(inv.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].sales += inv.totalAmount;
    }
  });

  // Top customers by revenue
  const customersRevenue = salesWithProfit.reduce<
    Record<string, { name: string; totalSpent: number; invoiceCount: number }>
  >((acc, inv) => {
    const existing = acc[inv.customerName];
    acc[inv.customerName] = {
      name: inv.customerName,
      totalSpent: (existing?.totalSpent ?? 0) + inv.totalAmount,
      invoiceCount: (existing?.invoiceCount ?? 0) + 1,
    };
    return acc;
  }, {});

  const topCustomers = Object.values(customersRevenue)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // Summary stats
  const totalBottlesSold = salesWithProfit.reduce((sum, inv) => 
    sum + inv.items.reduce((s, item) => s + item.quantity, 0), 0
  );
  const averageBasket = salesWithProfit.length > 0 ? totalSales / salesWithProfit.length : 0;
  const totalBottlesInStock = stock.reduce((sum, s) => sum + (s.currentStock ?? 0), 0);

  return {
    summary: {
      totalPurchases,
      totalSales,
      grossProfit,
      totalBottlesSold,
      averageBasket,
      totalBottlesInStock,
      totalInvoices: purchases.length + salesWithProfit.length,
      totalCustomers: Object.keys(customersRevenue).length,
    },
    monthlyData: Object.entries(months).map(([month, data]) => ({
      month,
      ...data,
      profit: roundAmount(monthlyProfit.get(month) ?? 0),
    })),
    soldByProduct: Object.values(soldByProduct).sort((a, b) => b.quantity - a.quantity),
    topCustomers,
  };
}

// Settings Management
export type Settings = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  defaultMinStock: number;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  invoicePrefix: string;
  purchasePrefix: string;
  lowStockAlertEnabled: boolean;
  theme: 'light' | 'dark';
  primaryColor: string;
  sidebarColor: string;
};

const defaultSettings: Settings = {
  companyName: 'Mini-Centre Distribution',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  defaultMinStock: 10,
  currency: 'GNF',
  currencySymbol: 'GNF',
  dateFormat: 'DD/MM/YYYY',
  invoicePrefix: 'FAC',
  purchasePrefix: 'ACH',
  lowStockAlertEnabled: true,
  theme: 'light',
  primaryColor: '#1e40af',
  sidebarColor: '#1e293b',
};

// --- CODE JSON (commenté - utilisation SQLite) ---

// const settingsFile = path.join(dataDirectory, "settings.json");

// async function readSettingsFile(): Promise<Settings> {
//   try {
//     await ensureFile(settingsFile);
//     const content = await readFile(settingsFile, "utf8");
//     const data = JSON.parse(content);
//     return { ...defaultSettings, ...data };
//   } catch {
//     return defaultSettings;
//   }
// }

// async function writeSettingsFile(settings: Settings) {
//   await writeFile(settingsFile, JSON.stringify(settings, null, 2), "utf8");
// }

export async function getSettings(): Promise<Settings> {
  // --- CODE SQL ---
  const allSettings = await db.select().from(settings);
  if (allSettings.length === 0) {
    // Créer les paramètres par défaut si pas encore existants
    const result = await db.insert(settings).values(defaultSettings).returning();
    const r = result[0];
    return {
      companyName: r.companyName || 'Mini-Centre Distribution',
      companyAddress: r.companyAddress || '',
      companyPhone: r.companyPhone || '',
      companyEmail: r.companyEmail || '',
      defaultMinStock: r.defaultMinStock ?? 10,
      currency: r.currency || 'GNF',
      currencySymbol: r.currencySymbol || 'GNF',
      dateFormat: r.dateFormat || 'DD/MM/YYYY',
      invoicePrefix: r.invoicePrefix || 'FAC',
      purchasePrefix: r.purchasePrefix || 'ACH',
      lowStockAlertEnabled: r.lowStockAlertEnabled ?? true,
      theme: (r.theme || 'light') as 'light' | 'dark',
      primaryColor: r.primaryColor || '#1e40af',
      sidebarColor: r.sidebarColor || '#1e293b',
    };
  }
  
  const s = allSettings[0];
  return {
    companyName: s.companyName || 'Mini-Centre Distribution',
    companyAddress: s.companyAddress || '',
    companyPhone: s.companyPhone || '',
    companyEmail: s.companyEmail || '',
    defaultMinStock: s.defaultMinStock ?? 10,
    currency: s.currency || 'GNF',
    currencySymbol: s.currencySymbol || 'GNF',
    dateFormat: s.dateFormat || 'DD/MM/YYYY',
    invoicePrefix: s.invoicePrefix || 'FAC',
    purchasePrefix: s.purchasePrefix || 'ACH',
    lowStockAlertEnabled: s.lowStockAlertEnabled ?? true,
    theme: (s.theme || 'light') as 'light' | 'dark',
    primaryColor: s.primaryColor || '#1e40af',
    sidebarColor: s.sidebarColor || '#1e293b',
  };
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const current = await db.select().from(settings);
  if (current.length === 0) {
    throw new Error('Settings not found');
  }

  // Filtrer les valeurs undefined
  const updatesFiltered: Record<string, unknown> = {};
  if (updates.companyName !== undefined) updatesFiltered.companyName = updates.companyName;
  if (updates.companyAddress !== undefined) updatesFiltered.companyAddress = updates.companyAddress;
  if (updates.companyPhone !== undefined) updatesFiltered.companyPhone = updates.companyPhone;
  if (updates.companyEmail !== undefined) updatesFiltered.companyEmail = updates.companyEmail;
  if (updates.defaultMinStock !== undefined) updatesFiltered.defaultMinStock = updates.defaultMinStock;
  if (updates.currency !== undefined) updatesFiltered.currency = updates.currency;
  if (updates.currencySymbol !== undefined) updatesFiltered.currencySymbol = updates.currencySymbol;
  if (updates.dateFormat !== undefined) updatesFiltered.dateFormat = updates.dateFormat;
  if (updates.invoicePrefix !== undefined) updatesFiltered.invoicePrefix = updates.invoicePrefix;
  if (updates.purchasePrefix !== undefined) updatesFiltered.purchasePrefix = updates.purchasePrefix;
  if (updates.lowStockAlertEnabled !== undefined) updatesFiltered.lowStockAlertEnabled = updates.lowStockAlertEnabled;
  if (updates.theme !== undefined) updatesFiltered.theme = updates.theme;
  if (updates.primaryColor !== undefined) updatesFiltered.primaryColor = updates.primaryColor;
  if (updates.sidebarColor !== undefined) updatesFiltered.sidebarColor = updates.sidebarColor;

  await db.update(settings).set(updatesFiltered).where(eq(settings.id, current[0].id));

  const updated = await db.select().from(settings).where(eq(settings.id, current[0].id));
  const s = updated[0];
  return {
    companyName: s.companyName || 'Mini-Centre Distribution',
    companyAddress: s.companyAddress || '',
    companyPhone: s.companyPhone || '',
    companyEmail: s.companyEmail || '',
    defaultMinStock: s.defaultMinStock ?? 10,
    currency: s.currency || 'GNF',
    currencySymbol: s.currencySymbol || 'GNF',
    dateFormat: s.dateFormat || 'DD/MM/YYYY',
    invoicePrefix: s.invoicePrefix || 'FAC',
    purchasePrefix: s.purchasePrefix || 'ACH',
    lowStockAlertEnabled: s.lowStockAlertEnabled ?? true,
    theme: (s.theme || 'light') as 'light' | 'dark',
    primaryColor: s.primaryColor || '#1e40af',
    sidebarColor: s.sidebarColor || '#1e293b',
  };
}

export async function resetDatabaseExceptProductsAndCustomers() {
  const client: Database.Database = (db as any).$client;

  client.transaction(() => {
    // Supprimer les items des factures
    client.prepare('DELETE FROM purchase_invoice_items').run();
    client.prepare('DELETE FROM sales_invoice_items').run();
    // Supprimer les mouvements de stock
    client.prepare('DELETE FROM stock_movements').run();
    // Supprimer les factures
    client.prepare('DELETE FROM purchase_invoices').run();
    client.prepare('DELETE FROM sales_invoices').run();
    // Supprimer le stock
    client.prepare('DELETE FROM stock').run();
    // Supprimer les fournisseurs
    client.prepare('DELETE FROM suppliers').run();
    // Supprimer les clients et leurs types (clients d'abord à cause de FK)
    client.prepare('DELETE FROM customers').run();
    client.prepare('DELETE FROM customer_types').run();
    // Supprimer les produits
    client.prepare('DELETE FROM products').run();
    // Réinitialiser les séquences auto-increment
    client.prepare("DELETE FROM sqlite_sequence WHERE name IN ('customers', 'customer_types', 'products', 'purchase_invoices', 'purchase_invoice_items', 'sales_invoices', 'sales_invoice_items', 'stock', 'stock_movements', 'suppliers', 'wallet_transactions')").run();
    // Supprimer les transactions du portefeuille
    client.prepare('DELETE FROM wallet_transactions').run();
    // Supprimer les paramètres
    client.prepare('DELETE FROM settings').run();

    // Réinsérer les settings par défaut
    client.prepare(`INSERT INTO settings (company_name, company_address, company_phone, company_email, default_min_stock, currency, currency_symbol, date_format, invoice_prefix, purchase_prefix, low_stock_alert_enabled, theme, primary_color, sidebar_color)
      VALUES ('Mini-Centre Distribution', '', '', '', 10, 'GNF', 'GNF', 'DD/MM/YYYY', 'FAC', 'ACH', 1, 'light', '#1e40af', '#1e293b')`).run();
  })();

  return { success: true };
}

// ─── Wallet (Portefeuille) ─────────────────────────────────────────

export async function listWalletTransactions() {
  return db.query.walletTransactions.findMany({
    orderBy: [desc(walletTransactions.createdAt)],
  });
}

export async function getWalletTransaction(id: number) {
  const tx = await findWalletTransactionById(id);
  if (!tx) return null;
  return tx;
}

export async function createWalletTransaction(data: {
  amount: number;
  type: 'income' | 'expense';
  description?: string;
}) {
  const client: Database.Database = (db as any).$client;

  return client.transaction(() => {
    // Récupérer le dernier solde
    const last = client.prepare('SELECT balance_after FROM wallet_transactions ORDER BY id DESC LIMIT 1').get() as { balance_after: number } | undefined;
    const lastBalance = last?.balance_after ?? 0;

    // Calculer le nouveau solde (peut être négatif)
    const newBalance = data.type === 'income'
      ? lastBalance + data.amount
      : lastBalance - data.amount;

    // Insérer la transaction
    const stmt = client.prepare(`
      INSERT INTO wallet_transactions (amount, type, description, balance_after, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const now = Math.floor(Date.now() / 1000);
    const result = stmt.run(data.amount, data.type, data.description || null, newBalance, now, now);

    return {
      id: result.lastInsertRowid as number,
      amount: data.amount,
      type: data.type,
      description: data.description || null,
      balanceAfter: newBalance,
      createdAt: new Date(now * 1000),
      updatedAt: new Date(now * 1000),
    };
  })();
}

export async function updateWalletTransaction(
  id: number,
  data: { amount?: number; type?: 'income' | 'expense'; description?: string }
) {
  const existing = await findWalletTransactionById(id);
  if (!existing) throw new Error('Transaction introuvable');

  const client: Database.Database = (db as any).$client;

  return client.transaction(() => {
    const now = Math.floor(Date.now() / 1000);
    const amount = data.amount ?? existing.amount;
    const type = data.type ?? existing.type;
    const description = data.description !== undefined ? data.description : existing.description;

    // Mettre à jour la transaction
    client.prepare(`
      UPDATE wallet_transactions
      SET amount = ?, type = ?, description = ?, updated_at = ?
      WHERE id = ?
    `).run(amount, type, description, now, id);

    // Recalculer les soldes à partir de cette transaction
    recalculateBalancesFrom(client, id);

    // Retourner la transaction mise à jour
    const updated = client.prepare('SELECT * FROM wallet_transactions WHERE id = ?').get(id) as any;
    return {
      id: updated.id,
      amount: updated.amount,
      type: updated.type,
      description: updated.description,
      balanceAfter: updated.balance_after,
      createdAt: new Date((updated.created_at as number) * 1000),
      updatedAt: new Date((updated.updated_at as number) * 1000),
    };
  })();
}

export async function deleteWalletTransaction(id: number) {
  const existing = await findWalletTransactionById(id);
  if (!existing) throw new Error('Transaction introuvable');

  const client: Database.Database = (db as any).$client;

  client.transaction(() => {
    // Supprimer la transaction
    client.prepare('DELETE FROM wallet_transactions WHERE id = ?').run(id);

    // Recalculer les soldes à partir de la première transaction suivante
    const nextTx = client.prepare('SELECT id FROM wallet_transactions WHERE id > ? ORDER BY id ASC LIMIT 1').get(id) as { id: number } | undefined;
    if (nextTx) {
      recalculateBalancesFrom(client, nextTx.id);
    }
  })();
}

function recalculateBalancesFrom(client: Database.Database, startId: number) {
  // Récupérer le solde avant cette transaction
  const prev = client.prepare('SELECT balance_after FROM wallet_transactions WHERE id < ? ORDER BY id DESC LIMIT 1').get(startId) as { balance_after: number } | undefined;
  let currentBalance = prev?.balance_after ?? 0;

  // Récupérer toutes les transactions à partir de startId, triées par id croissant
  const txs = client.prepare('SELECT id, amount, type FROM wallet_transactions WHERE id >= ? ORDER BY id ASC').all(startId) as Array<{ id: number; amount: number; type: string }>;

  for (const tx of txs) {
    currentBalance = tx.type === 'income'
      ? currentBalance + tx.amount
      : currentBalance - tx.amount;

    client.prepare('UPDATE wallet_transactions SET balance_after = ? WHERE id = ?').run(currentBalance, tx.id);
  }
}

export async function getWalletSummary() {
  const client: Database.Database = (db as any).$client;

  const lastTx = client.prepare('SELECT balance_after FROM wallet_transactions ORDER BY id DESC LIMIT 1').get() as { balance_after: number } | undefined;
  const currentBalance = lastTx?.balance_after ?? 0;

  const stats = client.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
      COUNT(*) as transactions_count
    FROM wallet_transactions
  `).get() as { total_income: number; total_expense: number; transactions_count: number };

  return {
    currentBalance,
    totalIncome: stats.total_income,
    totalExpense: stats.total_expense,
    transactionsCount: stats.transactions_count,
  };
}
