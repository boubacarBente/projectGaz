'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { useSearchFilter, SearchBar, Pagination } from '@/components/search-filter';
import { Modal } from '@/components/modal';

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
  const { search, setSearch, currentPage, setCurrentPage, filtered } = useSearchFilter(suppliers, ['name', 'phone', 'address']);
  const ITEMS_PER_PAGE = 10;

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
        <span className="loading loading-spinner loading-lg text-primary"></span>
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
            <div className="stat-value text-primary">{suppliers.length}</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total achats</div>
            <div className="stat-value text-primary">{formatCurrency(totalAmount)} GNF</div>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Nouveau fournisseur
      </button>

      {/* Suppliers Table */}
      {suppliers.length === 0 ? (
        <div className="text-center py-12 text-base-content/60">
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
                  <td className="font-semibold text-primary">{formatCurrency(supplier.totalPurchases)} GNF</td>
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
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0v2m0-2v-2m0 2H9m2 2v-2m0 2h6m-6 0H7m14 0v2m0-2v-2m0 2H9" />
            </svg>
            Nouveau fournisseur
          </div>
        }
      >
        <form onSubmit={handleAddSupplier} className="space-y-6 p-3">
          {/* Section: Informations */}
          <div className="bg-base-200/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0v2m0-2v-2m0 2H9m2 2v-2m0 2h6" />
              </svg>
              Informations du fournisseur
            </h4>
            <div className='flex justify-center gap-4 '>
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-medium text-sm">Nom *</span></label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors w-full" placeholder="Nom de l'usine ou du fournisseur" />
              </div>
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-medium text-sm">Téléphone</span></label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors w-full" placeholder="+224 6XX XXXXXX" />
              </div>
            </div>

          </div>

          {/* Section: Adresse */}
          <div className="space-y-4 pt-2">
            <h4 className="font-semibold text-sm text-base-content/70 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Adresse
            </h4>
            <div className="form-control">
              <label className="label"><span className="label-text font-medium text-sm">Adresse</span></label>
              <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors w-full" placeholder="Adresse du fournisseur" />
            </div>
          </div>

          {/* Section: Notes */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium text-sm">Notes (optionnel)</span></label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="textarea textarea-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors w-full" rows={3} placeholder="Informations supplémentaires..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary gap-2">
              {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : (
                <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Ajouter le fournisseur</>
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
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0v2m0-2v-2m0 2H9m2 2v-2m0 2h6" />
            </svg>
            {selectedSupplier?.supplier.name}
          </div>
        }
      >
        {selectedSupplier && (
          <div className="space-y-5">
            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-base-200/30 rounded-xl p-4">
                <p className="text-xs text-base-content/60 uppercase tracking-wide mb-1">Téléphone</p>
                <p className="font-medium">{selectedSupplier.supplier.phone || '-'}</p>
              </div>
              <div className="bg-primary/10 rounded-xl p-4">
                <p className="text-xs text-primary/70 uppercase tracking-wide mb-1">Total achats</p>
                <p className="font-bold text-primary text-lg">{formatCurrency(selectedSupplier.supplier.totalPurchases)} GNF</p>
              </div>
            </div>

            {selectedSupplier.supplier.address && (
              <div className="bg-base-200/30 rounded-xl p-4 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/50 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm">{selectedSupplier.supplier.address}</p>
              </div>
            )}

            {/* Invoices */}
            <div className="border-t border-base-200 pt-5">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Factures ({selectedSupplier.invoices.length})
              </h4>
              {selectedSupplier.invoices.length === 0 ? (
                <p className="text-base-content/60 py-4 text-center">Aucune facture</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
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
                          <td className="font-medium">{inv.reference}</td>
                          <td>{new Date(inv.date).toLocaleDateString('fr-FR')}</td>
                          <td className="text-right text-primary font-medium">{formatCurrency(inv.totalAmount)} GNF</td>
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