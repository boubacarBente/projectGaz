'use client';

import { memo } from 'react';
import type { RapportData } from '@/lib/rapports-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/50">
      {message}
    </div>
  );
}

function RapportStockInsightsInner({
  stockInsights,
}: {
  stockInsights: RapportData['stockInsights'];
}) {
  return (
    <section className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analyse du stock</h3>
          <p className="text-sm text-base-content/60">Rotation, immobilisation et reapprovisionnement.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs sm:min-w-80">
          <div>
            <p className="text-base-content/50">Stock</p>
            <p className="font-bold">{stockInsights.totalStock}</p>
          </div>
          <div>
            <p className="text-base-content/50">Valeur</p>
            <p className="font-bold">{formatCurrency(stockInsights.totalStockValue)}</p>
          </div>
          <div>
            <p className="text-base-content/50">Ruptures</p>
            <p className="font-bold text-error">{stockInsights.outOfStockCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div>
          <div className="mb-3">
            <h4 className="font-semibold">Produits les plus vendus</h4>
            <p className="text-xs text-base-content/60">Par quantite sur la periode.</p>
          </div>
          {stockInsights.fastestMovingProducts.length === 0 ? (
            <EmptyState message="Aucun mouvement de vente." />
          ) : (
            <div className="space-y-2">
              {stockInsights.fastestMovingProducts.map((product) => (
                <div key={product.productId} className="rounded-xl border border-base-200 bg-base-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="badge badge-neutral badge-sm">{product.productCode}</span>
                      <p className="mt-1 text-sm font-medium">{product.productName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{product.quantity}</p>
                      <p className="text-xs text-base-content/50">stock {product.stock}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3">
            <h4 className="font-semibold">Produits immobiles</h4>
            <p className="text-xs text-base-content/60">Stock present sans vente sur la periode.</p>
          </div>
          {stockInsights.slowMovingProducts.length === 0 ? (
            <EmptyState message="Aucun produit immobile detecte." />
          ) : (
            <div className="space-y-2">
              {stockInsights.slowMovingProducts.map((product) => (
                <div key={product.productId} className="rounded-xl border border-base-200 bg-base-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="badge badge-ghost badge-sm">{product.productCode}</span>
                      <p className="mt-1 text-sm font-medium">{product.productName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{product.stock}</p>
                      <p className="text-xs text-base-content/50">{formatCurrency(product.stockValue)} GNF</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3">
            <h4 className="font-semibold">A reapprovisionner</h4>
            <p className="text-xs text-base-content/60">Produits au seuil minimal ou en dessous.</p>
          </div>
          {stockInsights.reorderSuggestions.length === 0 ? (
            <EmptyState message="Aucune alerte de reapprovisionnement." />
          ) : (
            <div className="space-y-2">
              {stockInsights.reorderSuggestions.map((product) => (
                <div key={product.productId} className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="badge badge-warning badge-sm">{product.productCode}</span>
                      <p className="mt-1 text-sm font-medium">{product.productName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-warning">+{product.suggestedOrder}</p>
                      <p className="text-xs text-base-content/50">stock {product.stock} / min {product.stockMin}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export const RapportStockInsights = memo(RapportStockInsightsInner);
