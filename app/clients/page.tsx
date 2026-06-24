'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/modal';
import { ResponsiveTable, type Column } from '@/components/responsive-table';

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  typeId: number | null;
  totalPurchases: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  type: { id: number; name: string; description: string } | null;
};

type CustomerType = {
  id: number;
  name: string;
  description: string | null;
};

interface ClientFormData { name: string; phone: string; email: string; address: string; city: string; typeId: string; notes: string; newTypeName: string; }
const initialFormData: ClientFormData = { name: '', phone: '', email: '', address: '', city: '', typeId: '', notes: '', newTypeName: '' };

// ---------- helpers ----------
const fCF = (v: number) => new Intl.NumberFormat('fr-FR').format(v);

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ---------- Stat Card ----------
function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
      accent
        ? 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-base-100/60 dark:border-emerald-800/30'
        : 'border-base-200/70 bg-white/60 dark:bg-base-100/40 dark:border-base-700/50'
    }`}>
      <div className="relative z-10">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-base-content/40">{label}</p>
        <p className={`mt-2 text-2xl font-bold tracking-tight ${
          accent ? 'text-emerald-700 dark:text-emerald-400' : 'text-base-content'
        }`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-base-content/35">{hint}</p>}
      </div>
      {accent && (
        <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-emerald-500/5 dark:bg-emerald-400/5 blur-2xl" />
      )}
    </div>
  );
}

// ---------- Top Customer Badge ----------
function TopBadge({ rank }: { rank: number }) {
  const colors = ['text-amber-500', 'text-slate-400', 'text-amber-700'];
  return (
    <span className={`text-xs font-bold ${colors[rank - 1] || 'text-base-content/30'}`}>
      #{rank}
    </span>
  );
}

// ---------- Status Badge ----------
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
      active
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
        : 'bg-base-200 text-base-content/40 dark:bg-base-800'
    }`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${
        active ? 'bg-emerald-500' : 'bg-base-content/20'
      }`} />
      {active ? 'Actif' : 'Inactif'}
    </span>
  );
}

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [clientsStats, setClientsStats] = useState<{ total: number; activeCount: number; totalPurchases: number; topCustomers: Customer[] } | null>(null);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<{ count: number; total: number } | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const ITEMS_PER_PAGE = 10;

  useEffect(() => { fetchCustomers(); }, [search, selectedType, currentPage]);
  useEffect(() => { fetchCustomersStats(); }, []);
  useEffect(() => { fetchCustomerTypes(); }, []);

  const fetchCustomersStats = async () => {
    try {
      const res = await fetch('/api/clients/stats');
      const data = await res.json();
      setClientsStats(data);
    } catch { /* silent */ }
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedType) params.set('typeId', selectedType);
      params.set('page', String(currentPage));
      params.set('limit', String(ITEMS_PER_PAGE));
      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();
      setCustomers(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Erreur lors du chargement des clients'); }
    finally { setIsLoading(false); }
  };

  const fetchCustomerTypes = async () => {
    try {
      const res = await fetch('/api/clients/types');
      const data = await res.json();
      setCustomerTypes(data);
    } catch (error) { console.error('Error:', error); }
  };

  const resetForm = () => setFormData({ name: '', phone: '', email: '', address: '', city: '', typeId: '', notes: '', newTypeName: '' });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let typeId = formData.typeId ? parseInt(formData.typeId) : null;

      if (formData.newTypeName) {
        const typeRes = await fetch('/api/clients/types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.newTypeName, description: null }),
        });
        if (!typeRes.ok) throw new Error('Erreur création type');
        const newType = await typeRes.json();
        typeId = newType.id;
        fetchCustomerTypes();
      }

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, phone: formData.phone || null, email: formData.email || null, address: formData.address || null, city: formData.city || null, typeId, notes: formData.notes || null }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Client ajouté avec succès!');
      setShowAddModal(false);
      resetForm();
      fetchCustomers();
    } catch { toast.error('Erreur lors de la création'); }
    finally { setIsSubmitting(false); }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, phone: formData.phone || null, email: formData.email || null, address: formData.address || null, city: formData.city || null, typeId: formData.typeId ? parseInt(formData.typeId) : null, notes: formData.notes || null }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Client modifié avec succès!');
      setShowEditModal(false);
      setSelectedCustomer(null);
      resetForm();
      fetchCustomers();
    } catch { toast.error('Erreur lors de la modification'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteClient = async () => {
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${selectedCustomer.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Client supprimé avec succès!');
      setShowDeleteModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch { toast.error('Erreur lors de la suppression'); }
    finally { setIsSubmitting(false); }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({ name: customer.name, phone: customer.phone || '', email: customer.email || '', address: customer.address || '', city: customer.city || '', typeId: customer.typeId?.toString() || '', notes: customer.notes || '', newTypeName: '' });
    setShowEditModal(true);
  };

  const openDeleteModal = (customer: Customer) => { setSelectedCustomer(customer); setShowDeleteModal(true); };

  const openDetailModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
    setIsDetailLoading(true);
    setCustomerInvoices(null);

    try {
      const res = await fetch('/api/factures');
      const invoices = await res.json();
      const clientInvoices = invoices.filter(
        (inv: { customerName: string }) => inv.customerName.toLowerCase() === customer.name.toLowerCase()
      );
      setCustomerInvoices({
        count: clientInvoices.length,
        total: clientInvoices.reduce((sum: number, inv: { totalAmount: number }) => sum + inv.totalAmount, 0),
      });
    } catch {
      // Silently fail
    } finally {
      setIsDetailLoading(false);
    }
  };

  const topCustomers = clientsStats?.topCustomers || [];
  const totalAll = clientsStats?.totalPurchases ?? 0;
  const activeCount = clientsStats?.activeCount ?? 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* ---------- Header ---------- */}
      <motion.section variants={item} className="rounded-3xl border border-base-200/80 bg-base-100/80 p-6 md:p-8 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
              Clients
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Gestion des clients</h1>
            <p className="max-w-2xl text-sm leading-7 text-base-content/50">
              Consultation et gestion de la clientèle avec recherche rapide et suivi des meilleurs comptes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddTypeModal(true)} className="btn btn-outline btn-sm gap-1.5 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              Types
            </button>
            <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn btn-primary btn-sm gap-1.5 rounded-xl shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nouveau client
            </button>
          </div>
        </div>
      </motion.section>

      {/* ---------- Stats ---------- */}
      <motion.div variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Clients" value={fCF(total)} hint="Total enregistrés" />
        <StatCard label="Actifs" value={fCF(activeCount)} hint="En activité" />
        <StatCard label="Volume d'achats" value={fCF(totalAll) + " F"} hint="Cumulé toutes factures" accent />
      </motion.div>

      {/* ---------- Search + Table + Top Clients ---------- */}
      <motion.div variants={item} className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Main Table */}
        <div className="lg:col-span-2 rounded-2xl border border-base-200/70 bg-white/80 dark:bg-base-100/50 shadow-md shadow-black/5 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 p-4 border-b border-base-200/50">
            <div className="relative flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="input input-bordered input-sm w-full pl-9 text-sm rounded-xl"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/30 hover:text-base-content/60">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <span className="loading loading-dots loading-md text-emerald-500" />
              </div>
            ) : (
              <ResponsiveTable
                columns={[
                  { key: 'name', label: 'Client', primary: true, render: (c) => (
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 w-9 rounded-xl text-sm font-bold">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{c.name}</div>
                        <StatusBadge active={c.isActive} />
                      </div>
                    </div>
                  )},
                  { key: 'phone', label: 'Contact', hideOnMobile: true, render: (c) => (
                    <span className="text-sm text-base-content/60">{c.phone || '—'}</span>
                  )},
                  { key: 'city', label: 'Ville', hideOnMobile: true, render: (c) => (
                    <span className="text-base-content/60">{c.city || '—'}</span>
                  )},
                  { key: 'type', label: 'Type', render: (c) => c.type ? (
                    <span className="inline-flex items-center rounded-full bg-base-200/70 px-2.5 py-0.5 text-[11px] font-medium text-base-content/60">{c.type.name}</span>
                  ) : <span className="text-base-content/20">—</span> },
                  { key: 'totalPurchases', label: 'Achats', className: 'text-right font-semibold tabular-nums', render: (c) => `${fCF(c.totalPurchases)} F` },
                ]}
                data={customers}
                getRowKey={(c) => c.id}
                actions={(c) => (
                  <div className="flex items-center gap-0.5">
                    <button onClick={() => openDetailModal(c)} className="btn btn-ghost btn-xs btn-square rounded-lg" title="Détails">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button onClick={() => openEditModal(c)} className="btn btn-ghost btn-xs btn-square rounded-lg" title="Modifier">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => openDeleteModal(c)} className="btn btn-ghost btn-xs btn-square rounded-lg" title="Supprimer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400/60 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
                emptyMessage="Aucun client trouvé"
              />
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-base-200/50 px-4 py-3">
            <p className="text-xs text-base-content/40">
              {total} client{total !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn btn-ghost btn-xs btn-square rounded-lg disabled:opacity-20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let start = Math.max(0, currentPage - 3);
                if (start + 5 > totalPages) start = Math.max(0, totalPages - 5);
                const pageIndex = start + i;
                if (pageIndex >= totalPages) return null;
                return (
                  <button
                    key={pageIndex}
                    onClick={() => setCurrentPage(pageIndex + 1)}
                    className={`btn btn-xs btn-square rounded-lg ${
                      currentPage === pageIndex + 1
                        ? 'btn-primary'
                        : 'btn-ghost'
                    }`}
                  >
                    {pageIndex + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
                className="btn btn-ghost btn-xs btn-square rounded-lg disabled:opacity-20"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* ---------- Top Clients Sidebar ---------- */}
        <div className="rounded-2xl border border-base-200/70 bg-white/80 dark:bg-base-100/50 shadow-md shadow-black/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-base-200/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Top 5 clients</h3>
                <p className="text-[11px] text-base-content/40">Meilleurs acheteurs</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-1">
            {topCustomers.length === 0 ? (
              <p className="text-sm text-base-content/40 py-6 text-center">Aucun client</p>
            ) : (
              topCustomers.map((customer, index) => (
                <div
                  key={customer.id}
                  className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                    index === 0
                      ? 'bg-amber-50/80 dark:bg-amber-900/10'
                      : 'hover:bg-base-200/40'
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                    style={{
                      backgroundColor: index === 0 ? '#f59e0b20' : index === 1 ? '#94a3b820' : index === 2 ? '#d9770620' : 'transparent',
                      color: index === 0 ? '#d97706' : index === 1 ? '#64748b' : index === 2 ? '#b45309' : '#94a3b8',
                    }}
                  >
                    <TopBadge rank={index + 1} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{customer.name}</p>
                    <p className="text-[11px] text-base-content/40 truncate">{customer.city || 'N/A'}</p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                    {fCF(customer.totalPurchases)} F
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* ---------- Add Modal ---------- */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title={
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Nouveau client
          </div>
        }
        size="lg"
      >
        <form onSubmit={handleAddClient} className="space-y-6">
          <div className="bg-base-200/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informations personnelles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Nom complet *</span></label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input input-bordered w-full rounded-xl" placeholder="Nom du client" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Téléphone</span></label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input input-bordered w-full rounded-xl" placeholder="+224 6XX-XXXXXX" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Email</span></label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input input-bordered w-full rounded-xl" placeholder="email@exemple.com" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Ville</span></label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="input input-bordered w-full rounded-xl" placeholder="Ville" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-base-200/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Adresse
              </h4>
              <div className="form-control">
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input input-bordered w-full rounded-xl" placeholder="Adresse complète" />
              </div>
            </div>

            <div className="bg-base-200/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Classification
              </h4>
              <div className="form-control">
                <select value={formData.typeId} onChange={(e) => setFormData({ ...formData, typeId: e.target.value, newTypeName: '' })} className="select select-bordered w-full rounded-xl">
                  <option value="">Sélectionner un type...</option>
                  {customerTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Notes (optionnel)</span></label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="textarea textarea-bordered w-full rounded-xl" rows={3} placeholder="Notes supplémentaires..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="btn btn-ghost rounded-xl">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary rounded-xl shadow-sm">
              {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : (
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Ajouter le client
                </span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Detail Modal ---------- */}
      <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedCustomer(null); }} size="lg">
        {!selectedCustomer ? null : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Header avec gradient */}
            <div className="relative -mx-6 -mt-6 mb-2 overflow-hidden rounded-t-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 px-6 pb-8 pt-6">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMi0ydi0ySDI2djJoOHptMC00di0ySDI2djJoOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
              <div className="relative flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold text-white shadow-lg backdrop-blur-sm ring-1 ring-white/30"
                >
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <motion.h2
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                    className="text-xl font-bold text-white truncate"
                  >
                    {selectedCustomer.name}
                  </motion.h2>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="mt-1 flex flex-wrap items-center gap-2 text-sm text-emerald-100"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${selectedCustomer.isActive ? 'bg-emerald-300' : 'bg-white/40'}`} />
                      {selectedCustomer.isActive ? 'Actif' : 'Inactif'}
                    </span>
                    {selectedCustomer.type && (
                      <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                        {selectedCustomer.type.name}
                      </span>
                    )}
                    {selectedCustomer.city && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-200/80">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {selectedCustomer.city}
                      </span>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Stats cards avec icônes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <StatCard
                label="Achats totaux"
                value={`${fCF(selectedCustomer.totalPurchases)} F`}
                hint="Depuis le début"
                accent
              />
              <StatCard
                label="Factures"
                value={isDetailLoading ? '—' : String(customerInvoices?.count ?? 0)}
                hint={isDetailLoading ? 'Chargement...' : `${customerInvoices?.count ?? 0} facture(s)`}
              />
              <StatCard
                label="Total facturé"
                value={isDetailLoading ? '—' : `${fCF(customerInvoices?.total ?? 0)} F`}
                hint={isDetailLoading ? 'Chargement...' : 'Montant cumulé'}
              />
            </motion.div>

            {/* Contact info - cartes horizontales */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div className="flex items-center gap-3 rounded-xl border border-base-200/60 bg-base-50 p-4 transition-colors hover:bg-base-100/80">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-base-content/40">Téléphone</p>
                  <p className="font-medium truncate">{selectedCustomer.phone || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-base-200/60 bg-base-50 p-4 transition-colors hover:bg-base-100/80">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-base-content/40">Email</p>
                  <p className="font-medium truncate">{selectedCustomer.email || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-base-200/60 bg-base-50 p-4 transition-colors hover:bg-base-100/80">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-base-content/40">Adresse</p>
                  <p className="font-medium truncate">{selectedCustomer.address || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-base-200/60 bg-base-50 p-4 transition-colors hover:bg-base-100/80">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-base-content/40">Client depuis</p>
                  <p className="font-medium">{selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
                </div>
              </div>
            </motion.div>

            {/* Notes */}
            {selectedCustomer.notes && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.3 }}
                className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                  <h4 className="font-semibold text-sm text-amber-800">Notes</h4>
                </div>
                <p className="text-sm text-amber-900/80 leading-relaxed">{selectedCustomer.notes}</p>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex flex-wrap justify-end gap-2 border-t border-base-200/60 pt-4"
            >
              <button onClick={() => { setShowDetailModal(false); setSelectedCustomer(null); }} className="btn btn-ghost btn-sm gap-1.5 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                Fermer
              </button>
              <button onClick={() => { setShowDetailModal(false); openEditModal(selectedCustomer); }} className="btn btn-primary btn-sm gap-1.5 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Modifier
              </button>
              <Link
                href={`/clients/${selectedCustomer.id}/paiements`}
                className="btn btn-success btn-sm gap-1.5 rounded-xl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Voir les paiements
              </Link>
            </motion.div>
          </motion.div>
        )}
      </Modal>

      {/* ---------- Edit Modal ---------- */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedCustomer(null); resetForm(); }}
        title={
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier le client
          </div>
        }
        size="lg"
      >
        <form onSubmit={handleEditClient} className="space-y-6">
          <div className="bg-base-200/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informations personnelles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Nom complet *</span></label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input input-bordered w-full rounded-xl" placeholder="Nom du client" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Téléphone</span></label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input input-bordered w-full rounded-xl" placeholder="+224 6XX-XXXXXX" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Email</span></label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input input-bordered w-full rounded-xl" placeholder="email@exemple.com" />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Ville</span></label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="input input-bordered w-full rounded-xl" placeholder="Ville" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-base-200/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Adresse
              </h4>
              <div className="form-control">
                <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input input-bordered w-full rounded-xl" placeholder="Adresse complète" />
              </div>
            </div>

            <div className="bg-base-200/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Classification
              </h4>
              <div className="form-control">
                <select value={formData.typeId} onChange={(e) => setFormData({ ...formData, typeId: e.target.value })} className="select select-bordered w-full rounded-xl">
                  <option value="">Sélectionner un type...</option>
                  {customerTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Notes (optionnel)</span></label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="textarea textarea-bordered w-full rounded-xl" rows={3} placeholder="Notes supplémentaires..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button type="button" onClick={() => { setShowEditModal(false); setSelectedCustomer(null); resetForm(); }} className="btn btn-ghost rounded-xl">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary rounded-xl shadow-sm">
              {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : (
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Enregistrer les modifications
                </span>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Delete Modal ---------- */}
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedCustomer(null); }} title="Confirmer la suppression" size="sm">
        <div className="py-4">
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium">Supprimer <strong>{selectedCustomer?.name}</strong> ?</p>
              <p className="text-sm text-base-content/50 mt-1">Cette action est irréversible. Toutes les données associées seront définitivement perdues.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button type="button" onClick={() => { setShowDeleteModal(false); setSelectedCustomer(null); }} className="btn btn-ghost rounded-xl">Annuler</button>
            <button onClick={handleDeleteClient} disabled={isSubmitting} className="btn btn-error rounded-xl shadow-sm">
              {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : (
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Supprimer
                </span>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ---------- Add Type Modal ---------- */}
      <Modal isOpen={showAddTypeModal} onClose={() => setShowAddTypeModal(false)} title="Nouveau type de client" size="sm">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const name = formData.get('name');
          const description = formData.get('description');

          try {
            const res = await fetch('/api/clients/types', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, description }),
            });
            if (!res.ok) throw new Error('Erreur');
            toast.success('Type de client créé avec succès!');
            setShowAddTypeModal(false);
            fetchCustomerTypes();
          } catch { toast.error('Erreur lors de la création'); }
        }} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-base-content/80">Nom *</label>
            <input type="text" name="name" required className="input input-bordered w-full rounded-xl" placeholder="Ex: Particulier, Entreprise" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-base-content/80">Description</label>
            <textarea name="description" className="textarea textarea-bordered w-full rounded-xl" rows={2} placeholder="Description optionnelle..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddTypeModal(false)} className="btn btn-ghost rounded-xl">Annuler</button>
            <button type="submit" className="btn btn-primary rounded-xl shadow-sm">Créer</button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

