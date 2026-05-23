'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ---------- types ----------
type PurchaseItem = {
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

type PurchaseInvoice = {
  id: number;
  reference: string;
  supplier: string;
  date: string;
  totalAmount: number;
  isPaid: boolean;
  notes: string;
  items: PurchaseItem[];
};

type PeriodAgg = {
  period: string;
  count: number;
  total: number;
};

type PeriodKey = 'all' | 'today' | 'byDay' | 'byWeek' | 'byMonth' | 'byYear';

// ---------- helpers ----------
const fCF = (v: number) => new Intl.NumberFormat('fr-FR').format(v);

function PeriodTabs({ active, onChange }: { active: PeriodKey; onChange: (k: PeriodKey) => void }) {
  const tabs: { key: PeriodKey; label: string }[] = [
    { key: 'all', label: 'Global' },
    { key: 'byYear', label: 'Année' },
    { key: 'byMonth', label: 'Mois' },
    { key: 'byWeek', label: 'Semaine' },
    { key: 'byDay', label: 'Jour' },
    { key: 'today', label: "Aujourd'hui" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 bg-base-200/60 p-1 rounded-2xl w-fit" role="tablist">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            active === key
              ? 'bg-primary text-white shadow-sm shadow-primary/20'
              : 'text-base-content/50 hover:text-base-content/80'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${
      accent
        ? 'border-primary/20 bg-primary/5'
        : 'border-base-200/80 bg-base-100/60'
    }`}>
      <p className="text-sm font-medium text-base-content/50">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${accent ? 'text-primary' : 'text-base-content'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-base-content/40">{sub}</p>}
    </div>
  );
}

// ---------- Main Component ----------
export default function SupplierPaymentsPage() {
  const params = useParams();
  const supplierId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodView, setPeriodView] = useState<PeriodKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'totalAmount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/fournisseurs/${supplierId}/paiements`);
        const d = await res.json();
        setData(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [supplierId]);

  const { supplier, invoices, aggregates } = data || {};

  // Filter + sort invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    let list = [...invoices];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (inv: PurchaseInvoice) =>
          inv.reference.toLowerCase().includes(q) ||
          inv.date.includes(q)
      );
    }
    list.sort((a: PurchaseInvoice, b: PurchaseInvoice) => {
      const cmp = sortField === 'date'
        ? a.date.localeCompare(b.date)
        : a.totalAmount - b.totalAmount;
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [invoices, searchQuery, sortField, sortDir]);

  const toggleSort = (field: 'date' | 'totalAmount') => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const periodData: PeriodAgg[] = periodView === 'all' ? [] : aggregates?.[periodView] || [];

  // Compute card totals based on selected period and/or search filter
  const cardTotals = useMemo(() => {
    if (searchQuery) {
      return {
        totalInvoices: filteredInvoices.length,
        totalAmount: filteredInvoices.reduce((s: number, i: PurchaseInvoice) => s + i.totalAmount, 0),
        totalItems: filteredInvoices.reduce((s: number, i: PurchaseInvoice) => s + i.items.reduce((si, item) => si + item.quantity, 0), 0),
      };
    }
    if (periodView === 'all' || periodData.length === 0) {
      return aggregates?.all || null;
    }
    return {
      totalInvoices: periodData.reduce((s, p) => s + p.count, 0),
      totalAmount: periodData.reduce((s, p) => s + p.total, 0),
      totalItems: 0, // items not available in period aggregates
    };
  }, [periodView, periodData, aggregates, searchQuery, filteredInvoices]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-3xl bg-base-200/50 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-base-200/50 animate-pulse" />)}
        </div>
        <div className="h-96 rounded-3xl bg-base-200/50 animate-pulse" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-3.464-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-semibold">Fournisseur introuvable</h2>
        <Link href="/fournisseurs" className="btn btn-outline btn-sm">Retour aux fournisseurs</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ---------- Header ---------- */}
      <section className="rounded-3xl border border-base-200/80 bg-base-100/80 p-6 md:p-8 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Historique des factures
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {supplier.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
                <p className="text-sm text-base-content/50">
                  {supplier.phone || '—'}
                  {supplier.address && <span> · {supplier.address}</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/fournisseurs`} className="btn btn-outline btn-sm gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Retour
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      {cardTotals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Factures"
            value={fCF(cardTotals.totalInvoices)}
            sub={periodView === 'all' ? 'Nombre total' : 'Période sélectionnée'}
          />
          <StatCard
            label="Montant total"
            value={`${fCF(cardTotals.totalAmount)} GNF`}
            sub={periodView === 'all' ? 'Somme des achats' : 'Période sélectionnée'}
            accent
          />
          <StatCard
            label="Articles"
            value={cardTotals.totalItems > 0 ? fCF(cardTotals.totalItems) : '—'}
            sub={periodView === 'all' ? 'Quantité totale' : 'Non disponible par période'}
          />
        </div>
      )}

      {/* ---------- Period Tabs ---------- */}
      <PeriodTabs active={periodView} onChange={setPeriodView} />

      {/* ---------- Period breakdown ---------- */}
      {periodView !== 'all' && periodView !== 'today' && periodData.length > 0 && (
        <section className="rounded-3xl border border-base-200/80 bg-base-100/80 p-6 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold">
              {periodView === 'byDay' && 'Par jour'}
              {periodView === 'byWeek' && 'Par semaine'}
              {periodView === 'byMonth' && 'Par mois'}
              {periodView === 'byYear' && 'Par année'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Période</th>
                  <th className="text-right">Factures</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {periodData.map((p: PeriodAgg) => {
                  const label =
                    periodView === 'byMonth'
                      ? new Date(p.period + '-02').toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
                      : periodView === 'byYear'
                        ? p.period
                        : new Date(p.period + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
                  return (
                    <tr key={p.period} className="hover:bg-base-200/40 transition-colors">
                      <td className="font-medium">{label}</td>
                      <td className="text-right text-base-content/70">{p.count}</td>
                      <td className="text-right font-medium">{fCF(p.total)} GNF</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------- Search + Invoices table ---------- */}
      <section className="rounded-3xl border border-base-200/80 bg-base-100/80 shadow-lg shadow-black/5 backdrop-blur overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-base-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
          <div className="relative w-full sm:w-64">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Rechercher une facture…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-full pl-9 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table text-sm">
            <thead className="bg-base-200/30">
              <tr>
                <th>Référence</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <span className="inline-flex items-center gap-1">
                    Date
                    {sortField === 'date' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )}
                  </span>
                </th>
                <th>Articles</th>
                <th className="text-right cursor-pointer select-none" onClick={() => toggleSort('totalAmount')}>
                  <span className="inline-flex items-center gap-1">
                    Montant
                    {sortField === 'totalAmount' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )}
                  </span>
                </th>
                <th className="text-center">Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-base-content/40">Aucune facture trouvée</td></tr>
                ) : (
                  filteredInvoices.map((inv: PurchaseInvoice, idx: number) => (
                    <motion.tr
                      key={inv.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className="group hover:bg-base-200/40 transition-colors"
                    >
                      <td>
                        <Link href={`/factures-usine/${inv.id}`} className="font-medium text-primary hover:underline">
                          {inv.reference}
                        </Link>
                      </td>
                      <td className="text-base-content/70 whitespace-nowrap">
                        {new Date(inv.date + 'T12:00:00').toLocaleDateString('fr-FR')}
                      </td>
                      <td className="text-base-content/70">
                        <span className="inline-flex items-center gap-1.5">
                          {inv.items.length} art.
                          <span className="text-xs text-base-content/30">·</span>
                          <span className="text-xs text-base-content/40">{inv.items.reduce((s, i) => s + i.quantity, 0)} u.</span>
                        </span>
                      </td>
                      <td className="text-right font-medium tabular-nums">{fCF(inv.totalAmount)} GNF</td>
                      <td className="text-center">
                        <span className={`badge badge-sm ${inv.isPaid ? 'badge-soft badge-success' : 'badge-soft badge-warning'}`}>
                          {inv.isPaid ? 'Payée' : 'Non payée'}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/factures-usine/${inv.id}`}
                          className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
