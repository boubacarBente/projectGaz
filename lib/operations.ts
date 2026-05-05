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
  return invoice;
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
  return invoice;
}

export async function getPurchaseInvoice(id: number) {
  const invoices = await listPurchaseInvoices();
  return invoices.find((invoice) => invoice.id === id) || null;
}

export async function updatePurchaseInvoice(id: number, input: {
  reference?: string;
  supplier?: string;
  date?: string;
  notes?: string;
  lines?: LineInput[];
}) {
  const invoices = await listPurchaseInvoices();
  const index = invoices.findIndex((invoice) => invoice.id === id);
  
  if (index === -1) {
    throw new Error('Invoice not found');
  }

  const existingInvoice = invoices[index];
  const items = input.lines 
    ? await buildPurchaseItems(input.lines)
    : existingInvoice.items;
  const totalAmount = items.reduce((sum, item) => sum + item.totalCost, 0);

  const updatedInvoice: PurchaseInvoice = {
    ...existingInvoice,
    reference: input.reference ?? existingInvoice.reference,
    supplier: input.supplier ?? existingInvoice.supplier,
    date: input.date ?? existingInvoice.date,
    notes: input.notes ?? existingInvoice.notes,
    items,
    totalAmount,
  };

  invoices[index] = updatedInvoice;
  await writeJsonFile(purchasesFile, invoices);
  return updatedInvoice;
}

export async function deletePurchaseInvoice(id: number) {
  const invoices = await listPurchaseInvoices();
  const filtered = invoices.filter((invoice) => invoice.id !== id);
  
  if (filtered.length === invoices.length) {
    throw new Error('Invoice not found');
  }

  await writeJsonFile(purchasesFile, filtered);
  return { success: true };
}

export async function getSalesInvoice(id: number) {
  const invoices = await listSalesInvoices();
  return invoices.find((invoice) => invoice.id === id) || null;
}

export async function updateSalesInvoice(id: number, input: {
  customerName?: string;
  date?: string;
  paymentMethod?: string;
  notes?: string;
  amountPaid?: number;
  lines?: LineInput[];
}) {
  const invoices = await listSalesInvoices();
  const index = invoices.findIndex((invoice) => invoice.id === id);
  
  if (index === -1) {
    throw new Error('Invoice not found');
  }

  const existingInvoice = invoices[index];
  const items = input.lines 
    ? await buildSalesItems(input.lines)
    : existingInvoice.items;
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const amountPaid = input.amountPaid ?? existingInvoice.amountPaid;
  const remainingAmount = Math.max(totalAmount - amountPaid, 0);

  const paymentStatus: SalesInvoice["paymentStatus"] =
    amountPaid <= 0
      ? "En attente"
      : remainingAmount > 0
        ? "Partiel"
        : "Paye";

  const updatedInvoice: SalesInvoice = {
    ...existingInvoice,
    customerName: input.customerName ?? existingInvoice.customerName,
    date: input.date ?? existingInvoice.date,
    paymentMethod: input.paymentMethod ?? existingInvoice.paymentMethod,
    notes: input.notes ?? existingInvoice.notes,
    items,
    totalAmount,
    amountPaid,
    remainingAmount,
    paymentStatus,
  };

  invoices[index] = updatedInvoice;
  await writeJsonFile(salesFile, invoices);
  return updatedInvoice;
}

export async function deleteSalesInvoice(id: number) {
  const invoices = await listSalesInvoices();
  const filtered = invoices.filter((invoice) => invoice.id !== id);
  
  if (filtered.length === invoices.length) {
    throw new Error('Invoice not found');
  }

  await writeJsonFile(salesFile, filtered);
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

const stockFile = path.join(dataDirectory, "stock.json");
const stockMovementsFile = path.join(dataDirectory, "stock-movements.json");

async function readStockFile() {
  await ensureFile(stockFile);
  const content = await readFile(stockFile, "utf8");
  return JSON.parse(content) as StockItem[];
}

async function writeStockFile(items: StockItem[]) {
  await writeFile(stockFile, JSON.stringify(items, null, 2), "utf8");
}

async function readStockMovementsFile() {
  await ensureFile(stockMovementsFile);
  const content = await readFile(stockMovementsFile, "utf8");
  return JSON.parse(content) as StockMovement[];
}

async function writeStockMovementsFile(movements: StockMovement[]) {
  await writeFile(stockMovementsFile, JSON.stringify(movements, null, 2), "utf8");
}

export async function initializeStock() {
  const products = await listProducts();
  const stock = await readStockFile();
  
  // Initialize stock for all products if not exists
  const existingProductIds = new Set(stock.map(s => s.productId));
  const newStockItems = products
    .filter(p => !existingProductIds.has(p.id))
    .map(p => ({
      productId: p.id,
      productCode: p.code,
      productName: p.name,
      capacity: p.capacity,
      currentStock: 0,
      minStock: 10, // Default min stock
      lastEntry: null,
      lastExit: null,
    }));
  
  if (newStockItems.length > 0) {
    await writeStockFile([...stock, ...newStockItems]);
  }
  
  return [...stock.filter(s => existingProductIds.has(s.productId)), ...newStockItems];
}

export async function getStock() {
  return readStockFile();
}

export async function updateProductMinStock(productId: number, minStock: number) {
  const stock = await readStockFile();
  const index = stock.findIndex(s => s.productId === productId);
  
  if (index === -1) {
    throw new Error('Product not found in stock');
  }
  
  stock[index].minStock = minStock;
  await writeStockFile(stock);
  return stock[index];
}

export async function addStockMovement(input: {
  productId: number;
  type: StockMovementType;
  quantity: number;
  reference: string;
  notes?: string;
}) {
  const products = await listProducts();
  const product = products.find(p => p.id === input.productId);
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  const movements = await readStockMovementsFile();
  const stock = await readStockFile();
  
  const movement: StockMovement = {
    id: movements.length > 0 ? Math.max(...movements.map(m => m.id)) + 1 : 1,
    productId: input.productId,
    productCode: product.code,
    productName: product.name,
    type: input.type,
    quantity: input.quantity,
    reference: input.reference,
    notes: input.notes || '',
    createdAt: new Date().toISOString(),
  };
  
  // Update stock
  const stockIndex = stock.findIndex(s => s.productId === input.productId);
  if (stockIndex === -1) {
    throw new Error('Product not found in stock');
  }
  
  if (input.type === 'entry' || input.type === 'return') {
    stock[stockIndex].currentStock += input.quantity;
    stock[stockIndex].lastEntry = movement.createdAt;
  } else if (input.type === 'exit') {
    stock[stockIndex].currentStock -= input.quantity;
    stock[stockIndex].lastExit = movement.createdAt;
  } else if (input.type === 'adjustment') {
    stock[stockIndex].currentStock = input.quantity;
  }
  
  await writeStockFile(stock);
  await writeStockMovementsFile([movement, ...movements]);
  
  return { movement, stock: stock[stockIndex] };
}

export async function getStockMovements(limit = 50) {
  const movements = await readStockMovementsFile();
  return movements.slice(0, limit);
}

export async function getLowStockAlerts() {
  const stock = await readStockFile();
  return stock.filter(s => s.currentStock <= s.minStock);
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
  const totalBottlesInStock = stock.reduce((sum, s) => sum + s.currentStock, 0);

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
  currency: 'MAD',
  currencySymbol: 'MAD',
  dateFormat: 'DD/MM/YYYY',
  invoicePrefix: 'FAC',
  purchasePrefix: 'ACH',
  lowStockAlertEnabled: true,
  theme: 'light',
};

const settingsFile = path.join(dataDirectory, "settings.json");

async function readSettingsFile(): Promise<Settings> {
  try {
    await ensureFile(settingsFile);
    const content = await readFile(settingsFile, "utf8");
    const data = JSON.parse(content);
    return { ...defaultSettings, ...data };
  } catch {
    return defaultSettings;
  }
}

async function writeSettingsFile(settings: Settings) {
  await writeFile(settingsFile, JSON.stringify(settings, null, 2), "utf8");
}

export async function getSettings(): Promise<Settings> {
  return readSettingsFile();
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const currentSettings = await readSettingsFile();
  const updatedSettings = { ...currentSettings, ...updates };
  await writeSettingsFile(updatedSettings);
  return updatedSettings;
}
