'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ---------- types ----------
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

type PeriodKey = 'all' | 'byDay' | 'byWeek' | 'byMonth' | 'byYear';

// ---------- helpers ----------
const fCF = (v: number) => new Intl.NumberFormat('fr-FR').format(v);

const statusCfg: Record<string, { label: string; cls: string }> = {
  Paye:     { label: 'Payée',      cls: 'badge-soft badge-success' },
  Partiel:  { label: 'Partielle',  cls: 'badge-soft badge-warning' },
  'En attente': { label: 'En attente', cls: 'badge-soft badge-error' },
};

function PeriodTabs({ active, onChange }: { active: PeriodKey; onChange: (k: PeriodKey) => void }) {
  const tabs: { key: PeriodKey; label: string }[] = [
    { key: 'all', label: 'Global' },
    { key: 'byYear', label: 'Année' },
    { key: 'byMonth', label: 'Mois' },
    { key: 'byWeek', label: 'Semaine' },
    { key: 'byDay', label: 'Jour' },
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
      {isCash ? '💵' : '💳'}
    </span>
  );
}

// ---------- Main Component ----------
export default function CustomerPaymentsPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodView, setPeriodView] = useState<PeriodKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'totalAmount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/clients/${customerId}/paiements`);
        const d = await res.json();
        setData(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId]);

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

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton */}
        <div className="h-32 rounded-3xl bg-base-200/50 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl bg-base-200/50 animate-pulse" />)}
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

  const periodData: PeriodAgg[] = periodView === 'all' ? [] : aggregates?.[periodView] || [];

  // Compute card totals based on selected period
  const cardTotals = useMemo(() => {
    if (periodView === 'all' || periodData.length === 0) {
      return aggregates?.all || null;
    }
    const totalAmount = periodData.reduce((s, p) => s + p.total, 0);
    const totalPaid = periodData.reduce((s, p) => s + p.paid, 0);
    return {
      totalInvoices: periodData.reduce((s, p) => s + p.count, 0),
      totalAmount,
      totalPaid,
      totalRemaining: totalAmount - totalPaid,
      totalProfit: periodData.reduce((s, p) => s + p.profit, 0),
      totalItems: 0, // items not available in period aggregates
    };
  }, [periodView, periodData, aggregates]);

  return (
    <div className="space-y-8">
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
                  {customer.phone || '—'} 
                  {customer.city && <span> · {customer.city}</span>}
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

      {/* ---------- Global Stats ---------- */}
      {cardTotals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Factures" value={fCF(cardTotals.totalInvoices)} sub={periodView === 'all' ? 'Nombre total' : 'Période sélectionnée'} />
          <StatCard label="Montant total" value={`${fCF(cardTotals.totalAmount)} F`} sub={periodView === 'all' ? 'Toutes factures' : 'Période sélectionnée'} accent />
          <StatCard label="Total payé" value={`${fCF(cardTotals.totalPaid)} F`} sub={periodView === 'all' ? 'Dont acomptes' : 'Période sélectionnée'} />
          <StatCard label="Restant dû" value={`${fCF(cardTotals.totalRemaining)} F`} sub={periodView === 'all' ? 'Impayés' : 'Période sélectionnée'} />
          <StatCard label="Bénéfice brut" value={`${fCF(cardTotals.totalProfit)} F`} sub={periodView === 'all' ? 'Sur les ventes' : 'Période sélectionnée'} accent />
          <StatCard label="Articles vendus" value={cardTotals.totalItems > 0 ? fCF(cardTotals.totalItems) : '—'} sub={periodView === 'all' ? 'Quantité totale' : 'Non disponible par période'} />
        </div>
      )}

      {/* ---------- Period Tabs ---------- */}
      <PeriodTabs active={periodView} onChange={setPeriodView} />

      {/* ---------- Period breakdown ---------- */}
      {periodView !== 'all' && periodData.length > 0 && (
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
                  <th className="text-right">Payé</th>
                  <th className="text-right">Bénéfice</th>
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
                      <td className="text-right font-medium">{fCF(p.total)} F</td>
                      <td className="text-right text-base-content/70">{fCF(p.paid)} F</td>
                      <td className="text-right text-emerald-600 dark:text-emerald-400 font-medium">{fCF(p.profit)} F</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------- Period tabs + Search + Invoices table ---------- */}
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
                          <span className="text-xs text-base-content/30">·</span>
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
