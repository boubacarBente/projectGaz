'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
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

type FormData = {
  name: string;
  phone: string;
  address: string;
  notes: string;
};

const initialFormData: FormData = { name: '', phone: '', address: '', notes: '' };

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
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

      {/* Search & Add */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un fournisseur..." />
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau fournisseur
        </button>
      </div>

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
              {filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((supplier) => (
                <tr key={supplier.id}>
                  <td className="font-medium">{supplier.name}</td>
                  <td>{supplier.phone || '-'}</td>
                  <td className="font-semibold text-primary">{formatCurrency(supplier.totalPurchases)} GNF</td>
                  <td>
                    <div className="flex gap-2">
                      <button onClick={() => openDetailModal(supplier)} className="btn btn-ghost btn-sm btn-square" title="Détails">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button onClick={() => openEditModal(supplier)} className="btn btn-ghost btn-sm btn-square" title="Modifier">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => openDeleteModal(supplier)} className="btn btn-ghost btn-sm btn-square" title="Supprimer">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
              onPageChange={setCurrentPage}
            />
          </div>
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
        size="lg"
      >
        {selectedSupplier && (
          isDetailLoading
            ? (
              <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            )
            : (
              <div className="space-y-5">
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

                {(selectedSupplier.supplier.address || selectedSupplier.supplier.notes) && (
                  <div className="bg-base-200/30 rounded-xl p-4 space-y-3">
                    {selectedSupplier.supplier.address && (
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/50 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Adresse</p>
                          <p className="text-sm">{selectedSupplier.supplier.address}</p>
                        </div>
                      </div>
                    )}
                    {selectedSupplier.supplier.notes && (
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-base-content/50 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <div>
                          <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Notes</p>
                          <p className="text-sm">{selectedSupplier.supplier.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-t border-base-200 pt-5">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

                <div className="flex justify-end gap-3 pt-2 border-t border-base-200">
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
            )
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
        <form onSubmit={handleEditSupplier} className="space-y-6 p-3">
          <div className="bg-base-200/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0v2m0-2v-2m0 2H9m2 2v-2m0 2h6" />
              </svg>
              Informations du fournisseur
            </h4>
            <div className="flex gap-4">
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

          <div className="form-control">
            <label className="label"><span className="label-text font-medium text-sm">Notes (optionnel)</span></label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="textarea textarea-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors w-full" rows={3} placeholder="Informations supplémentaires..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button type="button" onClick={() => { setShowEditModal(false); setSelectedSupplier(null); resetForm(); }} className="btn btn-ghost">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary gap-2">
              {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : (
                <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Enregistrer les modifications</>
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