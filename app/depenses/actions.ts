"use server";

import { revalidatePath } from "next/cache";

import { createPurchaseInvoice } from "@/lib/operations";

function getText(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Le champ ${field} est obligatoire.`);
  }

  return value.trim();
}

function getNumber(formData: FormData, field: string, min = 0) {
  const raw = getText(formData, field);
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < min) {
    throw new Error(`Le champ ${field} est invalide.`);
  }

  return parsed;
}

export async function createPurchase(formData: FormData) {
  await createPurchaseInvoice({
    reference: getText(formData, "reference"),
    supplier: getText(formData, "supplier"),
    date: getText(formData, "date"),
    notes: (formData.get("notes")?.toString() ?? "").trim(),
    lines: [
      {
        productId: getNumber(formData, "productId", 1),
        quantity: getNumber(formData, "quantity", 1),
        amount: getNumber(formData, "unitCost", 1),
      },
    ],
  });

  revalidatePath("/depenses");
  revalidatePath("/rapports");
  revalidatePath("/");
}
