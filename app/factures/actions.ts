"use server";

import { revalidatePath } from "next/cache";

import { createSalesInvoice } from "@/lib/operations";

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

export async function createInvoice(formData: FormData) {
  // Lire les lignes produits depuis le FormData
  const productIds = formData.getAll('productId');
  const quantities = formData.getAll('quantity');
  const unitPrices = formData.getAll('unitPrice');

  const lines = [];
  for (let i = 0; i < productIds.length; i++) {
    const pid = Number(productIds[i]);
    const qty = Number(quantities[i]);
    const price = Number(unitPrices[i]);
    if (pid > 0 && qty > 0 && price > 0) {
      lines.push({ productId: pid, quantity: qty, amount: price });
    }
  }

  if (lines.length === 0) {
    throw new Error('Ajoutez au moins un produit avec une quantité et un prix valides.');
  }

  await createSalesInvoice({
    customerName: getText(formData, "customerName"),
    date: getText(formData, "date"),
    paymentMethod: getText(formData, "paymentMethod"),
    notes: (formData.get("notes")?.toString() ?? "").trim(),
    amountPaid: getNumber(formData, "amountPaid", 0),
    lines,
  });

  revalidatePath("/factures");
  revalidatePath("/factures/nouvelle");
  revalidatePath("/rapports");
  revalidatePath("/");
}
