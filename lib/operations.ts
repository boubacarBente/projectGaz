import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  findWalletTransactionById,
  findLastWalletTransaction,
  findWalletTransactionsAfterId,
} from "../db/helpers";
import path from "node:path";
import { db, rawAll, rawGet, rawRun, withRawTransaction } from "../db/index";
import { 
  customerTypes,
  customers,
  products, 
  suppliers,
  purchaseInvoices, 
  purchaseInvoiceItems,
  salesInvoices,
  salesInvoiceItems,
  stockMovements,
  settings,
  walletTransactions
} from "../db/schema";
import { eq, desc, asc, like, sql, and, or, gte, lte, inArray } from "drizzle-orm";
import { listProducts } from "@/lib/products";
import { addStockMovement } from "@/lib/stock";
import type { RapportData, RapportFilters, RapportMetricSnapshot, RapportPaymentStatus } from "@/lib/rapports-types";

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
  supplierId?: number | null;
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
  purchaseInvoiceId: number | null;
  purchaseInvoiceReference: string | null;
  purchaseInvoiceSupplierName: string | null;
  customerName: string;
  date: string;
  paymentMethod: string;
  notes: string;
  items: SalesInvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: "Payée" | "Partiel" | "En attente";
  createdAt: string;
  costOfGoodsSold?: number;
  grossProfit?: number;
};

function roundAmount(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function assertPurchaseInvoiceExists(purchaseInvoiceId: number | null | undefined) {
  if (purchaseInvoiceId == null) return;

  const [invoice] = await db.select({ id: purchaseInvoices.id })
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.id, purchaseInvoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("La facture d'usine liée est introuvable");
  }
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
  const conditions = [];
  if (from) conditions.push(gte(purchaseInvoices.date, from));
  if (to) conditions.push(lte(purchaseInvoices.date, to));

  const invoices = await db.query.purchaseInvoices.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(purchaseInvoices.date), desc(purchaseInvoices.createdAt), desc(purchaseInvoices.id)],
    with: {
      supplier: true,
      items: true,
    },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    supplierId: inv.supplierId,
    reference: inv.reference,
    supplier: inv.supplier?.name || '',
    supplierName: inv.supplier?.name || '',
    date: inv.date,
    notes: inv.notes || "",
    items: (inv.items || []).map(item => ({
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
  }));
}

export async function listPaginatedPurchaseInvoices(
  page: number,
  limit: number,
  { from, to, search, isPaid, supplierId }: { from?: string; to?: string; search?: string; isPaid?: boolean; supplierId?: number } = {}
) {
  const conditions = [];
  if (from) conditions.push(gte(purchaseInvoices.date, from));
  if (to) conditions.push(lte(purchaseInvoices.date, to));
  if (search) conditions.push(like(purchaseInvoices.reference, `%${search}%`));
  if (isPaid !== undefined) conditions.push(eq(purchaseInvoices.isPaid, isPaid));
  if (supplierId) conditions.push(eq(purchaseInvoices.supplierId, supplierId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [invoices, totalResult] = await Promise.all([
    db.query.purchaseInvoices.findMany({
      where,
      orderBy: [desc(purchaseInvoices.createdAt), desc(purchaseInvoices.id), desc(purchaseInvoices.date)],
      with: { supplier: true, items: true },
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(purchaseInvoices)
      .where(where),
  ]);

  const data = invoices.map((inv) => ({
    id: inv.id,
    supplierId: inv.supplierId,
    reference: inv.reference,
    supplier: inv.supplier?.name || '',
    supplierName: inv.supplier?.name || '',
    date: inv.date,
    notes: inv.notes || "",
    items: (inv.items || []).map(item => ({
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
  }));

  const total = Number(totalResult[0].count);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function listSalesInvoices(from?: string, to?: string) {
  const conditions = [];
  if (from) conditions.push(gte(salesInvoices.date, from));
  if (to) conditions.push(lte(salesInvoices.date, to));

  const invoices = await db.query.salesInvoices.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(salesInvoices.date), desc(salesInvoices.createdAt), desc(salesInvoices.id)],
    with: {
      items: true,
      purchaseInvoice: { with: { supplier: true } },
    },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    customerId: inv.customerId,
    purchaseInvoiceId: inv.purchaseInvoiceId,
    purchaseInvoiceReference: inv.purchaseInvoice?.reference ?? null,
    purchaseInvoiceSupplierName: inv.purchaseInvoice?.supplier?.name ?? null,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    date: inv.date,
    paymentMethod: inv.paymentMethod || "Espèces",
    notes: inv.notes || "",
    items: (inv.items || []).map(item => ({
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
    paymentStatus: (inv.paymentStatus as "Payée" | "Partiel" | "En attente") || "En attente",
    createdAt: inv.createdAt?.toISOString() || "",
  }));
}

export async function listPaginatedSalesInvoices(
  page: number,
  limit: number,
  { from, to, search, type }: { from?: string; to?: string; search?: string; type?: 'paid' | 'partial' | 'pending' } = {}
) {
  const conditions = [];
  if (from) conditions.push(gte(salesInvoices.date, from));
  if (to) conditions.push(lte(salesInvoices.date, to));
  if (search) {
    conditions.push(
      or(
        like(salesInvoices.invoiceNumber, `%${search}%`),
        like(salesInvoices.customerName, `%${search}%`),
      )
    );
  }
  if (type === 'paid') conditions.push(eq(salesInvoices.paymentStatus, 'Payée'));
  if (type === 'partial') conditions.push(eq(salesInvoices.paymentStatus, 'Partiel'));
  if (type === 'pending') conditions.push(eq(salesInvoices.paymentStatus, 'En attente'));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [invoices, totalResult] = await Promise.all([
    db.query.salesInvoices.findMany({
      where,
      orderBy: [desc(salesInvoices.createdAt), desc(salesInvoices.id), desc(salesInvoices.date)],
      with: {
        items: true,
        purchaseInvoice: { with: { supplier: true } },
      },
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(salesInvoices)
      .where(where),
  ]);

  const data: SalesInvoice[] = invoices.map((inv) => ({
    id: inv.id,
    customerId: inv.customerId,
    purchaseInvoiceId: inv.purchaseInvoiceId,
    purchaseInvoiceReference: inv.purchaseInvoice?.reference ?? null,
    purchaseInvoiceSupplierName: inv.purchaseInvoice?.supplier?.name ?? null,
    invoiceNumber: inv.invoiceNumber,
    customerName: inv.customerName,
    date: inv.date,
    paymentMethod: inv.paymentMethod || "Espèces",
    notes: inv.notes || "",
    items: (inv.items || []).map(item => ({
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
    paymentStatus: (inv.paymentStatus as "Payée" | "Partiel" | "En attente") || "En attente",
    createdAt: inv.createdAt?.toISOString() || "",
  }));

  const total = Number(totalResult[0].count);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function listSalesInvoicesByPurchaseInvoiceId(purchaseInvoiceId: number) {
  const invoices = await db.select({
    id: salesInvoices.id,
    invoiceNumber: salesInvoices.invoiceNumber,
    customerName: salesInvoices.customerName,
    date: salesInvoices.date,
    totalAmount: salesInvoices.totalAmount,
    amountPaid: salesInvoices.amountPaid,
    remainingAmount: salesInvoices.remainingAmount,
    paymentStatus: salesInvoices.paymentStatus,
  })
    .from(salesInvoices)
    .where(eq(salesInvoices.purchaseInvoiceId, purchaseInvoiceId))
    .orderBy(desc(salesInvoices.date), desc(salesInvoices.createdAt), desc(salesInvoices.id));

  return invoices.map((invoice) => ({
    ...invoice,
    totalAmount: invoice.totalAmount ?? 0,
    amountPaid: invoice.amountPaid ?? 0,
    remainingAmount: invoice.remainingAmount ?? 0,
    paymentStatus: (invoice.paymentStatus as SalesInvoice['paymentStatus']) || 'En attente',
  }));
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

async function buildSalesItems(
  lines: LineInput[],
  options: {
    stockAllowanceByProductId?: Map<number, number>;
    operationLabel?: string;
  } = {},
) {
  const products = await listProducts();

  // Vérifier le stock disponible par produit, même si le produit apparaît sur plusieurs lignes.
  const stockErrors: string[] = [];
  const requestedByProductId = new Map<number, number>();

  for (const line of lines) {
    const quantity = Number(line.quantity) || 0;
    requestedByProductId.set(
      line.productId,
      (requestedByProductId.get(line.productId) ?? 0) + quantity,
    );
  }

  for (const [productId, quantity] of requestedByProductId) {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      throw new Error(`Produit introuvable pour la facture vente (ID: ${productId}).`);
    }

    const restoredQuantity = options.stockAllowanceByProductId?.get(productId) ?? 0;
    const currentStock = product.stock ?? 0;
    const availableStock = currentStock + restoredQuantity;

    if (quantity > availableStock) {
      stockErrors.push(
        `• ${product.code} ${product.name} : stock insuffisant (disponible: ${availableStock}, demandé: ${quantity})`
      );
    }
  }

  if (stockErrors.length > 0) {
    const errorDetails = stockErrors.join('\n');
    throw new Error(
      `Stock insuffisant pour ${options.operationLabel ?? 'créer la vente'} :\n\n${errorDetails}\n\nVeuillez ajuster les quantités ou réapprovisionner le stock.`
    );
  }

  return lines.map((line) => {
    const product = products.find((item) => item.id === line.productId);

    if (!product) {
      throw new Error(`Produit introuvable pour la facture vente (ID: ${line.productId}).`);
    }

    const quantity = Number(line.quantity) || 0;
    return {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      quantity,
      unitPrice: Number(line.amount) || 0,
      totalPrice: quantity * (Number(line.amount) || 0),
    };
  });
}

async function adjustProductStocksFromLines(
  lines: Array<{ productId: number; quantity: number }>,
  direction: 1 | -1,
) {
  const quantityByProductId = quantityMapFromLines(lines);

  for (const [productId, quantity] of quantityByProductId) {
    const [product] = await db.select({ stock: products.stock })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      throw new Error(`Produit introuvable pour ajuster le stock (ID: ${productId}).`);
    }

    const nextStock = Math.max(0, (product.stock ?? 0) + (direction * quantity));
    await db.update(products)
      .set({ stock: nextStock })
      .where(eq(products.id, productId));
  }
}

function quantityMapFromLines(lines: Array<{ productId: number; quantity: number }>) {
  const quantityByProductId = new Map<number, number>();

  for (const line of lines) {
    quantityByProductId.set(
      line.productId,
      (quantityByProductId.get(line.productId) ?? 0) + (Number(line.quantity) || 0),
    );
  }

  return quantityByProductId;
}

function areQuantityMapsEqual(left: Map<number, number>, right: Map<number, number>) {
  if (left.size !== right.size) return false;

  for (const [productId, quantity] of left) {
    if (right.get(productId) !== quantity) return false;
  }

  return true;
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

  // Récupérer le préfixe des paramètres (ou utiliser la référence fournie)
  const appSettings = await getSettings();
  const prefix = appSettings.purchasePrefix || 'ACH';
  const finalReference = input.reference?.trim()
    ? input.reference
    : `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

  // Chercher le nom du fournisseur à partir de l'ID
  const supplierMatch = await db.select({ name: suppliers.name }).from(suppliers)
    .where(eq(suppliers.id, input.supplierId))
    .limit(1);
  const supplierName = supplierMatch.length > 0 ? supplierMatch[0].name : '';

  const result = await db.insert(purchaseInvoices).values({
    reference: finalReference,
    supplierId: input.supplierId,
    date: input.date,
    notes: input.notes,
    totalAmount,
    isPaid: input.isPaid ?? false,
  }).returning({ id: purchaseInvoices.id });

  const invoiceId = result[0].id;

  // Insérer les items
  await db.insert(purchaseInvoiceItems).values(
    items.map(item => ({
      invoiceId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalCost: item.totalCost,
    }))
  );

  // Mettre à jour le total des achats du fournisseur
  await recalculateSupplierTotalPurchases(input.supplierId);

  // Ajouter les mouvements de stock (entrée)
  for (const item of items) {
    await addStockMovement(item.productId, 'entry', item.quantity, {
      referenceType: 'purchase',
      referenceId: invoiceId,
      note: `Achat: ${input.reference}`,
    });
  }

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
  purchaseInvoiceId?: number | null;
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
  //       : "Payée";

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
  await assertPurchaseInvoiceExists(input.purchaseInvoiceId);

  const items = await buildSalesItems(input.lines);
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const remainingAmount = Math.max(totalAmount - input.amountPaid, 0);

  const paymentStatus: SalesInvoice["paymentStatus"] =
    input.amountPaid <= 0
      ? "En attente"
      : remainingAmount > 0
        ? "Partiel"
        : "Payée";

  // Récupérer le préfixe des paramètres
  const appSettings = await getSettings();
  const prefix = appSettings.invoicePrefix || 'FAC';

  // Compter les factures pour générer le numéro
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(salesInvoices);
  const invoiceCount = countResult[0]?.count || 0;
  const invoiceNumber = `${prefix}-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(6, "0")}`;

  const result = await db.insert(salesInvoices).values({
    invoiceNumber,
    purchaseInvoiceId: input.purchaseInvoiceId ?? null,
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
  await db.insert(salesInvoiceItems).values(
    items.map(item => ({
      invoiceId,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }))
  );

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

  // Ajouter les mouvements de stock (sortie)
  for (const item of items) {
    await addStockMovement(item.productId, 'exit', item.quantity, {
      referenceType: 'sale',
      referenceId: invoiceId,
      note: `Vente: ${invoiceNumber}`,
    });
  }

  return {
    id: invoiceId,
    invoiceNumber,
    purchaseInvoiceId: input.purchaseInvoiceId ?? null,
    purchaseInvoiceReference: null,
    purchaseInvoiceSupplierName: null,
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
      items: true,
    },
  });
  if (!result) return null;

  return {
    id: result.id,
    reference: result.reference,
    supplier: result.supplier?.name || '',
    supplierName: result.supplier?.name || '',
    date: result.date,
    notes: result.notes || "",
    items: (result.items || []).map(item => ({
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
    // Récupérer les anciens items pour recalculer le stock
    const oldItems = await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));
    const stockQuantityChanged = !areQuantityMapsEqual(
      quantityMapFromLines(oldItems),
      quantityMapFromLines(items),
    );

    if (stockQuantityChanged) {
      // Supprimer les anciens mouvements de stock
      await db.delete(stockMovements)
        .where(and(eq(stockMovements.referenceType, 'purchase'), eq(stockMovements.referenceId, id)));

      // Annuler l'impact stock de l'ancienne facture d'achat avant d'appliquer les nouvelles lignes.
      await adjustProductStocksFromLines(oldItems, -1);
    }

    // Supprimer les anciens items
    await db.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));

    // Insérer les nouveaux items
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

    if (stockQuantityChanged) {
      // Ajouter les nouveaux mouvements de stock
      for (const item of items) {
        await addStockMovement(item.productId, 'entry', item.quantity, {
          referenceType: 'purchase',
          referenceId: id,
          note: `Achat: ${existing[0].reference}`,
        });
      }
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

  // Récupérer les items pour annuler les mouvements de stock
  const items = await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));

  // Supprimer les mouvements de stock liés
  await db.delete(stockMovements)
    .where(and(eq(stockMovements.referenceType, 'purchase'), eq(stockMovements.referenceId, id)));

  // Annuler l'impact stock de la facture d'achat supprimée.
  await adjustProductStocksFromLines(items, -1);

  // Supprimer les items
  await db.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));
  // Conserver les ventes tout en retirant leur liaison documentaire.
  await db.update(salesInvoices)
    .set({ purchaseInvoiceId: null })
    .where(eq(salesInvoices.purchaseInvoiceId, id));
  // Supprimer la facture
  await db.delete(purchaseInvoices).where(eq(purchaseInvoices.id, id));

  // Mettre à jour le total des achats du fournisseur
  if (existing[0].supplierId) {
    await recalculateSupplierTotalPurchases(existing[0].supplierId);
  }

  return { success: true };
}

export async function getSalesInvoice(id: number) {
  // --- CODE SQL ---
  const inv = await db.query.salesInvoices.findFirst({
    where: eq(salesInvoices.id, id),
    with: {
      items: true,
      purchaseInvoice: { with: { supplier: true } },
    },
  });
  if (!inv) return null;

  const invoice = {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customerId: inv.customerId,
    purchaseInvoiceId: inv.purchaseInvoiceId,
    purchaseInvoiceReference: inv.purchaseInvoice?.reference ?? null,
    purchaseInvoiceSupplierName: inv.purchaseInvoice?.supplier?.name ?? null,
    customerName: inv.customerName,
    date: inv.date,
    paymentMethod: inv.paymentMethod || "Espèces",
    notes: inv.notes || "",
    items: (inv.items || []).map(item => ({
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
    paymentStatus: (inv.paymentStatus as "Payée" | "Partiel" | "En attente") || "En attente",
    createdAt: inv.createdAt?.toISOString() || "",
  };

  // Calculer le coût d'achat et le bénéfice par produit
  // (moyenne pondérée de tous les achats, indépendamment de la date)
  const productIds = invoice.items.map(item => item.productId);
  let costOfGoodsSold = 0;
  if (productIds.length > 0) {
    const purchaseItemsData = await db.select()
      .from(purchaseInvoiceItems)
      .where(inArray(purchaseInvoiceItems.productId, productIds));

    const avgCostPerProduct = new Map<number, { qty: number; cost: number }>();
    for (const item of purchaseItemsData) {
      if (item.unitCost > 0 && item.quantity > 0) {
        const existing = avgCostPerProduct.get(item.productId) ?? { qty: 0, cost: 0 };
        existing.qty += item.quantity;
        existing.cost += item.quantity * item.unitCost;
        avgCostPerProduct.set(item.productId, existing);
      }
    }

    for (const item of invoice.items) {
      const avg = avgCostPerProduct.get(item.productId);
      const unitCost = avg ? avg.cost / avg.qty : 0;
      costOfGoodsSold += unitCost * item.quantity;
    }
  }

  const grossProfit = invoice.totalAmount - costOfGoodsSold;

  return {
    ...invoice,
    costOfGoodsSold: roundAmount(costOfGoodsSold),
    grossProfit: roundAmount(grossProfit),
  };
}

export async function updateSalesInvoice(id: number, input: {
  purchaseInvoiceId?: number | null;
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
  //       : "Payée";

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

  await assertPurchaseInvoiceExists(input.purchaseInvoiceId);

  const oldSaleItems = await db.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, id));
  const oldQuantityByProductId = new Map<number, number>();
  for (const item of oldSaleItems) {
    oldQuantityByProductId.set(
      item.productId,
      (oldQuantityByProductId.get(item.productId) ?? 0) + item.quantity,
    );
  }

  const items = input.lines 
    ? await buildSalesItems(input.lines, {
        stockAllowanceByProductId: oldQuantityByProductId,
        operationLabel: 'modifier la vente',
      })
    : oldSaleItems;
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const amountPaid = input.amountPaid ?? existing[0]?.amountPaid ?? 0;
  const remainingAmount = Math.max(totalAmount - amountPaid, 0);

  const paymentStatus: SalesInvoice["paymentStatus"] =
    amountPaid <= 0
      ? "En attente"
      : remainingAmount > 0
        ? "Partiel"
        : "Payée";

  await db.update(salesInvoices).set({
    purchaseInvoiceId: input.purchaseInvoiceId,
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
    const stockQuantityChanged = !areQuantityMapsEqual(
      quantityMapFromLines(oldSaleItems),
      quantityMapFromLines(items),
    );

    if (stockQuantityChanged) {
      // Supprimer les anciens mouvements de stock
      await db.delete(stockMovements)
        .where(and(eq(stockMovements.referenceType, 'sale'), eq(stockMovements.referenceId, id)));

      // Annuler l'impact stock de l'ancienne vente avant d'appliquer les nouvelles sorties.
      await adjustProductStocksFromLines(oldSaleItems, 1);
    }

    // Supprimer les anciens items
    await db.delete(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, id));

    // Insérer les nouveaux items
    await db.insert(salesInvoiceItems).values(
      items.map(item => ({
        invoiceId: id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }))
    );

    if (stockQuantityChanged) {
      // Ajouter les nouveaux mouvements de stock (sortie)
      for (const item of items) {
        await addStockMovement(item.productId, 'exit', item.quantity, {
          referenceType: 'sale',
          referenceId: id,
          note: `Vente: ${existing[0].invoiceNumber}`,
        });
      }
    }

  }

  return {
    id,
    invoiceNumber: existing[0].invoiceNumber,
    purchaseInvoiceId: input.purchaseInvoiceId !== undefined
      ? input.purchaseInvoiceId
      : existing[0].purchaseInvoiceId,
    purchaseInvoiceReference: null,
    purchaseInvoiceSupplierName: null,
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

  // Récupérer les items pour annuler les mouvements de stock
  const saleItems = await db.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, id));

  // Supprimer les mouvements de stock liés
  await db.delete(stockMovements)
    .where(and(eq(stockMovements.referenceType, 'sale'), eq(stockMovements.referenceId, id)));

  // Annuler l'impact stock de la vente supprimée.
  await adjustProductStocksFromLines(saleItems, 1);

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

// --- CODE JSON (commenté - utilisation SQLite) ---

type ReportProduct = Awaited<ReturnType<typeof listProducts>>[number];

function normalizeReportFilters(fromOrFilters?: string | RapportFilters, to?: string): RapportFilters {
  if (typeof fromOrFilters === 'object' && fromOrFilters !== null) {
    return fromOrFilters;
  }

  return {
    from: fromOrFilters,
    to,
  };
}

function calculatePaymentStatusFromAmounts(
  totalAmount: number,
  amountPaid: number,
): SalesInvoice['paymentStatus'] {
  const remainingAmount = Math.max(totalAmount - amountPaid, 0);

  if (amountPaid <= 0) return 'En attente';
  if (remainingAmount > 0) return 'Partiel';
  return 'Payée';
}

function matchesSalesPaymentStatus(invoice: SalesInvoice, status?: RapportPaymentStatus) {
  if (!status || status === 'all') return true;
  if (status === 'paid') return invoice.paymentStatus === 'Payée';
  if (status === 'partial') return invoice.paymentStatus === 'Partiel';
  if (status === 'pending') return invoice.paymentStatus === 'En attente';
  if (status === 'unpaid') return invoice.remainingAmount > 0;
  return true;
}

function matchesPurchasePaymentStatus(invoice: PurchaseInvoice, status?: RapportPaymentStatus) {
  if (!status || status === 'all') return true;
  if (status === 'paid') return invoice.isPaid;
  if (status === 'partial') return false;
  if (status === 'pending' || status === 'unpaid') return !invoice.isPaid;
  return true;
}

function applySalesReportFilters(sales: SalesInvoice[], filters: RapportFilters) {
  const productId = filters.productId;

  return sales
    .filter((invoice) => !filters.customerId || invoice.customerId === filters.customerId)
    .filter((invoice) => matchesSalesPaymentStatus(invoice, filters.paymentStatus))
    .map((invoice) => {
      if (!productId) return invoice;

      const items = invoice.items.filter((item) => item.productId === productId);
      const totalAmount = roundAmount(items.reduce((sum, item) => sum + item.totalPrice, 0));
      const ratio = invoice.totalAmount > 0 ? totalAmount / invoice.totalAmount : 0;
      const amountPaid = roundAmount(Math.min(totalAmount, invoice.amountPaid * ratio));
      const remainingAmount = roundAmount(Math.max(totalAmount - amountPaid, 0));

      return {
        ...invoice,
        items,
        totalAmount,
        amountPaid,
        remainingAmount,
        paymentStatus: calculatePaymentStatusFromAmounts(totalAmount, amountPaid),
      };
    })
    .filter((invoice) => !productId || invoice.items.length > 0);
}

function applyPurchaseReportFilters(purchases: PurchaseInvoice[], filters: RapportFilters) {
  const productId = filters.productId;

  return purchases
    .filter((invoice) => !filters.supplierId || invoice.supplierId === filters.supplierId)
    .filter((invoice) => matchesPurchasePaymentStatus(invoice, filters.paymentStatus))
    .map((invoice) => {
      if (!productId) return invoice;

      const items = invoice.items.filter((item) => item.productId === productId);
      const totalAmount = roundAmount(items.reduce((sum, item) => sum + item.totalCost, 0));

      return {
        ...invoice,
        items,
        totalAmount,
      };
    })
    .filter((invoice) => !productId || invoice.items.length > 0);
}

function getPercentageChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return roundAmount(((current - previous) / Math.abs(previous)) * 100);
}

function buildMetricSnapshot(report: Omit<RapportData, 'comparison'>): RapportMetricSnapshot {
  return {
    totalPurchases: report.summary.totalPurchases,
    totalSales: report.summary.totalSales,
    grossProfit: report.summary.grossProfit,
    totalBottlesSold: report.summary.totalBottlesSold,
    totalReceivables: report.summary.totalReceivables,
    totalPayables: report.summary.totalPayables,
  };
}

function buildReportCore(
  purchases: PurchaseInvoice[],
  sales: SalesInvoice[],
  productsList: ReportProduct[],
  filters: RapportFilters,
): Omit<RapportData, 'comparison'> {
  const { salesWithProfit, totalGrossProfit, monthlyProfit } = calculateSalesProfitMetrics(purchases, sales);
  const totalPurchases = roundAmount(purchases.reduce((sum, inv) => sum + inv.totalAmount, 0));
  const totalSales = roundAmount(salesWithProfit.reduce((sum, inv) => sum + inv.totalAmount, 0));
  const grossProfit = roundAmount(totalGrossProfit);
  const grossMarginRate = totalSales > 0 ? roundAmount((grossProfit / totalSales) * 100) : 0;

  const productMap = new Map(productsList.map((product) => [product.id, product]));
  const averageCostByProductId = new Map<number, { quantity: number; cost: number }>();

  for (const invoice of purchases) {
    for (const item of invoice.items) {
      const existing = averageCostByProductId.get(item.productId) ?? { quantity: 0, cost: 0 };
      existing.quantity += item.quantity;
      existing.cost += item.totalCost;
      averageCostByProductId.set(item.productId, existing);
    }
  }

  const productMarginsById = new Map<number, RapportData['productMargins'][number]>();

  for (const invoice of salesWithProfit) {
    for (const item of invoice.items) {
      const averageCost = averageCostByProductId.get(item.productId);
      const unitCost = averageCost && averageCost.quantity > 0 ? averageCost.cost / averageCost.quantity : 0;
      const estimatedCost = unitCost * item.quantity;
      const product = productMap.get(item.productId);
      const existing = productMarginsById.get(item.productId);
      const revenue = (existing?.revenue ?? 0) + item.totalPrice;
      const cost = (existing?.estimatedCost ?? 0) + estimatedCost;
      const profit = revenue - cost;

      productMarginsById.set(item.productId, {
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: (existing?.quantity ?? 0) + item.quantity,
        revenue: roundAmount(revenue),
        estimatedCost: roundAmount(cost),
        grossProfit: roundAmount(profit),
        marginRate: revenue > 0 ? roundAmount((profit / revenue) * 100) : 0,
        stock: product?.stock ?? 0,
        stockMin: product?.stockMin ?? 0,
      });
    }
  }

  const productMargins = Array.from(productMarginsById.values())
    .sort((a, b) => b.revenue - a.revenue);

  const soldByProduct = productMargins.map((product) => ({
    productCode: product.productCode,
    productName: product.productName,
    quantity: product.quantity,
    revenue: product.revenue,
  }));

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

  const customersRevenue = salesWithProfit.reduce<
    Record<string, { customerId: number | null; name: string; totalSpent: number; invoiceCount: number; remainingAmount: number }>
  >((acc, inv) => {
    const key = inv.customerId ? String(inv.customerId) : `name:${inv.customerName}`;
    const existing = acc[key];
    acc[key] = {
      customerId: inv.customerId,
      name: inv.customerName,
      totalSpent: roundAmount((existing?.totalSpent ?? 0) + inv.totalAmount),
      invoiceCount: (existing?.invoiceCount ?? 0) + 1,
      remainingAmount: roundAmount((existing?.remainingAmount ?? 0) + inv.remainingAmount),
    };
    return acc;
  }, {});

  const receivablesByCustomer = salesWithProfit
    .filter((invoice) => invoice.remainingAmount > 0)
    .reduce<
      Record<string, RapportData['receivables'][number]>
    >((acc, inv) => {
      const key = inv.customerId ? String(inv.customerId) : `name:${inv.customerName}`;
      const existing = acc[key];

      acc[key] = {
        customerId: inv.customerId,
        customerName: inv.customerName,
        invoiceCount: (existing?.invoiceCount ?? 0) + 1,
        totalAmount: roundAmount((existing?.totalAmount ?? 0) + inv.totalAmount),
        amountPaid: roundAmount((existing?.amountPaid ?? 0) + inv.amountPaid),
        remainingAmount: roundAmount((existing?.remainingAmount ?? 0) + inv.remainingAmount),
        lastInvoiceDate: !existing || inv.date > existing.lastInvoiceDate ? inv.date : existing.lastInvoiceDate,
      };

      return acc;
    }, {});

  const payablesBySupplier = purchases
    .filter((invoice) => !invoice.isPaid)
    .reduce<
      Record<string, RapportData['payables'][number]>
    >((acc, inv) => {
      const key = inv.supplierId ? String(inv.supplierId) : `name:${inv.supplier}`;
      const existing = acc[key];

      acc[key] = {
        supplierId: inv.supplierId ?? null,
        supplierName: inv.supplier || 'Fournisseur inconnu',
        invoiceCount: (existing?.invoiceCount ?? 0) + 1,
        totalAmount: roundAmount((existing?.totalAmount ?? 0) + inv.totalAmount),
        lastInvoiceDate: !existing || inv.date > existing.lastInvoiceDate ? inv.date : existing.lastInvoiceDate,
      };

      return acc;
    }, {});

  const receivables = Object.values(receivablesByCustomer).sort((a, b) => b.remainingAmount - a.remainingAmount);
  const payables = Object.values(payablesBySupplier).sort((a, b) => b.totalAmount - a.totalAmount);
  const totalReceivables = roundAmount(receivables.reduce((sum, item) => sum + item.remainingAmount, 0));
  const totalPayables = roundAmount(payables.reduce((sum, item) => sum + item.totalAmount, 0));

  const activeProducts = productsList.filter((product) =>
    (filters.productId ? product.id === filters.productId : true) && product.isActive !== false
  );
  const soldQuantityByProductId = new Map<number, number>();
  for (const invoice of salesWithProfit) {
    for (const item of invoice.items) {
      soldQuantityByProductId.set(
        item.productId,
        (soldQuantityByProductId.get(item.productId) ?? 0) + item.quantity,
      );
    }
  }

  const fastestMovingProducts = Array.from(soldQuantityByProductId.entries())
    .map(([productId, quantity]) => {
      const product = productMap.get(productId);
      return product ? {
        productId,
        productCode: product.code,
        productName: product.name,
        quantity,
        stock: product.stock,
      } : null;
    })
    .filter((product): product is NonNullable<typeof product> => product !== null)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const slowMovingProducts = activeProducts
    .filter((product) => (product.stock ?? 0) > 0 && (soldQuantityByProductId.get(product.id) ?? 0) === 0)
    .map((product) => ({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      stock: product.stock ?? 0,
      stockValue: roundAmount((product.stock ?? 0) * product.unitPrice),
    }))
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 5);

  const reorderSuggestions = activeProducts
    .filter((product) => (product.stockMin ?? 0) > 0 && (product.stock ?? 0) <= (product.stockMin ?? 0))
    .map((product) => ({
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      stock: product.stock ?? 0,
      stockMin: product.stockMin ?? 0,
      suggestedOrder: Math.max((product.stockMin ?? 0) * 2 - (product.stock ?? 0), product.stockMin ?? 0),
    }))
    .sort((a, b) => b.suggestedOrder - a.suggestedOrder);

  const totalBottlesSold = salesWithProfit.reduce((sum, inv) =>
    sum + inv.items.reduce((s, item) => s + item.quantity, 0), 0
  );
  const averageBasket = salesWithProfit.length > 0 ? totalSales / salesWithProfit.length : 0;
  const topCustomers = Object.values(customersRevenue)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  const bestProduct = productMargins[0]
    ? {
        productCode: productMargins[0].productCode,
        productName: productMargins[0].productName,
        revenue: productMargins[0].revenue,
        quantity: productMargins[0].quantity,
      }
    : null;
  const bestCustomer = topCustomers[0]
    ? { name: topCustomers[0].name, totalSpent: topCustomers[0].totalSpent }
    : null;

  return {
    summary: {
      totalPurchases,
      totalSales,
      grossProfit,
      grossMarginRate,
      totalBottlesSold,
      averageBasket: roundAmount(averageBasket),
      totalPurchaseInvoices: purchases.length,
      totalSalesInvoices: salesWithProfit.length,
      totalCustomers: Object.keys(customersRevenue).length,
      totalReceivables,
      totalPayables,
    },
    monthlyData: Object.entries(months).map(([month, data]) => ({
      month,
      purchases: roundAmount(data.purchases),
      sales: roundAmount(data.sales),
      profit: roundAmount(monthlyProfit.get(month) ?? 0),
    })),
    soldByProduct,
    productMargins,
    topCustomers,
    receivables,
    payables,
    stockInsights: {
      totalStock: activeProducts.reduce((sum, product) => sum + (product.stock ?? 0), 0),
      totalStockValue: roundAmount(activeProducts.reduce((sum, product) => sum + ((product.stock ?? 0) * product.unitPrice), 0)),
      totalSaleValue: roundAmount(activeProducts.reduce((sum, product) => sum + ((product.stock ?? 0) * product.salePrice), 0)),
      lowStockCount: activeProducts.filter((product) => (product.stockMin ?? 0) > 0 && (product.stock ?? 0) <= (product.stockMin ?? 0)).length,
      outOfStockCount: activeProducts.filter((product) => (product.stock ?? 0) === 0).length,
      fastestMovingProducts,
      slowMovingProducts,
      reorderSuggestions,
    },
    decisionSummary: {
      bestProduct,
      bestCustomer,
      totalReceivables,
      totalPayables,
      lowStockCount: reorderSuggestions.length,
      grossMarginRate,
    },
  };
}

export async function getRapportData(from?: string, to?: string): Promise<RapportData>;
export async function getRapportData(filters?: RapportFilters): Promise<RapportData>;
export async function getRapportData(fromOrFilters?: string | RapportFilters, to?: string): Promise<RapportData> {
  const filters = normalizeReportFilters(fromOrFilters, to);
  const [purchases, sales] = await Promise.all([
    listPurchaseInvoices(filters.from, filters.to),
    listSalesInvoices(filters.from, filters.to),
  ]);

  const [productsList] = await Promise.all([
    listProducts(true),
  ]);

  const filteredPurchases = applyPurchaseReportFilters(purchases, filters);
  const filteredSales = applySalesReportFilters(sales, filters);
  const report = buildReportCore(filteredPurchases, filteredSales, productsList, filters);

  let comparison: RapportData['comparison'] = null;
  if (filters.previousFrom || filters.previousTo) {
    const [previousPurchases, previousSales] = await Promise.all([
      listPurchaseInvoices(filters.previousFrom, filters.previousTo),
      listSalesInvoices(filters.previousFrom, filters.previousTo),
    ]);

    const previousReport = buildReportCore(
      applyPurchaseReportFilters(previousPurchases, filters),
      applySalesReportFilters(previousSales, filters),
      productsList,
      filters,
    );
    const current = buildMetricSnapshot(report);
    const previous = buildMetricSnapshot(previousReport);

    comparison = {
      previousFrom: filters.previousFrom,
      previousTo: filters.previousTo,
      current,
      previous,
      changes: {
        totalPurchases: getPercentageChange(current.totalPurchases, previous.totalPurchases),
        totalSales: getPercentageChange(current.totalSales, previous.totalSales),
        grossProfit: getPercentageChange(current.grossProfit, previous.grossProfit),
        totalBottlesSold: getPercentageChange(current.totalBottlesSold, previous.totalBottlesSold),
        totalReceivables: getPercentageChange(current.totalReceivables, previous.totalReceivables),
        totalPayables: getPercentageChange(current.totalPayables, previous.totalPayables),
      },
    };
  }

  return {
    ...report,
    comparison,
  };
}

// Settings Management
export type Settings = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  invoicePrefix: string;
  purchasePrefix: string;
  theme: 'light' | 'dark';
  primaryColor: string;
  sidebarColor: string;
};

const defaultSettings: Settings = {
  companyName: 'Mini-Centre Distribution',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  currency: 'GNF',
  currencySymbol: 'GNF',
  dateFormat: 'DD/MM/YYYY',
  invoicePrefix: 'FAC',
  purchasePrefix: 'ACH',
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
      currency: r.currency || 'GNF',
      currencySymbol: r.currencySymbol || 'GNF',
      dateFormat: r.dateFormat || 'DD/MM/YYYY',
      invoicePrefix: r.invoicePrefix || 'FAC',
      purchasePrefix: r.purchasePrefix || 'ACH',
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
    currency: s.currency || 'GNF',
    currencySymbol: s.currencySymbol || 'GNF',
    dateFormat: s.dateFormat || 'DD/MM/YYYY',
    invoicePrefix: s.invoicePrefix || 'FAC',
    purchasePrefix: s.purchasePrefix || 'ACH',
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
  if (updates.currency !== undefined) updatesFiltered.currency = updates.currency;
  if (updates.currencySymbol !== undefined) updatesFiltered.currencySymbol = updates.currencySymbol;
  if (updates.dateFormat !== undefined) updatesFiltered.dateFormat = updates.dateFormat;
  if (updates.invoicePrefix !== undefined) updatesFiltered.invoicePrefix = updates.invoicePrefix;
  if (updates.purchasePrefix !== undefined) updatesFiltered.purchasePrefix = updates.purchasePrefix;
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
    currency: s.currency || 'GNF',
    currencySymbol: s.currencySymbol || 'GNF',
    dateFormat: s.dateFormat || 'DD/MM/YYYY',
    invoicePrefix: s.invoicePrefix || 'FAC',
    purchasePrefix: s.purchasePrefix || 'ACH',
    theme: (s.theme || 'light') as 'light' | 'dark',
    primaryColor: s.primaryColor || '#1e40af',
    sidebarColor: s.sidebarColor || '#1e293b',
  };
}

export async function resetDatabaseExceptProtectedTables() {
  await withRawTransaction(async (client) => {
    // Supprimer les items des factures
    await rawRun('DELETE FROM purchase_invoice_items', [], client);
    await rawRun('DELETE FROM sales_invoice_items', [], client);
    // Supprimer les factures
    await rawRun('DELETE FROM purchase_invoices', [], client);
    await rawRun('DELETE FROM sales_invoices', [], client);
    // Supprimer les fournisseurs
    await rawRun('DELETE FROM suppliers', [], client);
    // Supprimer les clients et leurs types (clients d'abord à cause de FK)
    await rawRun('DELETE FROM customers', [], client);
    await rawRun('DELETE FROM customer_types', [], client);
    // Supprimer les mouvements de stock tout en conservant les produits.
    await rawRun('DELETE FROM stock_movements', [], client);
    // Supprimer toutes les transactions du portefeuille.
    await rawRun('DELETE FROM wallet_transactions', [], client);
    // Réinitialiser uniquement les séquences des tables vidées.
    await rawRun("DELETE FROM sqlite_sequence WHERE name IN ('customers', 'customer_types', 'purchase_invoices', 'purchase_invoice_items', 'sales_invoices', 'sales_invoice_items', 'suppliers', 'stock_movements', 'wallet_transactions')", [], client);
    // Supprimer les paramètres
    await rawRun('DELETE FROM settings', [], client);

    // Réinsérer les settings par défaut
    await rawRun(`INSERT INTO settings (company_name, company_address, company_phone, company_email, currency, currency_symbol, date_format, invoice_prefix, purchase_prefix, theme, primary_color, sidebar_color)
      VALUES ('Mini-Centre Distribution', '', '', '', 'GNF', 'GNF', 'DD/MM/YYYY', 'FAC', 'ACH', 'light', '#1e40af', '#1e293b')`, [], client);
  });

  return { success: true };
}

export const resetDatabaseExceptProductsAndCustomers = resetDatabaseExceptProtectedTables;

// ─── Wallet (Portefeuille) ─────────────────────────────────────────

export async function listWalletTransactions({
  page = 1,
  limit = 15,
  search,
  type,
  from,
  to,
}: {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'income' | 'expense';
  from?: string;
  to?: string;
} = {}) {
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const filterArgs: Array<string | number> = [];

  if (search) {
    conditions.push('description LIKE ?');
    filterArgs.push(`%${search}%`);
  }
  if (type) {
    conditions.push('type = ?');
    filterArgs.push(type);
  }
  if (from) {
    conditions.push('created_at >= ?');
    filterArgs.push(getWalletDateBoundaryTimestamp(from, 'start'));
  }
  if (to) {
    conditions.push('created_at <= ?');
    filterArgs.push(getWalletDateBoundaryTimestamp(to, 'end'));
  }
  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [data, totalResult] = await Promise.all([
    rawAll<{
      id: number;
      amount: number;
      type: 'income' | 'expense';
      description: string | null;
      balance_after: number;
      created_at: number;
      updated_at: number;
    }>(`
      WITH ledger AS (
        SELECT
          id,
          amount,
          type,
          description,
          created_at,
          updated_at,
          SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) OVER (
            ORDER BY created_at ASC, id ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS balance_after
        FROM wallet_transactions
      )
      SELECT id, amount, type, description, balance_after, created_at, updated_at
      FROM ledger
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `, [...filterArgs, limit, offset]),
    rawGet<{ count: number }>(
      `SELECT COUNT(*) as count FROM wallet_transactions ${whereSql}`,
      filterArgs,
    ),
  ]);

  const total = Number(totalResult?.count ?? 0);
  return {
    data: data.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      balanceAfter: tx.balance_after,
      createdAt: new Date(tx.created_at * 1000),
      updatedAt: new Date(tx.updated_at * 1000),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getWalletTransaction(id: number) {
  const tx = await findWalletTransactionById(id);
  if (!tx) return null;
  return tx;
}

function parseWalletDate(date?: string, timeSource = new Date()) {
  if (!date) return Math.floor(timeSource.getTime() / 1000);

  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error('Date invalide');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(
    year,
    month - 1,
    day,
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds(),
  );

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error('Date invalide');
  }

  return Math.floor(parsed.getTime() / 1000);
}

function getWalletDateBoundaryTimestamp(date: string, boundary: 'start' | 'end') {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error('Date invalide');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(
    year,
    month - 1,
    day,
    boundary === 'start' ? 0 : 23,
    boundary === 'start' ? 0 : 59,
    boundary === 'start' ? 0 : 59,
    boundary === 'start' ? 0 : 999,
  );

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error('Date invalide');
  }

  return Math.floor(parsed.getTime() / 1000);
}

export async function createWalletTransaction(data: {
  amount: number;
  type: 'income' | 'expense';
  description?: string;
  date?: string;
}) {
  return withRawTransaction(async (client) => {
    const nowDate = new Date();
    const now = Math.floor(nowDate.getTime() / 1000);
    const createdAt = parseWalletDate(data.date, nowDate);
    const result = await rawRun(`
      INSERT INTO wallet_transactions (amount, type, description, balance_after, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [data.amount, data.type, data.description || null, 0, createdAt, now], client);

    await recalculateWalletBalances(client);

    const created = await rawGet<any>(
      'SELECT * FROM wallet_transactions WHERE id = ?',
      [Number(result.lastInsertRowid)],
      client,
    );

    return {
      id: created.id,
      amount: created.amount,
      type: created.type,
      description: created.description,
      balanceAfter: created.balance_after,
      createdAt: new Date((created.created_at as number) * 1000),
      updatedAt: new Date((created.updated_at as number) * 1000),
    };
  });
}

export async function updateWalletTransaction(
  id: number,
  data: { amount?: number; type?: 'income' | 'expense'; description?: string; date?: string }
) {
  const existing = await findWalletTransactionById(id);
  if (!existing) throw new Error('Transaction introuvable');

  return withRawTransaction(async (client) => {
    const now = Math.floor(Date.now() / 1000);
    const amount = data.amount ?? existing.amount;
    const type = data.type ?? existing.type;
    const description = data.description !== undefined ? data.description : existing.description;
    const existingCreatedAt = existing.createdAt ?? new Date();
    const createdAt = data.date !== undefined
      ? parseWalletDate(data.date, existingCreatedAt)
      : Math.floor(existingCreatedAt.getTime() / 1000);

    // Mettre à jour la transaction
    await rawRun(`
      UPDATE wallet_transactions
      SET amount = ?, type = ?, description = ?, created_at = ?, updated_at = ?
      WHERE id = ?
    `, [amount, type, description, createdAt, now, id], client);

    await recalculateWalletBalances(client);

    // Retourner la transaction mise à jour
    const updated = await rawGet<any>('SELECT * FROM wallet_transactions WHERE id = ?', [id], client);
    return {
      id: updated.id,
      amount: updated.amount,
      type: updated.type,
      description: updated.description,
      balanceAfter: updated.balance_after,
      createdAt: new Date((updated.created_at as number) * 1000),
      updatedAt: new Date((updated.updated_at as number) * 1000),
    };
  });
}

export async function deleteWalletTransaction(id: number) {
  const existing = await findWalletTransactionById(id);
  if (!existing) throw new Error('Transaction introuvable');

  await withRawTransaction(async (client) => {
    await rawRun('DELETE FROM wallet_transactions WHERE id = ?', [id], client);
    await recalculateWalletBalances(client);
  });
}

async function recalculateWalletBalances(
  client: Parameters<typeof rawRun>[2],
) {
  let currentBalance = 0;

  const txs = await rawAll<{ id: number; amount: number; type: string }>(
    'SELECT id, amount, type FROM wallet_transactions ORDER BY created_at ASC, id ASC',
    [],
    client,
  );

  for (const tx of txs) {
    currentBalance = tx.type === 'income'
      ? currentBalance + tx.amount
      : currentBalance - tx.amount;

    await rawRun('UPDATE wallet_transactions SET balance_after = ? WHERE id = ?', [currentBalance, tx.id], client);
  }
}

export async function getWalletSummary({
  from,
  to,
}: {
  from?: string;
  to?: string;
} = {}) {
  const conditions: string[] = [];
  const filterArgs: Array<string | number> = [];

  if (from) {
    conditions.push('created_at >= ?');
    filterArgs.push(getWalletDateBoundaryTimestamp(from, 'start'));
  }
  if (to) {
    conditions.push('created_at <= ?');
    filterArgs.push(getWalletDateBoundaryTimestamp(to, 'end'));
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const stats = await rawGet<{
    current_balance: number;
    total_income: number;
    total_expense: number;
    transactions_count: number;
  }>(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as current_balance,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense,
      COUNT(*) as transactions_count
    FROM wallet_transactions
    ${whereSql}
  `, filterArgs);

  return {
    currentBalance: stats?.current_balance ?? 0,
    totalIncome: stats?.total_income ?? 0,
    totalExpense: stats?.total_expense ?? 0,
    transactionsCount: stats?.transactions_count ?? 0,
  };
}
