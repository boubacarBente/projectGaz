'use client';

import { memo } from 'react';
import type { RapportData } from '@/lib/rapports-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function RapportStatsCardsInner({
  summary,
  periodLabel,
  stockInsights,
}: {
  summary: RapportData['summary'];
  periodLabel: string;
  stockInsights: RapportData['stockInsights'];
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{'\uD83D\uDCE6'}</span>
          </div>
          <p className="text-sm text-base-content/60 mb-1">Total achats</p>
          <p className="text-xl font-bold">{formatCurrency(summary.totalPurchases)} GNF</p>
        </div>
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{'\uD83D\uDCB0'}</span>
          </div>
          <p className="text-sm text-base-content/60 mb-1">Total ventes</p>
          <p className="text-xl font-bold text-success">{formatCurrency(summary.totalSales)} GNF</p>
        </div>
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{'\uD83D\uDCC8'}</span>
          </div>
          <p className="text-sm text-base-content/60 mb-1">Benefice brut</p>
          <p className={`text-xl font-bold ${summary.grossProfit >= 0 ? 'text-success' : 'text-error'}`}>
            {formatCurrency(summary.grossProfit)} GNF
          </p>
          <p className="text-xs text-base-content/40 mt-1">{summary.grossMarginRate.toFixed(1)}% marge</p>
        </div>
        <div className="rounded-2xl border border-accent/20 bg-accent/10 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{'\uD83E\uDDFE'}</span>
          </div>
          <p className="text-sm text-base-content/60 mb-1">Bouteilles vendues</p>
          <p className="text-xl font-bold text-accent">{summary.totalBottlesSold}</p>
          <p className="text-xs text-base-content/40 mt-1">unites</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Panier moyen</p>
          <p className="text-lg font-bold">{formatCurrency(summary.averageBasket)} GNF</p>
        </div>
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Factures d&apos;achat</p>
          <p className="text-lg font-bold">{summary.totalPurchaseInvoices}</p>
        </div>
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Factures de vente</p>
          <p className="text-lg font-bold">{summary.totalSalesInvoices}</p>
        </div>
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Clients actifs</p>
          <p className="text-lg font-bold">{summary.totalCustomers}</p>
        </div>
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Periode</p>
          <p className="text-lg font-bold">{periodLabel}</p>
        </div>
      </div>

      {/* Stock summary row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Stock total (unites)</p>
          <p className="text-lg font-bold text-primary">{stockInsights.totalStock}</p>
        </div>
        <div className="rounded-2xl border border-info/20 bg-info/5 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Valeur du stock</p>
          <p className="text-lg font-bold text-info">{formatCurrency(stockInsights.totalStockValue)} GNF</p>
        </div>
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Alertes stock</p>
          <p className={`text-lg font-bold ${stockInsights.lowStockCount > 0 ? 'text-warning' : 'text-success'}`}>
            {stockInsights.lowStockCount > 0 ? `${stockInsights.lowStockCount} produit(s)` : 'Aucune'}
          </p>
        </div>
      </div>
    </>
  );
}

export const RapportStatsCards = memo(RapportStatsCardsInner);
