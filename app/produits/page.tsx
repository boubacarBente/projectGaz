'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { SurfaceCard } from '@/components/surface-card';

interface Product {
  id: number;
  code: string;
  name: string;
  capacity: string;
  unit_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(value);
}

function ProductCreateForm({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      capacity: formData.get('capacity') as string,
      unitPrice: parseFloat(formData.get('unitPrice') as string),
      isActive: formData.get('isActive') === 'on',
    };

    try {
      const res = await fetch('/api/produits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors de la création');
      }
      
      (e.target as HTMLFormElement).reset();
      onSuccess();
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
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
          Capacité
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
        Désignation
        <input
          type="text"
          name="name"
          placeholder="Très grande bouteille"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Prix unitaire (MAD)
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
        disabled={loading}
        className="inline-flex w-fit rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50"
      >
        {loading ? 'Création...' : 'Ajouter le produit'}
      </button>
    </form>
  );
}

function ProductRowForm({ product, onSuccess, onError }: { product: Product; onSuccess: () => void; onError: (msg: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    code: product.code,
    name: product.name,
    capacity: product.capacity,
    unitPrice: product.unit_price,
    isActive: product.is_active,
  });

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/produits/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors de la mise à jour');
      }
      
      setEditing(false);
      onSuccess();
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/produits/${product.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors de la suppression');
      }
      
      onSuccess();
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    return (
      <article className="rounded-3xl border border-sky-300 bg-white p-5 shadow-sm shadow-slate-200/60">
        <form onSubmit={handleUpdate} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Code
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Capacité
              <input
                type="text"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                required
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Désignation
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Prix unitaire (MAD)
              <input
                type="number"
                min="1"
                step="1"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: parseFloat(e.target.value) })}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
                required
              />
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              Produit actif
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              Prix actuel: {formatCurrency(product.unit_price)}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-950">{product.code}</p>
          <p className="text-sm text-slate-500">
            Créé le {new Date(product.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
            product.is_active
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-slate-200 text-slate-700'
          }`}
        >
          {product.is_active ? 'Actif' : 'Inactif'}
        </span>
      </div>

      <div className="mb-4 grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Désignation:</span>
          <span className="font-medium text-slate-700">{product.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Capacité:</span>
          <span className="font-medium text-slate-700">{product.capacity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Prix:</span>
          <span className="font-semibold text-sky-700">{formatCurrency(product.unit_price)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-500">
          Prix actuel: {formatCurrency(product.unit_price)}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setEditing(true)}
            className="rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Modifier
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      </div>
    </article>
  );
}

export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function fetchProducts() {
    try {
      setLoading(true);
      const res = await fetch('/api/produits');
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  function handleSuccess(msg: string) {
    setSuccess(msg);
    setError(null);
    fetchProducts();
    setTimeout(() => setSuccess(null), 3000);
  }

  function handleError(msg: string) {
    setError(msg);
    setSuccess(null);
    setTimeout(() => setError(null), 5000);
  }

  const activeProducts = products.filter((p) => p.is_active).length;
  const averagePrice = products.length > 0
    ? Math.round(products.reduce((sum, p) => sum + p.unit_price, 0) / products.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Produits"
        title="Catalogue et tarifs"
        description="Gestion du catalogue des bouteilles de gaz avec ajout, modification et suppression."
      />

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700">
          {success}
        </div>
      )}

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
            {formatCurrency(averagePrice)}
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <SurfaceCard
          title="Ajouter un produit"
          description="Ajoutez une nouvelle référence au catalogue."
        >
          <ProductCreateForm onSuccess={() => handleSuccess('Produit créé avec succès!')} onError={handleError} />
        </SurfaceCard>

        <SurfaceCard
          title="Catalogue existant"
          description="Cliquez sur modifier pour éditer un produit."
        >
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              Chargement...
            </div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              Aucun produit. Ajoutez votre premier produit.
            </div>
          ) : (
            <div className="grid gap-4">
              {products.map((product) => (
                <ProductRowForm
                  key={product.id}
                  product={product}
                  onSuccess={() => handleSuccess('Produit mis à jour!')}
                  onError={handleError}
                />
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}


