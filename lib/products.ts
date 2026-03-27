import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

async function ensureProductsFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(productsFile, "utf8");
  } catch {
    await writeFile(productsFile, JSON.stringify(seedProducts, null, 2), "utf8");
  }
}

async function saveProducts(products: Product[]) {
  await ensureProductsFile();
  await writeFile(productsFile, JSON.stringify(products, null, 2), "utf8");
}

export async function listProducts() {
  await ensureProductsFile();
  const fileContent = await readFile(productsFile, "utf8");
  const products = JSON.parse(fileContent) as Product[];

  return products.toSorted((a, b) => a.id - b.id);
}

export async function createProduct(input: {
  code: string;
  name: string;
  capacity: string;
  unitPrice: number;
  isActive: boolean;
}) {
  const products = await listProducts();

  if (products.some((product) => product.code === input.code)) {
    throw new Error("Le code produit existe deja.");
  }

  const now = new Date().toISOString();
  const nextId =
    products.reduce((max, product) => Math.max(max, product.id), 0) + 1;

  const nextProduct: Product = {
    id: nextId,
    code: input.code,
    name: input.name,
    capacity: input.capacity,
    unitPrice: input.unitPrice,
    isActive: input.isActive,
    createdAt: now,
    updatedAt: now,
  };

  await saveProducts([...products, nextProduct]);
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
  const products = await listProducts();

  if (products.some((product) => product.id !== id && product.code === input.code)) {
    throw new Error("Le code produit existe deja.");
  }

  const nextProducts = products.map((product) =>
    product.id === id
      ? {
          ...product,
          ...input,
          updatedAt: new Date().toISOString(),
        }
      : product,
  );

  if (!nextProducts.some((product) => product.id === id)) {
    throw new Error("Produit introuvable.");
  }

  await saveProducts(nextProducts);
}

export async function deleteProduct(id: number) {
  const products = await listProducts();
  const nextProducts = products.filter((product) => product.id !== id);

  if (nextProducts.length === products.length) {
    throw new Error("Produit introuvable.");
  }

  await saveProducts(nextProducts);
}
