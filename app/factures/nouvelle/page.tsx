import { createInvoice } from "@/app/factures/actions";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { listProducts } from "@/lib/products";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function NouvelleFacturePage() {
  const products = await listProducts();
  const defaultProduct = products[0];

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
          description="Version initiale avec une ligne produit. On pourra etendre a plusieurs lignes ensuite."
        >
          <form action={createInvoice} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-base-content/80">
                Nom du client
                <input
                  type="text"
                  name="customerName"
                  placeholder="Client comptoir"
                  className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-base-content/80">
                Date
                <input
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-base-content/80">
                Bouteille vendue
                <select
                  name="productId"
                  defaultValue={String(defaultProduct?.id ?? "")}
                  className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code} - {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-base-content/80">
                Quantite
                <input
                  type="number" step="any"
                  name="quantity"
                  
                  defaultValue="1"
                  className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-base-content/80 md:col-span-1">
                Prix unitaire de vente
                <input
                  type="number" step="any"
                  name="unitPrice"
                  
                  defaultValue={defaultProduct?.salePrice ?? 0}
                  className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-base-content/80 md:col-span-1">
                Montant encaisse
                <input
                  type="number" step="any"
                  name="amountPaid"
                  
                  defaultValue={defaultProduct?.salePrice ?? 0}
                  className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-base-content/80 md:col-span-1">
                Mode de paiement
                <select
                  name="paymentMethod"
                  defaultValue="Especes"
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
                rows={4}
                placeholder="Rechargement, remarque client, paiement partiel..."
                className="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-fit rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
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

          <div className="mt-6 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold">Tarif de reference actuel</p>
            <p className="mt-2">
              {defaultProduct
                ? `${defaultProduct.code} - ${formatCurrency(defaultProduct.salePrice)} GNF`
                : "Aucun produit disponible"}
            </p>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
