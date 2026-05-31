'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ---------- types ----------
type Period = 'today' | 'day' | 'week' | 'month' | 'year' | 'total';

type Invoice = {
  id: number;
  invoiceNumber: string;
  customerName: string;
  date: string;
  paymentMethod: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: string;
  grossProfit?: number;
  items: { productName: string; productCode: string; quantity: number; unitPrice: number; totalPrice: number }[];
};

type PeriodAgg = {
  period: string;
  count: number;
  total: number;
  paid: number;
  profit: number;
};

// ---------- helpers ----------
const fCF = (v: number) => new Intl.NumberFormat('fr-FR').format(v);

const statusCfg: Record<string, { label: string; cls: string }> = {
  Paye:     { label: 'Payée',      cls: 'badge-soft badge-success' },
  Partiel:  { label: 'Partielle',  cls: 'badge-soft badge-warning' },
  'En attente': { label: 'En attente', cls: 'badge-soft badge-error' },
};

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'total', label: 'Total' },
];

function getDateParams(period: Period, selectedDay: string): { from?: string; to?: string } {
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
    case 'month':
      return { from: todayStr.slice(0, 7) + '-01', to: todayStr };
    case 'year':
      return { from: todayStr.slice(0, 4) + '-01-01', to: todayStr };
    case 'total':
      return {};
  }
}

// ---------- Status Badge ----------
function StatusBadge({ status }: { status: string }) {
  const cfg = statusCfg[status] || { label: status, cls: 'badge-soft' };
  return <span className={`badge ${cfg.cls} text-xs`}>{cfg.label}</span>;
}

// ---------- Payment Method Icon ----------
function PaymentIcon({ method }: { method: string }) {
  const isCash = method === 'Espèces' || method === 'Especes';
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold ${
      isCash ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
    }`}>
      {isCash ? '\u{1F4B5}' : '\u{1F4B3}'}
    </span>
  );
}

// ---------- Main Component ----------
export default function CustomerPaymentsPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('total');
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'totalAmount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Build from/to from period and pass to API
  const dateParams = useMemo(() => getDateParams(period, selectedDay), [period, selectedDay]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (dateParams.from) qs.set('from', dateParams.from);
        if (dateParams.to) qs.set('to', dateParams.to);
        const res = await fetch(`/api/clients/${customerId}/paiements?${qs.toString()}`);
        const d = await res.json();
        setData(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId, dateParams]);

  const { customer, invoices, aggregates } = data || {};

  // Filter + sort invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    let list = [...invoices];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (inv: Invoice) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.date.includes(q) ||
          inv.paymentMethod.toLowerCase().includes(q) ||
          inv.paymentStatus.toLowerCase().includes(q)
      );
    }
    list.sort((a: Invoice, b: Invoice) => {
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

  // Compute card totals from the API aggregates
  const cardTotals = aggregates?.all || null;

  const periodLabel = PERIODS.find((p) => p.key === period)?.label || 'Total';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-3xl bg-base-200/50 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-base-200/50 animate-pulse" />)}
        </div>
        <div className="h-96 rounded-3xl bg-base-200/50 animate-pulse" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-3.464-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-semibold">Client introuvable</h2>
        <Link href="/clients" className="btn btn-outline btn-sm">Retour aux clients</Link>
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
              Historique des paiements
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
                <p className="text-sm text-base-content/50">
                  {customer.phone || '\u2014'}
                  {customer.city && <span> \u00B7 {customer.city}</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/clients/${customerId}`} className="btn btn-outline btn-sm gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Profil client
            </Link>
            <Link href="/clients" className="btn btn-outline btn-sm">
              Tous les clients
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
        <span className="text-xs text-base-content/40 ml-2">({periodLabel})</span>
      </div>

      {/* ---------- Global Stats ---------- */}
      {cardTotals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
            <p className="text-sm font-medium text-base-content/50">Total payé</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-base-content">{fCF(cardTotals.totalPaid)} GNF</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
          <div className="rounded-2xl border border-base-200/80 bg-base-100/60 p-5">
            <p className="text-sm font-medium text-base-content/50">Restant du</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-base-content">{fCF(cardTotals.totalRemaining)} GNF</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
          <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
            <p className="text-sm font-medium text-base-content/50">Bénéfice brut</p>
            <p className={`mt-2 text-2xl font-semibold tracking-tight ${cardTotals.totalProfit >= 0 ? 'text-success' : 'text-error'}`}>{fCF(cardTotals.totalProfit)} GNF</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
          <div className="rounded-2xl border border-base-200/80 bg-base-100/60 p-5">
            <p className="text-sm font-medium text-base-content/50">Articles vendus</p>
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
                <th className="w-12"></th>
                <th>Facture</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <span className="inline-flex items-center gap-1">
                    Date
                    {sortField === 'date' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )}
                  </span>
                </th>
                <th>Articles</th>
                <th className="text-right">Montant</th>
                <th className="text-right">Payé</th>
                <th className="text-right">Reste</th>
                <th className="text-right">Bénéfice</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-base-content/40">Aucune facture trouvée</td></tr>
                ) : (
                  filteredInvoices.map((inv: Invoice, idx: number) => (
                    <motion.tr
                      key={inv.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className="group hover:bg-base-200/40 transition-colors"
                    >
                      <td><PaymentIcon method={inv.paymentMethod} /></td>
                      <td>
                        <Link href={`/ventes/${inv.id}`} className="font-medium text-primary hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="text-base-content/70 whitespace-nowrap">
                        {new Date(inv.date + 'T12:00:00').toLocaleDateString('fr-FR')}
                      </td>
                      <td className="text-base-content/70">
                        <span className="inline-flex items-center gap-1.5">
                          {inv.items.length} art.
                          <span className="text-xs text-base-content/30">&middot;</span>
                          <span className="text-xs text-base-content/40">{inv.items.reduce((s: number, i: any) => s + i.quantity, 0)} u.</span>
                        </span>
                      </td>
                      <td className="text-right font-medium tabular-nums">{fCF(inv.totalAmount)}</td>
                      <td className="text-right tabular-nums text-base-content/70">{fCF(inv.amountPaid)}</td>
                      <td className="text-right tabular-nums text-base-content/70">{fCF(inv.remainingAmount)}</td>
                      <td className={`text-right tabular-nums font-medium ${
                        (inv.grossProfit ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                      }`}>
                        {fCF(inv.grossProfit ?? 0)}
                      </td>
                      <td><StatusBadge status={inv.paymentStatus} /></td>
                      <td>
                        <Link
                          href={`/ventes/${inv.id}`}
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
