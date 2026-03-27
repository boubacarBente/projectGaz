"use server";

import { revalidatePath } from "next/cache";

import {
  createProduct as createProductRecord,
  deleteProduct as deleteProductRecord,
  updateProduct as updateProductRecord,
} from "@/lib/products";

function getRequiredText(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Le champ ${field} est obligatoire.`);
  }

  return value.trim();
}

function getPrice(formData: FormData) {
  const value = getRequiredText(formData, "unitPrice");
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Le prix unitaire doit etre un nombre positif.");
  }

  return parsed;
}

function getActiveFlag(formData: FormData) {
  return formData.get("isActive") === "on" || formData.get("isActive") === "true";
}

function getProductId(formData: FormData) {
  const rawValue = getRequiredText(formData, "id");
  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Identifiant produit invalide.");
  }

  return parsed;
}

export async function createProduct(formData: FormData) {
  await createProductRecord({
    code: getRequiredText(formData, "code").toUpperCase(),
    name: getRequiredText(formData, "name"),
    capacity: getRequiredText(formData, "capacity"),
    unitPrice: getPrice(formData),
    isActive: getActiveFlag(formData),
  });

  revalidatePath("/produits");
}

export async function updateProduct(formData: FormData) {
  const id = getProductId(formData);

  await updateProductRecord(id, {
    code: getRequiredText(formData, "code").toUpperCase(),
    name: getRequiredText(formData, "name"),
    capacity: getRequiredText(formData, "capacity"),
    unitPrice: getPrice(formData),
    isActive: getActiveFlag(formData),
  });

  revalidatePath("/produits");
}

export async function deleteProduct(formData: FormData) {
  const id = getProductId(formData);
  await deleteProductRecord(id);
  revalidatePath("/produits");
}
