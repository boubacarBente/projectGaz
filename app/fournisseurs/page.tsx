'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { useSearchFilter, SearchBar, Pagination } from '@/components/search-filter';
import { Modal } from '@/components/modal';
// DatePicker removed

type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  totalPurchases: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type PurchaseInvoiceItem = {
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

type PurchaseInvoice = {
  id: number;
  reference: string;
  date: string;
  totalAmount: number;
  items: PurchaseInvoiceItem[];
};

type SupplierData = {
  supplier: Supplier;
  invoices: PurchaseInvoice[];
};

type FormData = {
  name: string;
  phone: string;
  address: string;
  notes: string;
};

type StatsData = {
  total: { total: number; count: number };
  bySupplier: Array<{ id: number; name: string; total: number; count: number }>;
  byPeriod: Array<{ label: string; total: number; count: number }> | null;
  recentInvoices: Array<{
    id: number; reference: string; date: string; totalAmount: number;
    isPaid: number; supplierName: string; totalItems: number;
  }>;
  filters: { period: string; supplierId: number | null; from: string | null; to: string | null };
};

const initialFormData: FormData = { name: '', phone: '', address: '', notes: '' };

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function formatPeriodLabel(label: string) {
  // '2026-05' → 'mai 2026'
  const parts = label.split('-');
  if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  return label;
}

function SparklineBar({ values, max, color }: { values: number[]; max: number; color: string }) {
  const h = 32;
  return (
    <div className="flex items-end gap-[2px] h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className={`w-2 rounded-t-sm transition-all duration-500 ${color}`}
          style={{ height: `${max > 0 ? (v / max) * h : 0}px` }}
        />
      ))}
    </div>
  );
}

export default function FournisseursPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const { search, setSearch, currentPage, setCurrentPage, filtered } = useSearchFilter(suppliers, ['name', 'phone', 'address']);
  const ITEMS_PER_PAGE = 10;

  // Stats state
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState('month');
  const [statsFrom, setStatsFrom] = useState('');
  const [statsTo, setStatsTo] = useState('');
  const [statsSupplierId, setStatsSupplierId] = useState('');

  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('period', statsPeriod);
      if (statsSupplierId) params.set('supplierId', statsSupplierId);
      if (statsFrom) params.set('from', statsFrom);
      if (statsTo) params.set('to', statsTo);
      const res = await fetch(`/api/fournisseurs/stats?${params.toString()}`);
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setStats(data);
    } catch {
      // silently fail for stats
    } finally {
      setIsStatsLoading(false);
    }
  }, [statsPeriod, statsSupplierId, statsFrom, statsTo]);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/fournisseurs');
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erreur lors du chargement');
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => setFormData(initialFormData);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/fournisseurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          address: formData.address || null,
          notes: formData.notes || null,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Fournisseur ajouté avec succès!');
      setShowAddModal(false);
      resetForm();
      fetchSuppliers();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/fournisseurs/${selectedSupplier.supplier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          address: formData.address || null,
          notes: formData.notes || null,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Fournisseur modifié avec succès!');
      setShowEditModal(false);
      setSelectedSupplier(null);
      resetForm();
      fetchSuppliers();
    } catch {
      toast.error('Erreur lors de la modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!selectedSupplier) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/fournisseurs/${selectedSupplier.supplier.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Fournisseur supprimé avec succès!');
      setShowDeleteModal(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetailModal = async (supplier: Supplier) => {
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/fournisseurs/${supplier.id}`);
      const data = await res.json();
      setSelectedSupplier(data);
      setShowDetailModal(true);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier({ supplier, invoices: [] });
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (supplier: Supplier) => {
    setSelectedSupplier({ supplier, invoices: [] });
    setShowDeleteModal(true);
  };

  const totalAmount = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0);

  if (isLoading && suppliers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestion"
        title="Fournisseurs / Usines"
        description="Gérez vos fournisseurs et consultez l'historique de leurs factures d'achat."
        actions={
          <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn btn-primary gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouveau fournisseur
          </button>
        }
      />

      {/* Search + Stats Dashboard */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 shadow-lg shadow-black/5 backdrop-blur overflow-hidden">
        <div className="p-4 lg:p-6">
          <SearchBar value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Rechercher un fournisseur..." />
        </div>

        {/* Analytics Dashboard */}
        <div className="border-t border-base-200/80 bg-base-200/20">
          <div className="p-4 lg:p-6 space-y-4">
            {/* Period + Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Period selector */}
              <div className="flex rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-sm">
                {(['today', 'total', 'month', 'week', 'day'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setStatsPeriod(p)}
                    className={`px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
                      statsPeriod === p
                        ? 'bg-primary text-primary-content shadow-inner'
                        : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
                    }`}
                  >
                    {p === 'today' ? 'Aujourd\'hui' : p === 'total' ? 'Total' : p === 'month' ? 'Mois' : p === 'week' ? 'Semaine' : 'Jour'}
                  </button>
                ))}
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2">
                <input type="date" value={statsFrom} onChange={e => setStatsFrom(e.target.value)} className="w-36" />
                <span className="text-xs text-base-content/40">—</span>
                <input type="date" value={statsTo} onChange={e => setStatsTo(e.target.value)} className="w-36" />
                {(statsFrom || statsTo) && (
                  <button
                    onClick={() => { setStatsFrom(''); setStatsTo(''); }}
                    className="btn btn-ghost btn-xs btn-square text-error"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Supplier filter */}
              <select
                value={statsSupplierId}
                onChange={(e) => setStatsSupplierId(e.target.value)}
                className="select select-bordered select-sm text-xs min-w-[160px]"
              >
                <option value="">Tous les fournisseurs</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {/* Refresh */}
              <button
                onClick={fetchStats}
                disabled={isStatsLoading}
                className="btn btn-ghost btn-sm btn-square"
                title="Actualiser"
              >
                {isStatsLoading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>

            {/* Key Metrics */}
            <AnimatePresence mode="wait">
              {isStatsLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center py-8"
                >
                  <span className="loading loading-spinner loading-lg text-primary" />
                </motion.div>
              ) : stats ? (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {/* Top-level KPI cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8" />
                      <div className="stat-title text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Volume d'achats
                      </div>
                      <div className="stat-value text-2xl lg:text-3xl tracking-tight">
                        {formatCurrency(stats.total.total)}<span className="text-sm font-medium text-base-content/40 ml-1">GNF</span>
                      </div>
                      <div className="stat-desc flex items-center gap-1 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        {stats.total.count} facture{stats.total.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm">
                      <div className="stat-title text-xs font-semibold tracking-wider uppercase">Fournisseurs</div>
                      <div className="stat-value text-2xl lg:text-3xl tracking-tight">{suppliers.length}</div>
                      <div className="stat-desc">{suppliers.filter(s => s.isActive).length} actifs</div>
                    </div>
                    <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm">
                      <div className="stat-title text-xs font-semibold tracking-wider uppercase">Période</div>
                      <div className="stat-value text-2xl lg:text-3xl tracking-tight">
                        {stats.byPeriod && stats.byPeriod.length > 0
                          ? stats.byPeriod.length
                          : '—'}
                      </div>
                      <div className="stat-desc">
                        {statsPeriod === 'total' ? 'Vue globale' : statsPeriod === 'month' ? 'Mois' : statsPeriod === 'week' ? 'Semaines' : 'Jours'}
                      </div>
                    </div>
                    <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm">
                      <div className="stat-title text-xs font-semibold tracking-wider uppercase">Moyenne/facture</div>
                      <div className="stat-value text-2xl lg:text-3xl tracking-tight">
                        {stats.total.count > 0 ? formatCurrency(Math.round(stats.total.total / stats.total.count)) : '0'}
                        <span className="text-sm font-medium text-base-content/40 ml-1">GNF</span>
                      </div>
                      <div className="stat-desc">Montant moyen par facture</div>
                    </div>
                  </div>

                  {/* Period Chart & Supplier Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Period chart */}
                    <div className="bg-base-100 rounded-xl border border-base-300 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-3">
                        {statsPeriod === 'total' || statsPeriod === 'today' ? 'Achats par fournisseur' : 'Évolution des achats'}
                      </h4>
                      {stats.byPeriod && stats.byPeriod.length > 0 ? (
                        <div className="space-y-2">
                          {stats.byPeriod.slice(-12).map((item) => {
                            const maxVal = Math.max(...stats.byPeriod!.map(p => p.total));
                            const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
                            return (
                              <div key={item.label} className="flex items-center gap-3">
                                <span className="text-xs w-24 text-base-content/60 shrink-0">{formatPeriodLabel(item.label)}</span>
                                <div className="flex-1 h-5 bg-base-200 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(pct, 2)}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="h-full bg-linear-to-r from-primary/70 to-primary rounded-full"
                                  />
                                </div>
                                <span className="text-xs font-semibold w-24 text-right tabular-nums">{formatCurrency(item.total)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : statsPeriod === 'total' && stats.bySupplier && stats.bySupplier.length > 0 ? (
                        <div className="space-y-2">
                          {stats.bySupplier.slice(0, 8).map((item) => {
                            const maxVal = Math.max(...stats.bySupplier.map(s => s.total));
                            const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
                            return (
                              <div key={item.id} className="flex items-center gap-3">
                                <span className="text-xs font-medium w-28 truncate shrink-0">{item.name}</span>
                                <div className="flex-1 h-5 bg-base-200 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.max(pct, 2)}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="h-full bg-linear-to-r from-info/60 to-info rounded-full"
                                  />
                                </div>
                                <span className="text-xs font-semibold w-24 text-right tabular-nums">{formatCurrency(item.total)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8 text-base-content/30 text-sm">
                          Aucune donnée pour cette période
                        </div>
                      )}
                    </div>

                    {/* Recent invoices */}
                    <div className="bg-base-100 rounded-xl border border-base-300">
                      <div className="px-4 py-3 border-b border-base-200 flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/60">Dernières factures</h4>
                        <span className="badge badge-ghost badge-xs">{stats.recentInvoices.length}</span>
                      </div>
                      {stats.recentInvoices.length > 0 ? (
                        <div className="divide-y divide-base-200 max-h-[260px] overflow-y-auto">
                          {stats.recentInvoices.map((inv) => (
                            <div key={inv.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-base-200/50 transition-colors">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">{inv.reference}</span>
                                  <span className={`badge badge-xs ${inv.isPaid ? 'badge-success' : 'badge-warning'}`}>
                                    {inv.isPaid ? 'Payée' : 'Imp.'}
                                  </span>
                                </div>
                                <div className="text-xs text-base-content/50 truncate">{inv.supplierName}</div>
                              </div>
                              <div className="text-right shrink-0 ml-3">
                                <div className="text-sm font-semibold tabular-nums">{formatCurrency(inv.totalAmount)}</div>
                                <div className="text-xs text-base-content/40">{inv.date}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8 text-base-content/30 text-sm">
                          Aucune facture récente
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Supplier ranking bar chart */}
                  {stats.bySupplier && stats.bySupplier.length > 1 && (
                    <div className="bg-base-100 rounded-xl border border-base-300 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-3">Classement des fournisseurs</h4>
                      <div className="flex items-end gap-2 h-32">
                        {stats.bySupplier.slice(0, 10).map((item, idx) => {
                          const maxVal = stats.bySupplier[0].total;
                          const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
                          return (
                            <div key={item.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                              <div className="relative w-full flex flex-col items-center">
                                <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold bg-base-300 px-2 py-0.5 rounded whitespace-nowrap">
                                  {formatCurrency(item.total)}
                                </div>
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: `${Math.max(pct, 3)}%` }}
                                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                                  className={`w-full rounded-t-md ${idx === 0 ? 'bg-primary' : 'bg-primary/40'} transition-colors hover:bg-primary/60`}
                                  style={{ minHeight: '4px' }}
                                />
                              </div>
                              <span className="text-[10px] text-base-content/50 truncate w-full text-center leading-tight">{item.name.split(' ')[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 shadow-lg shadow-black/5 backdrop-blur">
        <div className="border-b border-base-200 p-4"><h3 className="font-semibold text-lg">Liste des fournisseurs</h3></div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8"><span className="loading loading-spinner loading-lg text-primary"></span></div>
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-base-content/60">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0v2m0-2v-2m0 2H9m2 2v-2m0 2h6" /></svg>
              <p>Aucun fournisseur trouvé. Ajoutez votre premier fournisseur.</p>
            </div>
          ) : (
            <table className="table">
              <thead><tr className="bg-base-200"><th className="font-semibold">Fournisseur</th><th className="font-semibold">Contact</th><th className="font-semibold">Adresse</th><th className="font-semibold text-right">Achats</th><th className="font-semibold text-center">Actions</th></tr></thead>
              <tbody>
                {filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-base-200">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-primary text-primary-content w-10 rounded-full text-center">
                            <span className="text-lg">{supplier.name.charAt(0).toUpperCase()}</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">{supplier.name}</div>
                          <div className="text-xs text-base-content/60">
                            {supplier.isActive ? <span className="badge badge-primary badge-xs">Actif</span> : <span className="badge badge-ghost badge-xs">Inactif</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">
                        {supplier.phone && <div className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{supplier.phone}</div>}
                        {!supplier.phone && <span className="text-base-content/40">—</span>}
                      </div>
                    </td>
                    <td className="text-sm text-base-content/70">{supplier.address || <span className="text-base-content/40">—</span>}</td>
                    <td className="text-right font-semibold text-primary">{formatCurrency(supplier.totalPurchases)} GNF</td>
                    <td>
                      <div className="flex justify-center gap-1">
                        <button onClick={() => openDetailModal(supplier)} className="btn btn-ghost btn-sm btn-square" title="Détails">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => openEditModal(supplier)} className="btn btn-ghost btn-sm btn-square" title="Modifier">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => openDeleteModal(supplier)} className="btn btn-ghost btn-sm btn-square" title="Supprimer">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title={
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Nouveau fournisseur
          </div>
        }
        size="lg"
      >
        <form onSubmit={handleAddSupplier} className="space-y-6">
          <div className="bg-base-200/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Nom *</span></label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input input-bordered input-primary focus:input-focus" placeholder="Nom de l'usine ou du fournisseur" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Téléphone</span></label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input input-bordered input-primary focus:input-focus" placeholder="+224 6XX XXXXXX" />
              </div>
              <div className="form-control md:col-span-2">
                <label className="label"><span className="label-text font-medium">Adresse</span></label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input input-bordered input-primary focus:input-focus" placeholder="Adresse du fournisseur" />
              </div>
            </div>
          </div>

          <div className="form-control">
            <label className="label block"><span className="label-text font-medium">Notes (optionnel)</span></label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="textarea textarea-bordered textarea-primary focus:textarea-focus w-full" rows={2} placeholder="Informations supplémentaires..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
            <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="btn btn-ghost">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : (
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Ajouter le fournisseur
                </div>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedSupplier(null); }}
        title={
          selectedSupplier ? (
            <div className="flex items-center gap-3">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content w-10 rounded-full">
                  <span className="text-lg font-bold">{selectedSupplier.supplier.name.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div>
                <div className="text-lg font-bold">{selectedSupplier.supplier.name}</div>
                <div className="text-sm text-base-content/60">
                  {selectedSupplier.supplier.isActive ? <span className="badge badge-primary badge-xs">Actif</span> : <span className="badge badge-ghost badge-xs">Inactif</span>}
                </div>
              </div>
            </div>
          ) : 'Détails du fournisseur'
        }
        size="lg"
      >
        {!selectedSupplier ? null : isDetailLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="stats shadow-sm">
                <div className="stat py-3">
                  <div className="stat-title text-xs">Achats totaux</div>
                  <div className="stat-value text-primary text-lg">{formatCurrency(selectedSupplier.supplier.totalPurchases)} GNF</div>
                </div>
              </div>
              <div className="stats shadow-sm">
                <div className="stat py-3">
                  <div className="stat-title text-xs">Factures</div>
                  <div className="stat-value text-info text-lg">{selectedSupplier.invoices.length}</div>
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="rounded-xl border border-base-200 bg-base-200/30">
              <div className="border-b border-base-200 px-4 py-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Informations de contact
                </h4>
              </div>
              <div className="p-4">
                <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div>
                    <dt className="text-base-content/50 text-xs uppercase tracking-wider">Téléphone</dt>
                    <dd className="font-medium mt-0.5">{selectedSupplier.supplier.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-base-content/50 text-xs uppercase tracking-wider">Adresse</dt>
                    <dd className="font-medium mt-0.5">{selectedSupplier.supplier.address || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-base-content/50 text-xs uppercase tracking-wider">Date d'ajout</dt>
                    <dd className="font-medium mt-0.5">{selectedSupplier.supplier.createdAt ? new Date(selectedSupplier.supplier.createdAt).toLocaleDateString('fr-FR') : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-base-content/50 text-xs uppercase tracking-wider">Dernière modification</dt>
                    <dd className="font-medium mt-0.5">{selectedSupplier.supplier.updatedAt ? new Date(selectedSupplier.supplier.updatedAt).toLocaleDateString('fr-FR') : '—'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Notes */}
            {selectedSupplier.supplier.notes && (
              <div className="rounded-xl border border-base-200 bg-base-200/30">
                <div className="border-b border-base-200 px-4 py-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                    Notes
                  </h4>
                </div>
                <div className="p-4 text-sm text-base-content/80">{selectedSupplier.supplier.notes}</div>
              </div>
            )}

            {/* Invoices */}
            <div className="rounded-xl border border-base-200 bg-base-200/30">
              <div className="border-b border-base-200 px-4 py-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Factures ({selectedSupplier.invoices.length})
                </h4>
              </div>
              {selectedSupplier.invoices.length === 0 ? (
                <div className="p-4 text-sm text-base-content/60 text-center">Aucune facture d'achat pour ce fournisseur.</div>
              ) : (
                <div className="divide-y divide-base-200">
                  {selectedSupplier.invoices.map((inv) => (
                    <details key={inv.id} className="group">
                      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-base-200/50 transition-colors list-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/30 group-open:rotate-90 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-base-content/50 text-xs">Réf.</span>
                            <p className="font-medium">{inv.reference}</p>
                          </div>
                          <div>
                            <span className="text-base-content/50 text-xs">Date</span>
                            <p>{new Date(inv.date).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-base-content/50 text-xs">Total</span>
                            <p className="font-semibold text-primary">{formatCurrency(inv.totalAmount)} GNF</p>
                          </div>
                        </div>
                      </summary>
                      <div className="px-8 pb-4">
                        <table className="table table-xs">
                          <thead>
                            <tr className="text-xs text-base-content/50">
                              <th>Code</th>
                              <th>Produit</th>
                              <th className="text-center">Qté</th>
                              <th className="text-right">Prix unit.</th>
                              <th className="text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.items.map((item, idx) => (
                              <tr key={idx}>
                                <td className="font-mono text-xs">{item.productCode}</td>
                                <td>{item.productName}</td>
                                <td className="text-center">{item.quantity}</td>
                                <td className="text-right">{formatCurrency(item.unitCost)} GNF</td>
                                <td className="text-right font-medium">{formatCurrency(item.totalCost)} GNF</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-base-200">
              <Link
                href={`/fournisseurs/${selectedSupplier.supplier.id}/paiements`}
                className="btn btn-ghost btn-sm gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Historique des factures
              </Link>
              <button onClick={() => { setShowDetailModal(false); openEditModal(selectedSupplier.supplier); }} className="btn btn-primary btn-sm gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Modifier
              </button>
              <button onClick={() => { setShowDetailModal(false); openDeleteModal(selectedSupplier.supplier); }} className="btn btn-ghost btn-sm text-error gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Supprimer
              </button>
              <button onClick={() => { setShowDetailModal(false); setSelectedSupplier(null); }} className="btn btn-ghost btn-sm">Fermer</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedSupplier(null); resetForm(); }}
        title={
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier le fournisseur
          </div>
        }
        size="lg"
      >
        <form onSubmit={handleEditSupplier} className="space-y-6">
          <div className="bg-base-200/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Nom *</span></label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input input-bordered input-primary focus:input-focus" placeholder="Nom de l'usine ou du fournisseur" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Téléphone</span></label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input input-bordered input-primary focus:input-focus" placeholder="+224 6XX XXXXXX" />
              </div>
              <div className="form-control md:col-span-2">
                <label className="label"><span className="label-text font-medium">Adresse</span></label>
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input input-bordered input-primary focus:input-focus" placeholder="Adresse du fournisseur" />
              </div>
            </div>
          </div>

          <div className="form-control">
            <label className="label block"><span className="label-text font-medium">Notes (optionnel)</span></label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="textarea textarea-bordered textarea-primary focus:textarea-focus w-full" rows={2} placeholder="Informations supplémentaires..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
            <button type="button" onClick={() => { setShowEditModal(false); setSelectedSupplier(null); resetForm(); }} className="btn btn-ghost">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : (
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Enregistrer les modifications
                </div>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedSupplier(null); }} title="Confirmer la suppression" size="sm">
        <div className="py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-error/10 p-3 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
            <p className="text-base-content/70">Êtes-vous sûr de vouloir supprimer le fournisseur <strong>{selectedSupplier?.supplier.name}</strong> ?<br /><span className="text-sm">Cette action est irréversible.</span></p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button type="button" onClick={() => { setShowDeleteModal(false); setSelectedSupplier(null); }} className="btn btn-ghost">Annuler</button>
            <button onClick={handleDeleteSupplier} disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Supprimer</>}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}