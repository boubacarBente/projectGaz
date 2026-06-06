'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { useSearchFilter, SearchBar, FilterSelect, Pagination } from '@/components/search-filter';
import { Modal } from '@/components/modal';

type Transaction = {
  id: number;
  amount: number;
  type: 'income' | 'expense';
  description: string | null;
  balanceAfter: number;
  createdAt: string;
  updatedAt: string;
};

type Summary = {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  transactionsCount: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PortefeuillePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulaire
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const { search, setSearch, filter, setFilter, currentPage, setCurrentPage, filtered } = useSearchFilter(
    transactions,
    ['description', 'type'],
    (item, filterValue) => {
      if (filterValue === 'income') return item.type === 'income';
      if (filterValue === 'expense') return item.type === 'expense';
      return true;
    }
  );

  const ITEMS_PER_PAGE = 15;

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [txRes, summaryRes] = await Promise.all([
        fetch('/api/wallet'),
        fetch('/api/wallet/summary'),
      ]);
      const txData = await txRes.json();
      const summaryData = await summaryRes.json();
      setTransactions(txData);
      setSummary(summaryData);
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormType('income');
    setFormAmount('');
    setFormDescription('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          type: formType,
          description: formDescription,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Transaction enregistrée avec succès!');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (tx: Transaction) => {
    setSelectedTx(tx);
    setFormType(tx.type);
    setFormAmount(tx.amount.toString());
    setFormDescription(tx.description || '');
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/wallet/${selectedTx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          type: formType,
          description: formDescription,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Transaction modifiée avec succès!');
      setShowEditModal(false);
      setSelectedTx(null);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (tx: Transaction) => {
    setSelectedTx(tx);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedTx) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/wallet/${selectedTx.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Transaction supprimée');
      setShowDeleteModal(false);
      setSelectedTx(null);
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestion financière"
        title="Portefeuille"
        description="Suivez vos entrées et sorties d'argent avec un solde mis à jour automatiquement."
        actions={
          <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle transaction
          </button>
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title">Solde actuel</div>
            <div className={`stat-value text-2xl ${(summary?.currentBalance ?? 0) >= 0 ? 'text-success' : 'text-error'}`}>
              {formatCurrency(summary?.currentBalance ?? 0)} GNF
            </div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title">Total entrées</div>
            <div className="stat-value text-2xl text-success">{formatCurrency(summary?.totalIncome ?? 0)} GNF</div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title">Total sorties</div>
            <div className="stat-value text-2xl text-error">{formatCurrency(summary?.totalExpense ?? 0)} GNF</div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title">Transactions</div>
            <div className="stat-value text-2xl">{summary?.transactionsCount ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Rechercher par description..."
            />
          </div>
          <FilterSelect
            value={filter}
            onChange={(v) => { setFilter(v); }}
            options={[
              { value: 'income', label: 'Entrées' },
              { value: 'expense', label: 'Sorties' },
            ]}
            placeholder="Tous les types"
          />
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-base-content/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium mb-1">Aucune transaction</p>
            <p className="text-sm">Ajoutez votre première transaction pour commencer.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="text-right">Montant</th>
                    <th>Description</th>
                    <th className="text-right">Solde</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-sm">{formatDate(tx.createdAt)}</td>
                      <td>
                        {tx.type === 'income' ? (
                          <span className="badge badge-success badge-sm">Entrée</span>
                        ) : (
                          <span className="badge badge-error badge-sm">Sortie</span>
                        )}
                      </td>
                      <td className={`text-right font-medium ${tx.type === 'income' ? 'text-success' : 'text-error'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)} GNF
                      </td>
                      <td className="text-sm text-base-content/70 max-w-[200px] truncate">
                        {tx.description || '—'}
                      </td>
                      <td className="text-right text-sm font-medium">
                        {formatCurrency(tx.balanceAfter)} GNF
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => openEditModal(tx)}
                          className="btn btn-ghost btn-xs btn-square text-info"
                          title="Modifier"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(tx)}
                          className="btn btn-ghost btn-xs btn-square text-error"
                          title="Supprimer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title="Nouvelle transaction"
        size="md"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormType('income')}
              className={`btn flex-1 ${formType === 'income' ? 'btn-success text-white' : 'btn-ghost border border-base-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Entrée
            </button>
            <button
              type="button"
              onClick={() => setFormType('expense')}
              className={`btn flex-1 ${formType === 'expense' ? 'btn-error text-white' : 'btn-ghost border border-base-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Sortie
            </button>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Montant (GNF)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="Ex: 100000"
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description (optionnelle)</span>
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Ex: Vente de bouteilles, Achat fournisseur..."
              className="textarea textarea-bordered w-full"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
            <button
              type="button"
              onClick={() => { setShowAddModal(false); resetForm(); }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ajouter
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedTx(null); resetForm(); }}
        title="Modifier la transaction"
        size="md"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormType('income')}
              className={`btn flex-1 ${formType === 'income' ? 'btn-success text-white' : 'btn-ghost border border-base-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Entrée
            </button>
            <button
              type="button"
              onClick={() => setFormType('expense')}
              className={`btn flex-1 ${formType === 'expense' ? 'btn-error text-white' : 'btn-ghost border border-base-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Sortie
            </button>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Montant (GNF)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description (optionnelle)</span>
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="textarea textarea-bordered w-full"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
            <button
              type="button"
              onClick={() => { setShowEditModal(false); setSelectedTx(null); resetForm(); }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedTx(null); }}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-error/10 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-base-content/70">
              Êtes-vous sûr de vouloir supprimer cette transaction ?
              <br />
              <span className="text-sm">Les soldes des transactions suivantes seront recalculés.</span>
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button
              type="button"
              onClick={() => { setShowDeleteModal(false); setSelectedTx(null); }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button onClick={handleDelete} disabled={isSubmitting} className="btn btn-error">
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
