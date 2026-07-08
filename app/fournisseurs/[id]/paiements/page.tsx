'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ---------- types ----------
type Period = 'today' | 'day' | 'week' | 'month' | 'year' | 'total';

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

// ---------- helpers ----------
const fCF = (v: number) => new Intl.NumberFormat('fr-FR').format(v);

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'total', label: 'Total' },
];

function getDateParams(period: Period, selectedDay: string, selectedMonth?: string): { from?: string; to?: string } {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayStr = todayUTC.toISOString().slice(0, 10);

  switch (period) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case 'day':
      return { from: selectedDay, to: selectedDay };
    case 'week': {
      const weekStart = new Date(todayUTC);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { from: weekStart.toISOString().slice(0, 10), to: todayStr };
    }
    case 'month': {
      const monthStr = selectedMonth || todayStr.slice(0, 7);
      const year = parseInt(monthStr.slice(0, 4), 10);
      const mon = parseInt(monthStr.slice(5), 10);
      const lastDay = new Date(year, mon, 0).getDate();
      const monthEnd = monthStr + '-' + String(lastDay).padStart(2, '0');
      return { from: monthStr + '-01', to: monthEnd };
    }
    case 'year':
      return { from: todayStr.slice(0, 4) + '-01-01', to: todayStr };
    case 'total':
      return {};
  }
}

// ---------- Main Component ----------
export default function SupplierPaymentsPage() {
  const params = useParams();
  const supplierId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [period, setPeriod] = useState<Period>('total');
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 7);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'totalAmount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const dateParams = useMemo(() => getDateParams(period, selectedDay, selectedMonth), [period, selectedDay, selectedMonth]);
  const isRefreshing = loading && hasLoadedData;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (dateParams.from) qs.set('from', dateParams.from);
        if (dateParams.to) qs.set('to', dateParams.to);
        const res = await fetch(`/api/fournisseurs/${supplierId}/paiements?${qs.toString()}`, { signal: controller.signal });
        const d = await res.json();
        if (controller.signal.aborted) return;
        setData(d);
        setHasLoadedData(true);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error(e);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setHasLoadedData(true);
        }
      }
    })();
    return () => controller.abort();
  }, [supplierId, dateParams]);

  const { supplier, invoices, aggregates } = data || {};

  // Filter + sort invoices (search within API-filtered list)
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

  const cardTotals = aggregates?.all || null;
  const periodLabel = PERIODS.find((p) => p.key === period)?.label || 'Total';

  if (loading && !hasLoadedData) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-3xl bg-base-200/50 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-base-200/50 animate-pulse" />)}
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
    <div className="space-y-6">
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
                  {supplier.phone || '\u2014'}
                  {supplier.address && <span> \u00B7 {supplier.address}</span>}
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

      {/* ---------- Period Selector ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-base-content/60 mr-1">Période :</span>
        <div className="join">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`join-item btn btn-sm ${
                period === p.key ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'day' && (
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="input input-bordered input-sm"
          />
        )}
        {period === 'month' && (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input input-bordered input-sm"
          />
        )}
        <span className="text-xs text-base-content/40 ml-2">({periodLabel})</span>
        {isRefreshing && (
          <span className="loading loading-spinner loading-sm text-primary" aria-label="Actualisation" />
        )}
      </div>

      {/* ---------- Stats ---------- */}
      {cardTotals && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-base-200/80 bg-base-100/60 p-5">
            <p className="text-sm font-medium text-base-content/50">Factures</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-base-content">{fCF(cardTotals.totalInvoices)}</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm font-medium text-base-content/50">Montant total</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-primary">{fCF(cardTotals.totalAmount)} GNF</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
          <div className="rounded-2xl border border-base-200/80 bg-base-100/60 p-5">
            <p className="text-sm font-medium text-base-content/50">Articles</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-base-content">{cardTotals.totalItems > 0 ? fCF(cardTotals.totalItems) : '\u2014'}</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
        </div>
      )}

      {/* ---------- Search + Invoices table ---------- */}
      <section className="rounded-3xl border border-base-200/80 bg-base-100/80 shadow-lg shadow-black/5 backdrop-blur overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-base-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
          <div className="relative w-full sm:w-64">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Rechercher une facture..."
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
                          <span className="text-xs text-base-content/30">&middot;</span>
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
