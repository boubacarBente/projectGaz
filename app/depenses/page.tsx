import { createPurchase } from "@/app/depenses/actions";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { listPurchaseInvoices } from "@/lib/operations";
import { listProducts } from "@/lib/products";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function DepensesPage() {
  const [products, invoices] = await Promise.all([
    listProducts(),
    listPurchaseInvoices(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Approvisionnement"
        title="Factures de l usine"
        description="Quand tu pars charger des bouteilles vides a l usine et qu on te remet une facture, enregistre-la ici. Elle servira de base pour mesurer tes couts puis ton benefice sur les ventes."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceCard
          title="Nouvelle facture d approvisionnement"
          description="Version initiale avec une ligne produit. On peut facilement l etendre a plusieurs lignes par facture ensuite."
        >
          <form action={createPurchase} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Reference facture usine
                <input
                  type="text"
                  name="reference"
                  placeholder="USINE-2026-001"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Fournisseur
                <input
                  type="text"
                  name="supplier"
                  defaultValue="Usine"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-1">
                Date
                <input
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Bouteille chargee
                <select
                  name="productId"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} - {product.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Quantite recue
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  defaultValue="1"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Cout unitaire usine
                <input
                  type="number"
                  name="unitCost"
                  min="1"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Note
              <textarea
                name="notes"
                rows={4}
                placeholder="Transport, facture papier, observations..."
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-fit rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Enregistrer la facture usine
            </button>
          </form>
        </SurfaceCard>

        <SurfaceCard
          title="Historique des factures usine"
          description="Ces montants servent de cout achat pour suivre l approvisionnement et estimer ta marge globale."
        >
          <div className="grid gap-4">
            {invoices.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                Aucune facture usine enregistree pour le moment.
              </p>
            ) : (
              invoices.map((invoice) => (
                <article
                  key={invoice.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{invoice.reference}</p>
                      <p className="text-sm text-slate-500">
                        {invoice.supplier} • {new Date(invoice.date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-amber-700">
                      {formatCurrency(invoice.totalAmount)} GNF
                    </p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {invoice.items.map((item) => (
                      <p key={`${invoice.id}-${item.productCode}`}>
                        {item.productCode} - {item.productName} : {item.quantity} x {formatCurrency(item.unitCost)} GNF
                      </p>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
