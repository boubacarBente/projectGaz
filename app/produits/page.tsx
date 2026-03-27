import { deleteProduct, updateProduct, createProduct } from "@/app/produits/actions";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { listProducts, Product } from "@/lib/products";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function ProductCreateForm() {
  return (
    <form action={createProduct} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Code produit
          <input
            type="text"
            name="code"
            placeholder="B12"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Capacite
          <input
            type="text"
            name="capacity"
            placeholder="12 kg"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
            required
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Designation
        <input
          type="text"
          name="name"
          placeholder="Tres grande bouteille"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Prix unitaire (GNF)
          <input
            type="number"
            min="1"
            step="1"
            name="unitPrice"
            placeholder="107200"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
            required
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked
            className="h-4 w-4 rounded border-slate-300"
          />
          Produit actif
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex w-fit rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
      >
        Ajouter le produit
      </button>
    </form>
  );
}

function ProductRowForm({ product }: { product: Product }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-950">{product.code}</p>
          <p className="text-sm text-slate-500">
            Cree le {new Date(product.createdAt).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
            product.isActive
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          {product.isActive ? "Actif" : "Inactif"}
        </span>
      </div>

      <form action={updateProduct} className="grid gap-4">
        <input type="hidden" name="id" value={product.id} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Code
            <input
              type="text"
              name="code"
              defaultValue={product.code}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Capacite
            <input
              type="text"
              name="capacity"
              defaultValue={product.capacity}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              required
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Designation
          <input
            type="text"
            name="name"
            defaultValue={product.name}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
            required
          />
        </label>

        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Prix unitaire (GNF)
            <input
              type="number"
              min="1"
              step="1"
              name="unitPrice"
              defaultValue={product.unitPrice}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              required
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={product.isActive}
              className="h-4 w-4 rounded border-slate-300"
            />
            Produit actif
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            Prix actuel: {formatCurrency(product.unitPrice)} GNF
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              Enregistrer
            </button>
            <button
              type="submit"
              formAction={deleteProduct}
              className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              Supprimer
            </button>
          </div>
        </div>
      </form>
    </article>
  );
}

export default async function ProduitsPage() {
  const products = await listProducts();
  const activeProducts = products.filter((product) => product.isActive).length;
  const averagePrice =
    products.length > 0
      ? Math.round(
          products.reduce((sum, product) => sum + product.unitPrice, 0) /
            products.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Produits"
        title="Catalogue et CRUD des produits"
        description="Premier module metier actif du projet: le catalogue des bouteilles de gaz est maintenant gerable depuis cette page avec ajout, modification et suppression."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-500">Produits en base</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {products.length}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-500">Produits actifs</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {activeProducts}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-500">Prix moyen catalogue</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {formatCurrency(averagePrice)} GNF
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <SurfaceCard
          title="Ajouter un produit"
          description="Le formulaire enregistre une nouvelle reference dans la persistence locale du projet."
        >
          <ProductCreateForm />
        </SurfaceCard>

        <SurfaceCard
          title="Catalogue existant"
          description="Chaque carte peut etre editee directement. Les valeurs sont rechargees apres chaque action serveur."
        >
          <div className="grid gap-4">
            {products.map((product) => (
              <ProductRowForm key={product.id} product={product} />
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
