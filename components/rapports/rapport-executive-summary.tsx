'use client';

import { memo } from 'react';
import type { RapportData } from '@/lib/rapports-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function RapportExecutiveSummaryInner({
  decisionSummary,
}: {
  decisionSummary: RapportData['decisionSummary'];
}) {
  const items = [
    {
      label: 'Produit leader',
      value: decisionSummary.bestProduct
        ? `${decisionSummary.bestProduct.productCode} - ${decisionSummary.bestProduct.productName}`
        : 'Aucun',
      detail: decisionSummary.bestProduct
        ? `${decisionSummary.bestProduct.quantity} vendue(s), ${formatCurrency(decisionSummary.bestProduct.revenue)} GNF`
        : 'Pas de vente sur la periode',
      tone: 'border-info/20 bg-info/5',
    },
    {
      label: 'Meilleur client',
      value: decisionSummary.bestCustomer?.name ?? 'Aucun',
      detail: decisionSummary.bestCustomer
        ? `${formatCurrency(decisionSummary.bestCustomer.totalSpent)} GNF`
        : 'Pas de client sur la periode',
      tone: 'border-success/20 bg-success/5',
    },
    {
      label: 'Marge brute',
      value: `${decisionSummary.grossMarginRate.toFixed(1)}%`,
      detail: decisionSummary.grossMarginRate >= 0 ? 'Rentabilite positive' : 'Rentabilite negative',
      tone: decisionSummary.grossMarginRate >= 0 ? 'border-success/20 bg-success/5' : 'border-error/20 bg-error/5',
    },
    {
      label: 'A encaisser',
      value: `${formatCurrency(decisionSummary.totalReceivables)} GNF`,
      detail: decisionSummary.totalReceivables > 0 ? 'Factures clients ouvertes' : 'Aucun reste client',
      tone: decisionSummary.totalReceivables > 0 ? 'border-warning/20 bg-warning/5' : 'border-success/20 bg-success/5',
    },
    {
      label: 'A payer',
      value: `${formatCurrency(decisionSummary.totalPayables)} GNF`,
      detail: decisionSummary.totalPayables > 0 ? 'Factures fournisseurs ouvertes' : 'Aucun achat impaye',
      tone: decisionSummary.totalPayables > 0 ? 'border-error/20 bg-error/5' : 'border-success/20 bg-success/5',
    },
    {
      label: 'Stock critique',
      value: `${decisionSummary.lowStockCount}`,
      detail: decisionSummary.lowStockCount > 0 ? 'Reapprovisionnement a prevoir' : 'Stock sous controle',
      tone: decisionSummary.lowStockCount > 0 ? 'border-warning/20 bg-warning/5' : 'border-success/20 bg-success/5',
    },
  ];

  return (
    <section className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Resume decisionnel</h3>
        <p className="text-sm text-base-content/60">Les indicateurs a regarder en premier.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className={`rounded-xl border p-4 ${item.tone}`}>
            <p className="text-xs font-medium uppercase text-base-content/50">{item.label}</p>
            <p className="mt-2 truncate text-base font-semibold">{item.value}</p>
            <p className="mt-1 text-xs text-base-content/60">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export const RapportExecutiveSummary = memo(RapportExecutiveSummaryInner);
