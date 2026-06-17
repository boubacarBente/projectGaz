'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { useSearchFilter, SearchBar, Pagination } from '@/components/search-filter';
import { Modal } from '@/components/modal';

interface StockProduct {
  id: number;
  code: string;
  name: string;
  capacity: string;
  stock: number;
  stockMin: number;
  unitPrice: number;
  salePrice: number;
  stockValue: number;
  isLow: boolean;
}

interface StockSummary {
  totalProducts: number;
  totalStock: number;
  totalStockValue: number;
  totalSaleValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface StockMovement {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  referenceType: string | null;
  referenceId: number | null;
  note: string | null;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  entry: 'Entrée',
  exit: 'Sortie',
  adjustment: 'Ajustement',
  initial: 'Initial',
};

const typeColors: Record<string, string> = {
  entry: 'badge-success',
  exit: 'badge-error',
  adjustment: 'badge-warning',
  initial: 'badge-info',
};

function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat('fr-MA').format(value);
  } catch {
    return String(value);
  }
}

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function StocksPage() {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { search, setSearch, currentPage, setCurrentPage } = useSearchFilter(products, ['code', 'name', 'capacity']);
  const ITEMS_PER_PAGE = 10;

  // Modals
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(null);
  const [adjustStockValue, setAdjustStockValue] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Movements
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsTotal, setMovementsTotal] = useState(0);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const [stockRes, summaryRes] = await Promise.all([
        fetch(`/api/stocks?${params}`),
        fetch('/api/stocks/summary'),
      ]);
      const stockData = await stockRes.json();
      const summaryData = await summaryRes.json();
      setProducts(stockData.data || []);
      setSummary(summaryData);
    } catch {
      toast.error('Erreur lors du chargement des stocks');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchMovements = async (productId: number, page = 1) => {
    setMovementsLoading(true);
    try {
      const res = await fetch(`/api/stocks/mouvements?productId=${productId}&page=${page}&limit=10`);
      const data = await res.json();
      setMovements(data.data || []);
      setMovementsTotal(data.total || 0);
    } catch {
      toast.error('Erreur lors du chargement des mouvements');
    } finally {
      setMovementsLoading(false);
    }
  };

  const openAdjustModal = (product: StockProduct) => {
    setSelectedProduct(product);
    setAdjustStockValue(String(product.stock));
    setAdjustNote('');
    setShowAdjustModal(true);
  };

  const openMovementsModal = (product: StockProduct) => {
    setSelectedProduct(product);
    setMovementsPage(1);
    setShowMovementsModal(true);
    fetchMovements(product.id, 1);
  };

  const handleAdjust = async () => {
    if (!selectedProduct) return;
    const newStock = parseInt(adjustStockValue, 10);
    if (isNaN(newStock) || newStock < 0) {
      toast.error('La quantité doit être un nombre positif');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/stocks/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          newStock,
          note: adjustNote || 'Ajustement manuel',
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Stock ajusté avec succès!');
      setShowAdjustModal(false);
      fetchData();
    } catch {
      toast.error("Erreur lors de l'ajustement");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination manuelle
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = products.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Stocks"
        title="Gestion des stocks"
        description="Suivi des entrées, sorties et alertes de stock minimum."
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-200 p-3">
            <div className="stat-title text-xs">Produits</div>
            <div className="stat-value text-2xl">{summary.totalProducts}</div>
          </div>
          <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-200 p-3">
            <div className="stat-title text-xs">Total unités</div>
            <div className="stat-value text-2xl text-primary">{summary.totalStock}</div>
          </div>
          <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-200 p-3">
            <div className="stat-title text-xs">Valeur stock</div>
            <div className="stat-value text-2xl text-info text-sm">{formatCurrency(summary.totalStockValue)} GNF</div>
          </div>
          <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-200 p-3">
            <div className="stat-title text-xs">Vente potentielle</div>
            <div className="stat-value text-2xl text-info text-sm">{formatCurrency(summary.totalSaleValue)} GNF</div>
          </div>
          <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-200 p-3">
            <div className="stat-title text-xs">Stock faible</div>
            <div className={`stat-value text-2xl ${summary.lowStockCount > 0 ? 'text-warning' : ''}`}>
              {summary.lowStockCount}
              {summary.lowStockCount > 0 && <span className="badge badge-warning badge-sm ml-2">Alerte</span>}
            </div>
          </div>
          <div className="stat bg-base-100 rounded-xl shadow-sm border border-base-200 p-3">
            <div className="stat-title text-xs">Rupture</div>
            <div className={`stat-value text-2xl ${summary.outOfStockCount > 0 ? 'text-error' : ''}`}>
              {summary.outOfStockCount}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <SearchBar
            search={search}
            setSearch={setSearch}
            placeholder="Rechercher un produit..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Code</th>
              <th>Produit</th>
              <th>Capacité</th>
              <th className="text-center">Stock</th>
              <th className="text-center">Seuil min</th>
              <th className="text-right">Valeur stock</th>
              <th className="text-center">Statut</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-8">
                  <span className="loading loading-spinner loading-md text-primary"></span>
                </td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-base-content/50">
                  Aucun produit trouvé
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => {
                const isOutOfStock = product.stock === 0;
                const isLow = product.isLow || (product.stockMin > 0 && product.stock <= product.stockMin);
                return (
                  <tr key={product.id} className={isOutOfStock ? 'bg-red-50/50' : isLow ? 'bg-amber-50/50' : ''}>
                    <td className="font-mono font-bold">{product.code}</td>
                    <td>{product.name}</td>
                    <td>{product.capacity}</td>
                    <td className="text-center">
                      <span className={`font-bold text-lg ${
                        isOutOfStock ? 'text-error' : isLow ? 'text-warning' : 'text-success'
                      }`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="text-center">{product.stockMin}</td>
                    <td className="text-right font-mono">{formatCurrency(product.stockValue)} GNF</td>
                    <td className="text-center">
                      {isOutOfStock ? (
                        <span className="badge badge-error badge-sm">Rupture</span>
                      ) : isLow ? (
                        <span className="badge badge-warning badge-sm">Stock faible</span>
                      ) : (
                        <span className="badge badge-success bg-success badge-sm">OK</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openMovementsModal(product)}
                          className="btn btn-ghost btn-xs btn-square"
                          title="Historique"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openAdjustModal(product)}
                          className="btn btn-ghost btn-xs btn-square"
                          title="Ajuster le stock"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="join">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`join-item btn btn-sm ${page === currentPage ? 'btn-primary' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => { setShowAdjustModal(false); setSelectedProduct(null); }}
        title={
          selectedProduct ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-warning to-orange-400 flex items-center justify-center text-white font-bold text-sm">
                {selectedProduct.code}
              </div>
              <div>
                <p className="text-lg font-bold">Ajuster le stock</p>
                <p className="text-sm font-normal text-base-content/60">{selectedProduct.name} · Stock actuel: {selectedProduct.stock}</p>
              </div>
            </div>
          ) : 'Ajuster le stock'
        }
        size="sm"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAdjust(); }} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Nouvelle quantité en stock</span>
            </label>
            <input
              type="number"
              min="0"
              value={adjustStockValue}
              onChange={(e) => setAdjustStockValue(e.target.value)}
              className="input input-bordered w-full"
              required
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Motif de l'ajustement</span>
            </label>
            <textarea
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              className="textarea textarea-bordered w-full"
              placeholder="Inventaire physique, casse, perte..."
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowAdjustModal(false); setSelectedProduct(null); }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary gap-2"
            >
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Valider l'ajustement
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Movements History Modal */}
      <Modal
        isOpen={showMovementsModal}
        onClose={() => { setShowMovementsModal(false); setSelectedProduct(null); setMovements([]); }}
        title={
          selectedProduct ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-info flex items-center justify-center text-white font-bold text-sm">
                {selectedProduct.code}
              </div>
              <div>
                <p className="text-lg font-bold">Mouvements de stock</p>
                <p className="text-sm font-normal text-base-content/60">{selectedProduct.name} · Stock actuel: {selectedProduct.stock}</p>
              </div>
            </div>
          ) : 'Mouvements de stock'
        }
        size="lg"
      >
        <div className="space-y-4">
          {movementsLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          ) : movements.length === 0 ? (
            <p className="text-center text-base-content/50 py-8">Aucun mouvement</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table table-xs w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th className="text-center">Qté</th>
                      <th className="text-center">Avant</th>
                      <th className="text-center">Après</th>
                      <th>Référence</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => (
                      <tr key={m.id}>
                        <td className="text-xs">{formatDate(m.createdAt)}</td>
                        <td>
                          <span className={`badge badge-sm ${typeColors[m.type] || 'badge-ghost'}`}>
                            {typeLabels[m.type] || m.type}
                          </span>
                        </td>
                        <td className="text-center font-mono">{m.quantity}</td>
                        <td className="text-center font-mono">{m.stockBefore}</td>
                        <td className="text-center font-mono">{m.stockAfter}</td>
                        <td className="text-xs">
                          {m.referenceType === 'purchase' && `Achat #${m.referenceId}`}
                          {m.referenceType === 'sale' && `Vente #${m.referenceId}`}
                          {m.referenceType === 'adjustment' && 'Ajustement'}
                          {m.referenceType === 'initial' && 'Initial'}
                          {!m.referenceType && '-'}
                        </td>
                        <td className="text-xs text-base-content/60 max-w-[150px] truncate">{m.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {movementsTotal > 10 && (
                <div className="flex justify-center">
                  <div className="join">
                    {Array.from({ length: Math.ceil(movementsTotal / 10) }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => {
                          setMovementsPage(page);
                          if (selectedProduct) fetchMovements(selectedProduct.id, page);
                        }}
                        className={`join-item btn btn-xs ${page === movementsPage ? 'btn-primary' : ''}`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
