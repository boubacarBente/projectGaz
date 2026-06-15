import { db, schema } from "@/db";
import { eq, desc, asc, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type StockMovementType = "entry" | "exit" | "adjustment" | "initial";

export type StockMovementRow = {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  type: StockMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  referenceType: string | null;
  referenceId: number | null;
  note: string | null;
  createdAt: Date | null;
};

export type StockProduct = {
  id: number;
  code: string;
  name: string;
  capacity: string;
  stock: number;
  stockMin: number;
  unitPrice: number;
  salePrice: number;
  stockValue: number;
  isLow: boolean;
};

export async function updateProductStock(productId: number) {
  // Recalcule le stock d'un produit basé sur les mouvements
  const movements = await db.select({
    type: schema.stockMovements.type,
    quantity: schema.stockMovements.quantity,
  })
    .from(schema.stockMovements)
    .where(eq(schema.stockMovements.productId, productId));

  let stock = 0;
  for (const m of movements) {
    if (m.type === "entry" || m.type === "initial") {
      stock += m.quantity;
    } else if (m.type === "exit") {
      stock -= m.quantity;
    } else if (m.type === "adjustment") {
      // adjustment quantity = the new stock value directly
      stock = m.quantity;
    }
  }

  await db.update(schema.products)
    .set({ stock: Math.max(0, stock) })
    .where(eq(schema.products.id, productId));
}

export async function addStockMovement(
  productId: number,
  type: StockMovementType,
  quantity: number,
  {
    referenceType,
    referenceId,
    note,
  }: { referenceType?: string; referenceId?: number; note?: string } = {}
) {
  const [product] = await db.select({ stock: schema.products.stock })
    .from(schema.products)
    .where(eq(schema.products.id, productId));

  if (!product) throw new Error("Produit introuvable");

  const stockBefore = product.stock ?? 0;
  let stockAfter = stockBefore;

  if (type === "entry" || type === "initial") {
    stockAfter = stockBefore + quantity;
  } else if (type === "exit") {
    stockAfter = Math.max(0, stockBefore - quantity);
  } else if (type === "adjustment") {
    stockAfter = quantity; // quantity = new stock value
  }

  await db.insert(schema.stockMovements).values({
    productId,
    type,
    quantity,
    stockBefore,
    stockAfter,
    referenceType: referenceType ?? null,
    referenceId: referenceId ?? null,
    note: note ?? null,
  });

  await db.update(schema.products)
    .set({ stock: stockAfter })
    .where(eq(schema.products.id, productId));

  return { stockBefore, stockAfter };
}

export async function listStockProducts({
  search,
  lowStockOnly = false,
}: { search?: string; lowStockOnly?: boolean } = {}) {
  const conditions = [eq(schema.products.isActive, true)];
  if (search) {
    conditions.push(
      sql`(${schema.products.code} LIKE ${`%${search}%`} OR ${schema.products.name} LIKE ${`%${search}%`})`
    );
  }
  if (lowStockOnly) {
    conditions.push(
      sql`${schema.products.stock} <= ${schema.products.stockMin}`
    );
  }

  const products = await db.select()
    .from(schema.products)
    .where(and(...conditions))
    .orderBy(asc(schema.products.code));

  return products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    capacity: p.capacity,
    stock: p.stock ?? 0,
    stockMin: p.stockMin ?? 0,
    unitPrice: p.unitPrice,
    salePrice: p.salePrice,
    stockValue: (p.stock ?? 0) * p.unitPrice,
    isLow: (p.stock ?? 0) <= (p.stockMin ?? 0) && (p.stockMin ?? 0) > 0,
  }));
}

export async function listStockMovements({
  productId,
  page = 1,
  limit = 20,
}: { productId?: number; page?: number; limit?: number } = {}) {
  const conditions: any[] = [];
  if (productId) conditions.push(eq(schema.stockMovements.productId, productId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  const [data, totalResult] = await Promise.all([
    db.query.stockMovements.findMany({
      where,
      orderBy: [desc(schema.stockMovements.createdAt)],
      with: {
        product: { columns: { code: true, name: true } },
      },
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` })
      .from(schema.stockMovements)
      .where(where),
  ]);

  const total = Number(totalResult[0].count);
  const rows: StockMovementRow[] = data.map((m) => ({
    id: m.id,
    productId: m.productId,
    productCode: m.product?.code ?? "",
    productName: m.product?.name ?? "",
    type: m.type as StockMovementType,
    quantity: m.quantity,
    stockBefore: m.stockBefore,
    stockAfter: m.stockAfter,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    note: m.note,
    createdAt: m.createdAt,
  }));

  return {
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getStockSummary() {
  const products = await db.select({
    stock: schema.products.stock,
    stockMin: schema.products.stockMin,
    unitPrice: schema.products.unitPrice,
    salePrice: schema.products.salePrice,
  })
    .from(schema.products)
    .where(eq(schema.products.isActive, true));

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.stock ?? 0), 0);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock ?? 0) * p.unitPrice, 0);
  const totalSaleValue = products.reduce((sum, p) => sum + (p.stock ?? 0) * p.salePrice, 0);
  const lowStockCount = products.filter((p) => (p.stock ?? 0) <= (p.stockMin ?? 0) && (p.stockMin ?? 0) > 0).length;
  const outOfStockCount = products.filter((p) => (p.stock ?? 0) === 0).length;

  return {
    totalProducts,
    totalStock,
    totalStockValue,
    totalSaleValue,
    lowStockCount,
    outOfStockCount,
  };
}

export async function adjustStock(
  productId: number,
  newStock: number,
  note: string
) {
  return addStockMovement(productId, "adjustment", newStock, {
    referenceType: "adjustment",
    note,
  });
}
