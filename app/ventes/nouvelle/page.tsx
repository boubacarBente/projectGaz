"use client";

import { useState, useEffect } from "react";
import { createInvoice } from "@/app/ventes/actions";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";

type Product = {
  id: number;
  code: string;
  name: string;
  capacity: string;
  salePrice: number;
};

type Line = {
  productId: string;
  quantity: string;
  unitPrice: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default function NouvelleFacturePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Especes");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { productId: "", quantity: "1", unitPrice: "" },
  ]);

  useEffect(() => {
    fetch("/api/produits")
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        if (data.length > 0) {
          setLines([{ productId: data[0].id.toString(), quantity: "1", unitPrice: data[0].salePrice.toString() }]);
          setAmountPaid(data[0].salePrice.toString());
        }
      });
  }, []);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { productId: products[0]?.id.toString() || "", quantity: "1", unitPrice: products[0]?.salePrice.toString() || "" },
    ]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index: number, field: keyof Line, value: string) => {
    setLines((prev) =>
      prev.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      )
    );
  };

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id.toString() === productId);
    updateLine(index, "productId", productId);
    if (product) {
      updateLine(index, "unitPrice", product.salePrice.toString());
    }
  };

  const lineTotal = (line: Line) => {
    const qty = parseFloat(line.quantity || "0");
    const price = parseFloat(line.unitPrice || "0");
    return qty * price;
  };

  const totalGeneral = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  const firstProduct = products[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facturation"
        title="Enregistrer une vente"
        description="Utilise cette page quand tu vends des bouteilles a un client. La facture de vente sera conservee et comptera dans le chiffre d'affaires et le benefice."
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceCard
          title="Nouvelle facture client"
          description="Ajoute un ou plusieurs produits, le total se calcule automatiquement."
        >
          <form action={createInvoice} className="grid gap-4">
            {/* Client & Date */}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-base-content/80">
                Nom du client
                <input
                  type="text"
                  name="customerName"
                  placeholder="Client comptoir"
                  className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-base-content/80">
                Date
                <input
                  type="date"
                  name="date"
                  className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>

            {/* Produits */}
            <div className="bg-base-200/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-base-content/70">
                  Produits vendus
                </h4>
                <button
                  type="button"
                  onClick={addLine}
                  className="btn btn-sm btn-primary btn-outline gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Ajouter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th className="bg-base-100">Produit</th>
                      <th className="bg-base-100 text-center">Qté</th>
                      <th className="bg-base-100 text-right">Prix unit.</th>
                      <th className="bg-base-100 text-right">Total</th>
                      <th className="bg-base-100"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            name="productId"
                            value={line.productId}
                            onChange={(e) => handleProductChange(index, e.target.value)}
                            className="select select-bordered select-sm w-full focus:select-focus"
                            required
                          >
                            <option value="">Sélectionner...</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.code} - {product.name} ({product.capacity})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number" step="any"
                            name="quantity"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, "quantity", e.target.value)}
                            className="input input-bordered input-sm w-20 text-center focus:input-focus"
                            min="1"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number" step="any"
                            name="unitPrice"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
                            className="input input-bordered input-sm w-28 text-right focus:input-focus"
                            placeholder="0"
                            min="1"
                            required
                          />
                        </td>
                        <td className="text-right font-semibold text-sky-600">
                          {line.quantity && line.unitPrice
                            ? formatCurrency(lineTotal(line)) + " F"
                            : "—"}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="btn btn-ghost btn-sm btn-circle"
                            disabled={lines.length === 1}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold text-base">
                      <td colSpan={3} className="text-right">Total général</td>
                      <td className="text-right text-sky-600">{formatCurrency(totalGeneral)} F</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Paiement */}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-base-content/80">
                Montant encaisse
                <input
                  type="number" step="any"
                  name="amountPaid"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-base-content/80">
                Mode de paiement
                <select
                  name="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                >
                  <option>Especes</option>
                  <option>Mobile Money</option>
                  <option>Virement</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-base-content/80">
              Note ou motif
              <textarea
                name="notes"
                rows={3}
                placeholder="Rechargement, remarque client, paiement partiel..."
                className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-fit rounded-full bg-sky-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              Enregistrer la vente
            </button>
          </form>
        </SurfaceCard>

        <SurfaceCard
          title="Repere de saisie"
          description="Le prix de vente peut etre change a la ligne, ce qui permet de suivre tes marges reelles par periode."
        >
          <ul className="space-y-3 text-sm leading-7 text-base-content/80">
            <li>Le total de la facture est calcule automatiquement a partir de la quantite et du prix unitaire.</li>
            <li>Le statut passe en paye, partiel ou en attente selon le montant encaisse.</li>
            <li>Chaque vente enregistree alimente la page rapports pour le benefice et les bouteilles vendues.</li>
          </ul>

          {firstProduct && (
            <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              <p className="font-semibold">Tarif de reference actuel</p>
              <p className="mt-2">
                {firstProduct.code} - {formatCurrency(firstProduct.salePrice)} GNF
              </p>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
