'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { useSearchFilter, SearchBar, Pagination } from '@/components/search-filter';
import { Modal } from '@/components/modal';
import { ResponsiveTable, type Column } from '@/components/responsive-table';

interface Product {
  id: number;
  code: string;
  name: string;
  capacity: string;
  unitPrice: number;
  salePrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const sizeClasses = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

interface ProductFormData {
  code: string;
  name: string;
  capacity: string;
  unitPrice: string;
  salePrice: string;
  isActive: boolean;
}

const initialFormData: ProductFormData = {
  code: '',
  name: '',
  capacity: '',
  unitPrice: '',
  salePrice: '',
  isActive: true,
};

export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [produitsStats, setProduitsStats] = useState<{ total: number; activeCount: number; averageSalePrice: number } | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const { search, setSearch, currentPage, setCurrentPage } = useSearchFilter(products, ['code', 'name', 'capacity']);
  const ITEMS_PER_PAGE = 10;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, search]);
  useEffect(() => { fetchProduitsStats(); }, []);

  const fetchProduitsStats = async () => {
    try { const res = await fetch('/api/produits/stats'); const data = await res.json(); setProduitsStats(data); }
    catch { /* silent */ }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('all', 'true');
      params.set('page', String(currentPage));
      params.set('limit', String(ITEMS_PER_PAGE));
      if (search) params.set('search', search);
      const res = await fetch(`/api/produits?${params}`);
      const data = await res.json();
      setProducts(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => setFormData(initialFormData);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const unitPriceNum = parseFloat(formData.unitPrice);
    const salePriceNum = parseFloat(formData.salePrice);
    if (isNaN(unitPriceNum) || unitPriceNum <= 0 || isNaN(salePriceNum) || salePriceNum <= 0) {
      toast.error('Prix achat ou vente invalide');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/produits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          capacity: formData.capacity,
          unitPrice: parseFloat(formData.unitPrice),
          salePrice: parseFloat(formData.salePrice),
          isActive: formData.isActive,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Produit ajouté avec succès!');
      setShowAddModal(false);
      resetForm();
      fetchProducts();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const unitPriceNum = parseFloat(formData.unitPrice);
    const salePriceNum = parseFloat(formData.salePrice);
    if (isNaN(unitPriceNum) || unitPriceNum <= 0 || isNaN(salePriceNum) || salePriceNum <= 0) {
      toast.error('Prix achat ou vente invalide');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/produits/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code,
          name: formData.name,
          capacity: formData.capacity,
          unitPrice: parseFloat(formData.unitPrice),
          salePrice: parseFloat(formData.salePrice),
          isActive: formData.isActive,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Produit modifié avec succès!');
      setShowEditModal(false);
      setSelectedProduct(null);
      resetForm();
      fetchProducts();
    } catch {
      toast.error('Erreur lors de la modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/produits/${selectedProduct.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Produit supprimé avec succès!');
      setShowDeleteModal(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      capacity: product.capacity,
      unitPrice: product.unitPrice.toString(),
      salePrice: product.salePrice.toString(),
      isActive: product.isActive,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const openDetailModal = async (product: Product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
    setIsDetailLoading(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'GNF',
    }).format(amount);

  const activeProducts = produitsStats?.activeCount ?? 0;
  const averageSalePrice = produitsStats?.averageSalePrice ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Produits"
        title="Catalogue et tarifs"
        description="Gestion du catalogue des bouteilles de gaz avec ajout, modification et suppression."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="btn btn-primary gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Nouveau produit
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Produits en base</div>
            <div className="stat-value text-primary">{total}</div>
            <div className="stat-desc">Produits enregistrés</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Produits actifs</div>
            <div className="stat-value text-success">{activeProducts}</div>
            <div className="stat-desc">Produits en vente</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Prix moyen vente</div>
            <div className="stat-value text-info">
              {formatCurrency(averageSalePrice)}
            </div>
            <div className="stat-desc">Prix moyen de vente</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 shadow-lg shadow-black/5 backdrop-blur">
        <div className="border-b border-base-200 p-4">
          <h3 className="font-semibold text-lg">Liste des produits</h3>
        </div>
        <div className="p-4">
          <SearchBar value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Rechercher par code, nom ou capacité..." />
        </div>
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : (
            <ResponsiveTable
              columns={[
                { key: 'code', label: 'Code', primary: true, render: (p) => <span className="font-semibold">{p.code}</span> },
                { key: 'name', label: 'Désignation', render: (p) => <span className="font-medium">{p.name}</span> },
                { key: 'capacity', label: 'Capacité', hideOnMobile: true, render: (p) => <span className="badge badge-outline">{p.capacity}</span> },
                { key: 'unitPrice', label: 'Prix achat', className: 'text-right font-semibold text-primary', render: (p) => formatCurrency(p.unitPrice) },
                { key: 'salePrice', label: 'Prix vente', className: 'text-right font-semibold text-info', render: (p) => formatCurrency(p.salePrice) },
                { key: 'isActive', label: 'Statut', render: (p) => p.isActive
                  ? <span className="badge badge-primary p-3 badge-xs">Actif</span>
                  : <span className="badge bg-amber-600 p-3 badge-xs">Inactif</span>
                },
              ]}
              data={products}
              getRowKey={(p) => p.id}
              actions={(p) => (
                <>
                  <button onClick={() => openDetailModal(p)} className="btn btn-ghost btn-sm btn-square" title="Détails">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                  <button onClick={() => openEditModal(p)} className="btn btn-ghost btn-sm btn-square" title="Modifier">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => openDeleteModal(p)} className="btn btn-ghost btn-sm btn-square" title="Supprimer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </>
              )}
              emptyMessage="Aucun produit trouvé"
            />
          )}
        </div>
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Ajouter un nouveau produit"
        size="lg"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Code produit *</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="input input-bordered"
                placeholder="Ex: B12"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Capacité</span>
              </label>
              <input
                type="text"
                required
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                className="input input-bordered"
                placeholder="Ex: 12 kg"
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label block">
                <span className="label-text font-medium">Désignation *</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input input-bordered w-full"
                placeholder="Très grande bouteille"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prix d'achat (GNF) *</span>
              </label>
              <input
                type="number" step="any"
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({ ...formData, unitPrice: e.target.value })
                }
                className="input input-bordered"
                placeholder="107200"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prix en vente (GNF) *</span>
              </label>
              <input
                type="number" step="any"
                required
                value={formData.salePrice}
                onChange={(e) =>
                  setFormData({ ...formData, salePrice: e.target.value })
                }
                className="input input-bordered"
                placeholder="120000"
              />
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">Produit actif</span>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
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
        onClose={() => {
          setShowEditModal(false);
          setSelectedProduct(null);
          resetForm();
        }}
        title={
          selectedProduct
            ? `Modifier: ${selectedProduct.code}`
            : 'Modifier produit'
        }
        size="lg"
      >
        <form onSubmit={handleEditProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Code produit *</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="input input-bordered"
                placeholder="Ex: B12"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Capacité</span>
              </label>
              <input
                type="text"
                required
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
                className="input input-bordered"
                placeholder="Ex: 12 kg"
              />
            </div>
            <div className="form-control md:col-span-2">
              <label className="label block">
                <span className="label-text font-medium">Désignation *</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input input-bordered w-full"
                placeholder="Très grande bouteille"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prix d'achat (GNF) *</span>
              </label>
              <input
                type="number" step="any"
                required
                value={formData.unitPrice}
                onChange={(e) =>
                  setFormData({ ...formData, unitPrice: e.target.value })
                }
                className="input input-bordered"
                placeholder="107200"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prix en vente (GNF) *</span>
              </label>
              <input
                type="number" step="any"
                required
                value={formData.salePrice}
                onChange={(e) =>
                  setFormData({ ...formData, salePrice: e.target.value })
                }
                className="input input-bordered"
                placeholder="120000"
              />
            </div>
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text font-medium">Produit actif</span>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedProduct(null);
                resetForm();
              }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
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
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProduct(null);
        }}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-error/10 p-3 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-base-content/70">
              Êtes-vous sûr de vouloir supprimer le produit{' '}
              <strong>{selectedProduct?.code}</strong> ?
              <br />
              <span className="text-sm">
                Cette action est irréversible.
              </span>
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedProduct(null);
              }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteProduct}
              disabled={isSubmitting}
              className="btn btn-primary"
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProduct(null);
        }}
        title={
          selectedProduct ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-info flex items-center justify-center text-white font-bold text-sm">
                {selectedProduct.code}
              </div>
              <div>
                <p className="text-lg font-bold">{selectedProduct.name}</p>
                <p className="text-sm font-normal text-base-content/60">{selectedProduct.code} · {selectedProduct.capacity}</p>
              </div>
            </div>
          ) : 'Détails du produit'
        }
        size="lg"
      >
        {isDetailLoading ? (
          <div className="flex items-center justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary"></span>
          </div>
        ) : selectedProduct && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-base-200/50 rounded-xl p-4 text-center">
                <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Prix achat</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(selectedProduct.unitPrice)}</p>
              </div>
              <div className="bg-base-200/50 rounded-xl p-4 text-center">
                <p className="text-xs text-base-content/50 uppercase tracking-wide mb-1">Prix vente</p>
                <p className="text-lg font-bold text-info">{formatCurrency(selectedProduct.salePrice)}</p>
              </div>
            </div>

            {/* Info */}
            <div className="bg-base-200/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm text-base-content/70 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Informations
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-base-content/50">Code produit</span>
                  <p className="font-medium">{selectedProduct.code}</p>
                </div>
                <div>
                  <span className="text-base-content/50">Désignation</span>
                  <p className="font-medium">{selectedProduct.name}</p>
                </div>
                <div>
                  <span className="text-base-content/50">Capacité</span>
                  <p className="font-medium">{selectedProduct.capacity}</p>
                </div>
                <div>
                  <span className="text-base-content/50">Statut</span>
                  <p className="font-medium">
                    {selectedProduct.isActive ? (
                      <span className="badge badge-primary p-2 badge-sm">Actif</span>
                    ) : (
                      <span className="badge bg-amber-600 p-2 badge-sm">Inactif</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-base-content/50">Créé le</span>
                  <p className="font-medium">{new Date(selectedProduct.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <span className="text-base-content/50">Modifié le</span>
                  <p className="font-medium">{new Date(selectedProduct.updatedAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-base-200">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedProduct(null);
                }}
                className="btn btn-ghost"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  if (selectedProduct) openEditModal(selectedProduct);
                }}
                className="btn btn-primary gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
