import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

const dataDirectory = path.join(process.cwd(), "data");
const purchasesFile = path.join(dataDirectory, "purchase-invoices.json");
const salesFile = path.join(dataDirectory, "sales-invoices.json");

async function ensureFile(filePath: string) {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]", "utf8");
  }
}

async function readJsonFile<T>(filePath: string) {
  await ensureFile(filePath);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function writeJsonFile(filePath: string, value: unknown) {
  await ensureFile(filePath);
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

export async function listPurchaseInvoices() {
  const invoices = await readJsonFile<PurchaseInvoice[]>(purchasesFile);
  return invoices.sort((a, b) => b.date.localeCompare(a.date));
}

export async function listSalesInvoices() {
  const invoices = await readJsonFile<SalesInvoice[]>(salesFile);
  return invoices.sort((a, b) => b.date.localeCompare(a.date));
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
      quantity: line.quantity,
      unitCost: line.amount,
      totalCost: line.quantity * line.amount,
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
      quantity: line.quantity,
      unitPrice: line.amount,
      totalPrice: line.quantity * line.amount,
    };
  });
}

export async function createPurchaseInvoice(input: {
  reference: string;
  supplier: string;
  date: string;
  notes: string;
  lines: LineInput[];
}) {
  const invoices = await listPurchaseInvoices();
  const items = await buildPurchaseItems(input.lines);
  const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

  const invoice: PurchaseInvoice = {
    id: invoices.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    reference: input.reference,
    supplier: input.supplier,
    date: input.date,
    notes: input.notes,
    items,
    totalAmount,
    createdAt: new Date().toISOString(),
  };

  await writeJsonFile(purchasesFile, [invoice, ...invoices]);
}

export async function createSalesInvoice(input: {
  customerName: string;
  date: string;
  paymentMethod: string;
  notes: string;
  amountPaid: number;
  lines: LineInput[];
}) {
  const invoices = await listSalesInvoices();
  const items = await buildSalesItems(input.lines);
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const remainingAmount = Math.max(totalAmount - input.amountPaid, 0);

  const paymentStatus: SalesInvoice["paymentStatus"] =
    input.amountPaid <= 0
      ? "En attente"
      : remainingAmount > 0
        ? "Partiel"
        : "Paye";

  const invoice: SalesInvoice = {
    id: invoices.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    invoiceNumber: `N ${String(invoices.length + 1).padStart(6, "0")}`,
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

  await writeJsonFile(salesFile, [invoice, ...invoices]);
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
