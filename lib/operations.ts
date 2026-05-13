import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../db/index";
import { 
  products, 
  purchaseInvoices, 
  purchaseInvoiceItems,
  salesInvoices,
  salesInvoiceItems,
  stock,
  stockMovements,
  settings
} from "../db/schema";
import { eq, desc, asc, like, sql, and, or } from "drizzle-orm";
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
};

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

export async function listPurchaseInvoices() {
  // --- CODE JSON (commenté) ---
  // const invoices = await readJsonFile<PurchaseInvoice[]>(purchasesFile);
  // return invoices.sort((a, b) => b.date.localeCompare(a.date));

  // --- CODE SQL ---
  const invoices = await db.select().from(purchaseInvoices).orderBy(desc(purchaseInvoices.date));
  
  const invoicesWithItems: PurchaseInvoice[] = await Promise.all(
    invoices.map(async (inv) => {
      const items = await db.select()
        .from(purchaseInvoiceItems)
        .where(eq(purchaseInvoiceItems.invoiceId, inv.id));
      
      return {
        id: inv.id,
        reference: inv.reference,
        supplier: inv.supplier,
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

export async function listSalesInvoices() {
  // --- CODE JSON (commenté) ---
  // const invoices = await readJsonFile<SalesInvoice[]>(salesFile);
  // return invoices.sort((a, b) => b.date.localeCompare(a.date));

  // --- CODE SQL ---
  const invoices = await db.select().from(salesInvoices).orderBy(desc(salesInvoices.date));
  
  const invoicesWithItems: SalesInvoice[] = await Promise.all(
    invoices.map(async (inv) => {
      const items = await db.select()
        .from(salesInvoiceItems)
        .where(eq(salesInvoiceItems.invoiceId, inv.id));
      
      return {
        id: inv.id,
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
  supplier: string;
  date: string;
  notes: string;
  lines: LineInput[];
  isPaid?: boolean;
}) {
  // --- CODE JSON (commenté) ---
  // const invoices = await listPurchaseInvoices();
  // const items = await buildPurchaseItems(input.lines);
  // const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

  // const invoice: PurchaseInvoice = {
  //   id: invoices.reduce((max, item) => Math.max(max, item.id), 0) + 1,
  //   reference: input.reference,
  //   supplier: input.supplier,
  //   date: input.date,
  //   notes: input.notes,
  //   items,
  //   totalAmount,
  //   isPaid: input.isPaid ?? false,
  //   createdAt: new Date().toISOString(),
  // };

  // await writeJsonFile(purchasesFile, [invoice, ...invoices]);
  // return invoice;

  // --- CODE SQL ---
  const items = await buildPurchaseItems(input.lines);
  const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

  const result = await db.insert(purchaseInvoices).values({
    reference: input.reference,
    supplier: input.supplier,
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

  return {
    id: invoiceId,
    reference: input.reference,
    supplier: input.supplier,
    date: input.date,
    notes: input.notes,
    items,
    totalAmount,
    isPaid: input.isPaid ?? false,
    createdAt: new Date().toISOString(),
  };
}

export async function createSalesInvoice(input: {
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
  // --- CODE JSON (commenté) ---
  // const invoices = await listPurchaseInvoices();
  // return invoices.find((invoice) => invoice.id === id) || null;

  // --- CODE SQL ---
  const invoices = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
  if (invoices.length === 0) return null;
  
  const inv = invoices[0];
  const items = await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));
  
  return {
    id: inv.id,
    reference: inv.reference,
    supplier: inv.supplier,
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
    totalAmount: inv.totalAmount,
    isPaid: inv.isPaid,
    createdAt: inv.createdAt?.toISOString() || "",
  };
}

export async function updatePurchaseInvoice(id: number, input: {
  reference?: string;
  supplier?: string;
  date?: string;
  notes?: string;
  lines?: LineInput[];
  isPaid?: boolean;
}) {
  // --- CODE JSON (commenté) ---
  // const invoices = await listPurchaseInvoices();
  // const index = invoices.findIndex((invoice) => invoice.id === id);
  
  // if (index === -1) {
  //   throw new Error('Invoice not found');
  // }

  // const existingInvoice = invoices[index];
  // const items = input.lines 
  //   ? await buildPurchaseItems(input.lines)
  //   : existingInvoice.items;
  // const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

  // const updatedInvoice: PurchaseInvoice = {
  //   ...existingInvoice,
  //   reference: input.reference ?? existingInvoice.reference,
  //   supplier: input.supplier ?? existingInvoice.supplier,
  //   date: input.date ?? existingInvoice.date,
  //   notes: input.notes ?? existingInvoice.notes,
  //   items,
  //   totalAmount,
  //   isPaid: input.isPaid ?? existingInvoice.isPaid,
  // };

  // invoices[index] = updatedInvoice;
  // await writeJsonFile(purchasesFile, invoices);
  // return updatedInvoice;

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

  // Mettre à jour la facture
  await db.update(purchaseInvoices).set({
    reference: input.reference,
    supplier: input.supplier,
    date: input.date,
    notes: input.notes,
    totalAmount,
    isPaid: input.isPaid,
  }).where(eq(purchaseInvoices.id, id));

  // Si nouvelles lignes, supprimer les anciennes et insérer les nouvelles
  if (input.lines) {
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

  return {
    id,
    reference: input.reference ?? existing[0].reference,
    supplier: input.supplier ?? existing[0].supplier,
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
  
  return {
    id: inv.id,
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
    totalAmount: inv.totalAmount,
    amountPaid: inv.amountPaid,
    remainingAmount: inv.remainingAmount,
    paymentStatus: inv.paymentStatus as "Paye" | "Partiel" | "En attente",
    createdAt: inv.createdAt?.toISOString() || "",
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
  const totalSales = sales.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const grossProfit = totalSales - totalPurchases;

  const soldByProduct = sales.flatMap((invoice) => invoice.items).reduce<
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
    sales,
    totalPurchases,
    totalSales,
    grossProfit,
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
  const existingStock = await db.select().from(stock).where(eq(stock.productId, input.productId));
  if (existingStock.length === 0) {
    throw new Error('Product not found in stock');
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

export async function getRapportData() {
  const [purchases, sales, stock] = await Promise.all([
    listPurchaseInvoices(),
    listSalesInvoices(),
    getStock(),
  ]);

  const totalPurchases = purchases.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalSales = sales.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const grossProfit = totalSales - totalPurchases;

  // Sales by product
  const soldByProduct = sales.flatMap((inv) => inv.items).reduce<
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

  sales.forEach((inv) => {
    const date = new Date(inv.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (months[key]) {
      months[key].sales += inv.totalAmount;
    }
  });

  // Top customers by revenue
  const customersRevenue = sales.reduce<
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
  const totalBottlesSold = sales.reduce((sum, inv) => 
    sum + inv.items.reduce((s, item) => s + item.quantity, 0), 0
  );
  const averageBasket = sales.length > 0 ? totalSales / sales.length : 0;
  const totalBottlesInStock = stock.reduce((sum, s) => sum + (s.currentStock ?? 0), 0);

  return {
    summary: {
      totalPurchases,
      totalSales,
      grossProfit,
      totalBottlesSold,
      averageBasket,
      totalBottlesInStock,
      totalInvoices: purchases.length + sales.length,
      totalCustomers: Object.keys(customersRevenue).length,
    },
    monthlyData: Object.entries(months).map(([month, data]) => ({
      month,
      ...data,
      profit: data.sales - data.purchases,
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
  // --- CODE JSON (commenté) ---
  // return readSettingsFile();

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
  };
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  // --- CODE JSON (commenté) ---
  // const currentSettings = await readSettingsFile();
  // const updatedSettings = { ...currentSettings, ...updates };
  // await writeSettingsFile(updatedSettings);
  // return updatedSettings;

  // --- CODE SQL ---
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
  };
}
