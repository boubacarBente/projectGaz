'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { useSearchFilter, SearchBar, Pagination } from '@/components/search-filter';
import { Modal } from '@/components/modal';

type StockItem = {
  productId: number;
  productCode: string;
  productName: string;
  capacity: string;
  currentStock: number;
  minStock: number;
  lastEntry: string | null;
  lastExit: string | null;
};

type StockMovement = {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  type: 'entry' | 'exit' | 'adjustment' | 'return';
  quantity: number;
  reference: string;
  notes: string;
  createdAt: string;
};

type Product = {
  id: number;
  code: string;
  name: string;
  capacity: string;
  unitPrice: number;
};



interface MovementFormData {
  productId: string;
  type: string;
  quantity: string;
  reference: string;
  notes: string;
}

const initialMovementForm: MovementFormData = {
  productId: '',
  type: 'entry',
  quantity: '',
  reference: '',
  notes: '',
};

interface StockSettingsFormData {
  productId: string;
  minStock: string;
}

const initialSettingsForm: StockSettingsFormData = {
  productId: '',
  minStock: '',
};

function getMovementTypeLabel(type: string) {
  switch (type) {
    case 'entry': return { label: 'Entrée', color: 'badge-success' };
    case 'exit': return { label: 'Sortie', color: 'badge-error' };
    case 'return': return { label: 'Retour', color: 'badge-warning' };
    case 'adjustment': return { label: 'Ajustement', color: 'badge-info' };
    default: return { label: type, color: 'badge-ghost' };
  }
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stock' | 'movements' | 'alerts'>('stock');
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [movementForm, setMovementForm] = useState<MovementFormData>(initialMovementForm);
  const [settingsForm, setSettingsForm] = useState<StockSettingsFormData>(initialSettingsForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { search, setSearch, currentPage, setCurrentPage, filtered } = useSearchFilter(stock, ['productCode', 'productName']);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [stockRes, productsRes, movementsRes, alertsRes] = await Promise.all([
        fetch('/api/stock'),
        fetch('/api/produits'),
        fetch('/api/stock?type=movements'),
        fetch('/api/stock?type=alerts'),
      ]);
      const stockData = await stockRes.json();
      const productsData = await productsRes.json();
      const movementsData = await movementsRes.json();
      const alertsData = await alertsRes.json();
      
      setStock(stockData);
      setProducts(productsData);
      setMovements(movementsData);
      
      if (productsData.length > 0) {
        setMovementForm(prev => ({ ...prev, productId: productsData[0].id.toString() }));
      }
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: movementForm.productId,
          type: movementForm.type,
          quantity: parseInt(movementForm.quantity),
          reference: movementForm.reference,
          notes: movementForm.notes,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Mouvement de stock enregistré!');
      setShowMovementModal(false);
      setMovementForm(initialMovementForm);
      if (products.length > 0) {
        setMovementForm(prev => ({ ...prev, productId: products[0].id.toString() }));
      }
      fetchData();
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMinStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: settingsForm.productId,
          minStock: parseInt(settingsForm.minStock),
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Seuil de stock mis à jour!');
      setShowSettingsModal(false);
      setSettingsForm(initialSettingsForm);
      fetchData();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSettingsModal = (item: StockItem) => {
    setSettingsForm({
      productId: item.productId.toString(),
      minStock: item.minStock.toString(),
    });
    setShowSettingsModal(true);
  };

  const totalStock = stock.reduce((sum, s) => sum + s.currentStock, 0);
  const lowStockItems = stock.filter(s => s.currentStock <= s.minStock);
  const outOfStock = stock.filter(s => s.currentStock === 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stock"
        title="Gestion du stock"
        description="Suivi des bouteilles en stock, mouvements et alertes de réapprovisionnement."
        actions={
          <button
            onClick={() => {
              if (products.length > 0) {
                setMovementForm(prev => ({ ...prev, productId: products[0].id.toString() }));
              }
              setShowMovementModal(true);
            }}
            className="btn btn-primary gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau mouvement
          </button>
        }
      />

      {/* Tabs */}
      <div className="tabs tabs-boxed w-fit">
        <button 
          className={`tab ${activeTab === 'stock' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          Stock actuel
        </button>
        <button 
          className={`tab ${activeTab === 'movements' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('movements')}
        >
          Mouvements
        </button>
        <button 
          className={`tab ${activeTab === 'alerts' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <span className="flex items-center gap-1">
            Alertes
            {lowStockItems.length > 0 && (
              <span className="badge badge-error badge-xs">{lowStockItems.length}</span>
            )}
          </span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total en stock</div>
            <div className="stat-value text-primary">{totalStock}</div>
            <div className="stat-desc">bouteilles</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Stock faible</div>
            <div className="stat-value text-warning">{lowStockItems.length}</div>
            <div className="stat-desc">sous le seuil</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Rupture</div>
            <div className="stat-value text-error">{outOfStock.length}</div>
            <div className="stat-desc">épuisé</div>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      {activeTab === 'stock' && (
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Stock par produit</h3>
            <p className="text-sm text-base-content/60">{stock.length} produit(s) enregistré(s)</p>
          </div>
          
          {stock.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200 px-4 py-12 text-center">
              <p className="text-base-content/70">Aucun produit en stock.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Capacité</th>
                    <th className="text-right">Stock actuel</th>
                    <th className="text-right">Seuil min</th>
                    <th>Dernière entrée</th>
                    <th>Dernière sortie</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((item) => {
                    const isLow = item.currentStock <= item.minStock;
                    const isOut = item.currentStock === 0;
                    return (
                      <tr key={item.productId} className={isOut ? 'bg-red-50 dark:bg-red-950/40' : isLow ? 'bg-amber-50 dark:bg-amber-950/40' : ''}>
                        <td className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="badge badge-neutral badge-sm">{item.productCode}</span>
                            {item.productName}
                          </div>
                        </td>
                        <td>{item.capacity}</td>
                        <td className={`text-right font-semibold ${isOut ? 'text-error' : isLow ? 'text-warning' : ''}`}>
                          {item.currentStock}
                        </td>
                        <td className="text-right">{item.minStock}</td>
                        <td className="text-sm">
                          {item.lastEntry ? new Date(item.lastEntry).toLocaleDateString('fr-MA') : '-'}
                        </td>
                        <td className="text-sm">
                          {item.lastExit ? new Date(item.lastExit).toLocaleDateString('fr-MA') : '-'}
                        </td>
                        <td className="text-right">
                          <button onClick={() => openSettingsModal(item)} className="btn btn-ghost btn-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Movements Table */}
      {activeTab === 'movements' && (
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Historique des mouvements</h3>
            <p className="text-sm text-base-content/60">{movements.length} mouvement(s)</p>
          </div>
          
          {movements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 bg-base-200 px-4 py-12 text-center">
              <p className="text-base-content/70">Aucun mouvement de stock.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Produit</th>
                    <th>Type</th>
                    <th className="text-right">Quantité</th>
                    <th>Référence</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const typeInfo = getMovementTypeLabel(movement.type);
                    return (
                      <tr key={movement.id}>
                        <td className="text-sm">{new Date(movement.createdAt).toLocaleString('fr-MA')}</td>
                        <td>
                          <span className="badge badge-neutral badge-sm">{movement.productCode}</span>
                        </td>
                        <td>
                          <span className={`badge ${typeInfo.color} badge-sm`}>{typeInfo.label}</span>
                        </td>
                        <td className={`text-right font-medium ${movement.type === 'exit' ? 'text-error' : 'text-success'}`}>
                          {movement.type === 'exit' ? '-' : '+'}{movement.quantity}
                        </td>
                        <td className="text-sm">{movement.reference}</td>
                        <td className="text-sm text-base-content/60">{movement.notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {activeTab === 'alerts' && (
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Alertes de stock</h3>
            <p className="text-sm text-base-content/60">Produits nécessitant une attention</p>
          </div>
          
          {lowStockItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/40 px-4 py-12 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-700 dark:text-green-300 font-medium">Tous les stocks sont OK!</p>
              <p className="text-sm text-green-600 dark:text-green-400">Aucun produit n'est sous le seuil minimum.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((item) => {
                const isOut = item.currentStock === 0;
                return (
                  <div key={item.productId} className={`flex items-center justify-between p-4 rounded-xl ${isOut ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isOut ? 'bg-error/20' : 'bg-warning/20'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isOut ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">{item.productName} ({item.productCode})</p>
                        <p className="text-sm text-base-content/60">Capacité: {item.capacity}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isOut ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {item.currentStock} / {item.minStock}
                      </p>
                      <p className="text-xs text-base-content/60">Stock actuel / Seuil min</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Movement Modal */}
      <Modal isOpen={showMovementModal} onClose={() => setShowMovementModal(false)} title="Nouveau mouvement de stock" size="md">
        <form onSubmit={handleAddMovement} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Produit *</span>
            </label>
            <select
              required
              value={movementForm.productId}
              onChange={(e) => setMovementForm({ ...movementForm, productId: e.target.value })}
              className="select select-bordered"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.capacity})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Type de mouvement *</span>
              </label>
              <select
                required
                value={movementForm.type}
                onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value })}
                className="select select-bordered"
              >
                <option value="entry">Entrée (approvisionnement)</option>
                <option value="exit">Sortie (vente/autre)</option>
                <option value="return">Retour (bouteille vide)</option>
                <option value="adjustment">Ajustement</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Quantité *</span>
              </label>
              <input
                type="number" step="any"
                required
                
                value={movementForm.quantity}
                onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                className="input input-bordered"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Référence *</span>
            </label>
            <input
              type="text"
              required
              value={movementForm.reference}
              onChange={(e) => setMovementForm({ ...movementForm, reference: e.target.value })}
              className="input input-bordered"
              placeholder="N° facture, bordereau..."
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Notes</span>
            </label>
            <textarea
              value={movementForm.notes}
              onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
              className="textarea textarea-bordered"
              rows={2}
              placeholder="Observations..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button type="button" onClick={() => setShowMovementModal(false)} className="btn btn-ghost">
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

      {/* Settings Modal */}
      <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Paramètres du stock" size="sm">
        <form onSubmit={handleUpdateMinStock} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Seuil minimum *</span>
            </label>
            <input
              type="number" step="any"
              required
              
              value={settingsForm.minStock}
              onChange={(e) => setSettingsForm({ ...settingsForm, minStock: e.target.value })}
              className="input input-bordered"
              placeholder="10"
            />
            <label className="label">
              <span className="label-text-alt">Alerte quand le stock atteint cette valeur</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button type="button" onClick={() => setShowSettingsModal(false)} className="btn btn-ghost">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
