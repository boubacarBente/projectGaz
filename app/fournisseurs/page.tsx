'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';

type Supplier = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  totalPurchases: number;
  notes: string | null;
  createdAt: string;
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

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 0.95 }}
            className="modal-box max-w-4xl w-full relative z-10 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold">{title}</h3>
              <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost hover:bg-slate-100">✕</button>
            </div>
            <div className="py-4 max-h-[70vh] overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

export default function FournisseursPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' });

  useEffect(() => {
    fetchSuppliers();
  }, []);

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

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/fournisseurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Fournisseur ajouté!');
      setShowAddModal(false);
      setFormData({ name: '', phone: '', address: '', notes: '' });
      fetchSuppliers();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetailModal = async (supplier: Supplier) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/fournisseurs/${supplier.id}`);
      const data = await res.json();
      setSelectedSupplier(data);
      setShowDetailModal(true);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0);

  if (isLoading && suppliers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-warning"></span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        eyebrow="Gestion"
        title="Fournisseurs / Usines"
        description="Gérez vos fournisseurs et consultez leurs factures"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total fournisseurs</div>
            <div className="stat-value text-warning">{suppliers.length}</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total achats</div>
            <div className="stat-value text-warning">{formatCurrency(totalAmount)} GNF</div>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button onClick={() => setShowAddModal(true)} className="btn btn-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Nouveau fournisseur
      </button>

      {/* Suppliers Table */}
      {suppliers.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p>Aucun fournisseur. Ajoutez votre premier fournisseur.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Téléphone</th>
                <th>Total achats</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="font-medium">{supplier.name}</td>
                  <td>{supplier.phone || '-'}</td>
                  <td className="font-semibold text-warning">{formatCurrency(supplier.totalPurchases)} GNF</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => openDetailModal(supplier)} className="btn btn-ghost btn-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-3-4h.01M9 16h.01" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nouveau fournisseur">
        <form onSubmit={handleAddSupplier} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Nom *</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input input-bordered"
              placeholder="Nom de l'usine"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Téléphone</span>
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input input-bordered"
              placeholder="Numéro de téléphone"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Adresse</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input input-bordered"
              placeholder="Adresse"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Notes</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="textarea textarea-bordered"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-warning">
              {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedSupplier(null); }}
        title={`${selectedSupplier?.supplier.name}`}
      >
        {selectedSupplier && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Téléphone</p>
                <p>{selectedSupplier.supplier.phone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total achats</p>
                <p className="font-medium text-warning">{formatCurrency(selectedSupplier.supplier.totalPurchases)} GNF</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Factures ({selectedSupplier.invoices.length})</h4>
              {selectedSupplier.invoices.length === 0 ? (
                <p className="text-slate-500">Aucune facture</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-xs">
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Date</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSupplier.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td>{inv.reference}</td>
                          <td>{new Date(inv.date).toLocaleDateString('fr-FR')}</td>
                          <td className="text-right text-warning">{formatCurrency(inv.totalAmount)} GNF</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}