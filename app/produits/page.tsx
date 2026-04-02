'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';

interface Product {
  id: number;
  code: string;
  name: string;
  capacity: string;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
            className={`modal-box ${sizeClasses[size]} w-full relative z-10 shadow-2xl`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold">{title}</h3>
              <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost hover:bg-slate-100">✕</button>
            </div>
            <div className="py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ProductFormData {
  code: string;
  name: string;
  capacity: string;
  unitPrice: string;
  isActive: boolean;
}

const initialFormData: ProductFormData = {
  code: '',
  name: '',
  capacity: '',
  unitPrice: '',
  isActive: true,
};

export default function ProduitsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/produits');
      const data = await res.json();
      setProducts(data);
    } catch {
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => setFormData(initialFormData);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
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
      isActive: product.isActive,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(amount);

  const activeProducts = products.filter((p) => p.isActive).length;
  const averagePrice =
    products.length > 0
      ? Math.round(
          products.reduce((sum, p) => sum + p.unitPrice, 0) / products.length
        )
      : 0;

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
            <div className="stat-value text-primary">{products.length}</div>
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
            <div className="stat-title">Prix moyen catalogue</div>
            <div className="stat-value text-info">
              {formatCurrency(averagePrice)}
            </div>
            <div className="stat-desc">Prix moyen des produits</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/80 bg-white/75 shadow-lg shadow-slate-200/60 backdrop-blur">
        <div className="border-b border-slate-200 p-4">
          <h3 className="font-semibold text-lg">Liste des produits</h3>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mb-4 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10m-8 4l-8 4m8-4l-8-4m-4 10V7"
                />
              </svg>
              <p>Aucun produit trouvé</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr className="bg-slate-50">
                  <th className="font-semibold">Code</th>
                  <th className="font-semibold">Désignation</th>
                  <th className="font-semibold">Capacité</th>
                  <th className="font-semibold text-right">Prix</th>
                  <th className="font-semibold text-center">Statut</th>
                  <th className="font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td>
                      <div className="font-semibold">{product.code}</div>
                    </td>
                    <td>
                      <div className="font-medium">{product.name}</div>
                    </td>
                    <td>
                      <span className="badge badge-outline">
                        {product.capacity}
                      </span>
                    </td>
                    <td className="text-right font-semibold text-primary">
                      {formatCurrency(product.unitPrice)}
                    </td>
                    <td className="text-center">
                      {product.isActive ? (
                        <span className="badge badge-success badge-xs">
                          Actif
                        </span>
                      ) : (
                        <span className="badge badge-ghost badge-xs">
                          Inactif
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="btn btn-ghost btn-sm"
                          title="Modifier"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-info"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(product)}
                          className="btn btn-ghost btn-sm"
                          title="Supprimer"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-error"
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
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
              <label className="label">
                <span className="label-text font-medium">Désignation *</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input input-bordered"
                placeholder="Très grande bouteille"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prix unitaire (MAD) *</span>
              </label>
              <input
                type="number"
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
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
              <label className="label">
                <span className="label-text font-medium">Désignation *</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="input input-bordered"
                placeholder="Très grande bouteille"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Prix unitaire (MAD) *</span>
              </label>
              <input
                type="number"
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
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
              className="btn btn-info"
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
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer le produit{' '}
              <strong>{selectedProduct?.code}</strong> ?
              <br />
              <span className="text-sm">
                Cette action est irréversible.
              </span>
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
              className="btn btn-error"
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
    </div>
  );
}