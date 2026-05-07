import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../db/index";
import { products } from "../db/schema";
import { eq, asc } from "drizzle-orm";

export type Product = {
  id: number;
  code: string;
  name: string;
  capacity: string;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const seedProducts: Product[] = [
  {
    id: 1,
    code: "B3",
    name: "Petite bouteille",
    capacity: "3 kg",
    unitPrice: 28750,
    isActive: true,
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
  {
    id: 2,
    code: "B6",
    name: "Moyenne bouteille",
    capacity: "6 kg",
    unitPrice: 51500,
    isActive: true,
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
  {
    id: 3,
    code: "B9",
    name: "Grande bouteille",
    capacity: "9 kg",
    unitPrice: 77250,
    isActive: true,
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
  {
    id: 4,
    code: "B12",
    name: "Tres grande bouteille",
    capacity: "12 kg",
    unitPrice: 107200,
    isActive: true,
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
  {
    id: 5,
    code: "B36",
    name: "Bouteille industrielle",
    capacity: "36 kg",
    unitPrice: 317300,
    isActive: true,
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
  {
    id: 6,
    code: "B48",
    name: "Grande bouteille industrielle",
    capacity: "48 kg",
    unitPrice: 508072,
    isActive: true,
    createdAt: "2026-03-22T00:00:00.000Z",
    updatedAt: "2026-03-22T00:00:00.000Z",
  },
];

const dataDirectory = path.join(process.cwd(), "data");
const productsFile = path.join(dataDirectory, "products.json");

// --- CODE JSON (commenté - utilisation SQLite) ---

// async function ensureProductsFile() {
//   await mkdir(dataDirectory, { recursive: true });

//   try {
//     await readFile(productsFile, "utf8");
//   } catch {
//     await writeFile(productsFile, JSON.stringify(seedProducts, null, 2), "utf8");
//   }
// }

// async function saveProducts(products: Product[]) {
//   await ensureProductsFile();
//   await writeFile(productsFile, JSON.stringify(products, null, 2), "utf8");
// }

export async function listProducts() {
  // --- CODE JSON (commenté) ---
  // await ensureProductsFile();
  // const fileContent = await readFile(productsFile, "utf8");
  // const products = JSON.parse(fileContent) as Product[];

  // return products.toSorted((a, b) => a.id - b.id);

  // --- CODE SQL ---
  const result = await db.select().from(products).orderBy(asc(products.id));
  return result.map(p => ({
    id: p.id,
    code: p.code,
    name: p.name,
    capacity: p.capacity,
    unitPrice: p.unitPrice,
    isActive: p.isActive,
    createdAt: p.createdAt?.toISOString() || "",
    updatedAt: p.updatedAt?.toISOString() || "",
  }));
}

export async function createProduct(input: {
  code: string;
  name: string;
  capacity: string;
  unitPrice: number;
  isActive: boolean;
}) {
  // --- CODE JSON (commenté) ---
  // const products = await listProducts();

  // if (products.some((product) => product.code === input.code)) {
  //   throw new Error("Le code produit existe deja.");
  // }

  // const now = new Date().toISOString();
  // const nextId =
  //   products.reduce((max, product) => Math.max(max, product.id), 0) + 1;

  // const nextProduct: Product = {
  //   id: nextId,
  //   code: input.code,
  //   name: input.name,
  //   capacity: input.capacity,
  //   unitPrice: input.unitPrice,
  //   isActive: input.isActive,
  //   createdAt: now,
  //   updatedAt: now,
  // };

  // await saveProducts([...products, nextProduct]);

  // --- CODE SQL ---
  // Vérifier si le code existe déjà
  const existing = await db.select().from(products).where(eq(products.code, input.code));
  if (existing.length > 0) {
    throw new Error("Le code produit existe deja.");
  }

  await db.insert(products).values({
    code: input.code,
    name: input.name,
    capacity: input.capacity,
    unitPrice: Number(input.unitPrice) || 0,
    isActive: Boolean(input.isActive),
  });
}

export async function updateProduct(
  id: number,
  input: {
    code: string;
    name: string;
    capacity: string;
    unitPrice: number;
    isActive: boolean;
  },
) {
  // --- CODE JSON (commenté) ---
  // const products = await listProducts();

  // if (products.some((product) => product.id !== id && product.code === input.code)) {
  //   throw new Error("Le code produit existe deja.");
  // }

  // const nextProducts = products.map((product) =>
  //   product.id === id
  //     ? {
  //         ...product,
  //         ...input,
  //         updatedAt: new Date().toISOString(),
  //       }
  //     : product,
  // );

  // if (!nextProducts.some((product) => product.id === id)) {
  //   throw new Error("Produit introuvable.");
  // }

  // await saveProducts(nextProducts);

  // --- CODE SQL ---
  // Vérifier si le produit existe
  const existing = await db.select().from(products).where(eq(products.id, id));
  if (existing.length === 0) {
    throw new Error("Produit introuvable.");
  }

  // Vérifier si le code existe déjà pour un autre produit
  const codeExists = await db.select().from(products).where(eq(products.code, input.code));
  if (codeExists.length > 0 && codeExists[0].id !== id) {
    throw new Error("Le code produit existe deja.");
  }

  await db.update(products).set({
    code: input.code,
    name: input.name,
    capacity: input.capacity,
    unitPrice: Number(input.unitPrice) || 0,
    isActive: Boolean(input.isActive),
  }).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  // --- CODE JSON (commenté) ---
  // const products = await listProducts();
  // const nextProducts = products.filter((product) => product.id !== id);

  // if (nextProducts.length === products.length) {
  //   throw new Error("Produit introuvable.");
  // }

  // await saveProducts(nextProducts);

  // --- CODE SQL ---
  // Vérifier si le produit existe
  const existing = await db.select().from(products).where(eq(products.id, id));
  if (existing.length === 0) {
    throw new Error("Produit introuvable.");
  }

  await db.delete(products).where(eq(products.id, id));
}
