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
  await createSalesInvoice({
    customerName: getText(formData, "customerName"),
    date: getText(formData, "date"),
    paymentMethod: getText(formData, "paymentMethod"),
    notes: (formData.get("notes")?.toString() ?? "").trim(),
    amountPaid: getNumber(formData, "amountPaid", 0),
    lines: [
      {
        productId: getNumber(formData, "productId", 1),
        quantity: getNumber(formData, "quantity", 1),
        amount: getNumber(formData, "unitPrice", 1),
      },
    ],
  });

  revalidatePath("/factures");
  revalidatePath("/factures/nouvelle");
  revalidatePath("/rapports");
  revalidatePath("/");
}
