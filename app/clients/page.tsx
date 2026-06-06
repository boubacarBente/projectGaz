'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '@/components/modal';

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
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <span className="loading loading-dots loading-md text-emerald-500" />
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-base-content/40 gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p className="text-sm">Aucun client trouvé</p>
              </div>
            ) : (
              <table className="table text-sm">
                <thead>
                  <tr className="bg-base-200/40 text-xs uppercase tracking-wider text-base-content/50">
                    <th className="font-semibold py-3 pl-4">Client</th>
                    <th className="font-semibold py-3">Contact</th>
                    <th className="font-semibold py-3">Ville</th>
                    <th className="font-semibold py-3">Type</th>
                    <th className="font-semibold py-3 text-right pr-4">Achats</th>
                    <th className="font-semibold py-3 text-center pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <motion.tr
                      key={customer.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group hover:bg-base-200/30 transition-colors"
                    >
                      <td className="pl-4">
                        <div className="flex items-center gap-3">
                          <div className="avatar placeholder">
                            <div className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 w-9 rounded-xl text-sm font-bold">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-sm">{customer.name}</div>
                            <StatusBadge active={customer.isActive} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-base-content/60">
                          {customer.phone || <span className="text-base-content/20">—</span>}
                        </div>
                      </td>
                      <td className="text-base-content/60">{customer.city || <span className="text-base-content/20">—</span>}</td>
                      <td>
                        {customer.type ? (
                          <span className="inline-flex items-center rounded-full bg-base-200/70 px-2.5 py-0.5 text-[11px] font-medium text-base-content/60">
                            {customer.type.name}
                          </span>
                        ) : <span className="text-base-content/20">—</span>}
                      </td>
                      <td className="text-right font-semibold tabular-nums pr-4">{fCF(customer.totalPurchases)} F</td>
                      <td className="text-center pr-4">
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openDetailModal(customer)} className="btn btn-ghost btn-xs btn-square rounded-lg" title="Détails">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => openEditModal(customer)} className="btn btn-ghost btn-xs btn-square rounded-lg" title="Modifier">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => openDeleteModal(customer)} className="btn btn-ghost btn-xs btn-square rounded-lg" title="Supprimer">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400/60 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
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
      <Modal isOpen={showDetailModal} onClose={() => { setShowDetailModal(false); setSelectedCustomer(null); }} title={
        selectedCustomer ? (
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 w-10 rounded-xl text-lg font-bold">
                {selectedCustomer.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-lg font-bold">{selectedCustomer.name}</div>
              <div className="text-sm text-base-content/50 flex items-center gap-2">
                <StatusBadge active={selectedCustomer.isActive} />
                {selectedCustomer.type && <><span className="text-base-content/20">·</span><span>{selectedCustomer.type.name}</span></>}
              </div>
            </div>
          </div>
        ) : 'Détails du client'
      } size="lg">
        {!selectedCustomer ? null : (
          <div className="space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-base-200/60 bg-base-100 p-4">
                <p className="text-xs uppercase tracking-wider text-base-content/40">Achats totaux</p>
                <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">{fCF(selectedCustomer.totalPurchases)} F</p>
              </div>
              <div className="rounded-xl border border-base-200/60 bg-base-100 p-4">
                <p className="text-xs uppercase tracking-wider text-base-content/40">Factures</p>
                <p className="mt-1 text-xl font-bold text-base-content">
                  {isDetailLoading ? <span className="loading loading-spinner loading-xs"></span> : customerInvoices?.count ?? '—'}
                </p>
              </div>
              <div className="rounded-xl border border-base-200/60 bg-base-100 p-4">
                <p className="text-xs uppercase tracking-wider text-base-content/40">Total facturé</p>
                <p className="mt-1 text-xl font-bold text-base-content">
                  {isDetailLoading ? <span className="loading loading-spinner loading-xs"></span> : customerInvoices ? fCF(customerInvoices.total) + ' F' : '—'}
                </p>
              </div>
            </div>

            {/* Contact info */}
            <div className="rounded-xl border border-base-200/60">
              <div className="border-b border-base-200/60 px-5 py-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Informations de contact
                </h4>
              </div>
              <div className="p-5">
                <dl className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-base-content/40">Téléphone</dt>
                    <dd className="font-medium mt-0.5">{selectedCustomer.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-base-content/40">Email</dt>
                    <dd className="font-medium mt-0.5">{selectedCustomer.email || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-base-content/40">Adresse</dt>
                    <dd className="font-medium mt-0.5">{selectedCustomer.address || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-base-content/40">Ville</dt>
                    <dd className="font-medium mt-0.5">{selectedCustomer.city || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-base-content/40">Client depuis</dt>
                    <dd className="font-medium mt-0.5">{selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString('fr-FR') : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-base-content/40">Dernière mise à jour</dt>
                    <dd className="font-medium mt-0.5">{selectedCustomer.updatedAt ? new Date(selectedCustomer.updatedAt).toLocaleDateString('fr-FR') : '—'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Notes */}
            {selectedCustomer.notes && (
              <div className="rounded-xl border border-base-200/60">
                <div className="border-b border-base-200/60 px-5 py-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                    Notes
                  </h4>
                </div>
                <div className="p-5 text-sm text-base-content/70">{selectedCustomer.notes}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-base-200/60">
              <Link
                href={`/clients/${selectedCustomer.id}/paiements`}
                className="btn btn-success btn-sm gap-1.5 rounded-xl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Historique des paiements
              </Link>
              <button onClick={() => { setShowDetailModal(false); openEditModal(selectedCustomer); }} className="btn btn-primary btn-sm gap-1.5 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Modifier
              </button>
              <button onClick={() => { setShowDetailModal(false); setSelectedCustomer(null); }} className="btn btn-ghost btn-sm rounded-xl">Fermer</button>
            </div>
          </div>
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

