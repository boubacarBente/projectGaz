'use client';

import { memo } from 'react';
import type { RapportData, RapportMetricChanges, RapportMetricSnapshot } from '@/lib/rapports-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function formatValue(key: keyof RapportMetricSnapshot, value: number) {
  if (key === 'totalBottlesSold') return String(value);
  return `${formatCurrency(value)} GNF`;
}

function VariationBadge({ value }: { value: number }) {
  const tone = value > 0 ? 'badge-success' : value < 0 ? 'badge-error' : 'badge-ghost';
  const prefix = value > 0 ? '+' : '';

  return <span className={`badge badge-sm ${tone}`}>{prefix}{value.toFixed(1)}%</span>;
}

const metrics: {
  key: keyof RapportMetricSnapshot;
  changeKey: keyof RapportMetricChanges;
  label: string;
}[] = [
  { key: 'totalSales', changeKey: 'totalSales', label: 'Ventes' },
  { key: 'grossProfit', changeKey: 'grossProfit', label: 'Benefice' },
  { key: 'totalPurchases', changeKey: 'totalPurchases', label: 'Achats' },
  { key: 'totalBottlesSold', changeKey: 'totalBottlesSold', label: 'Bouteilles' },
  { key: 'totalReceivables', changeKey: 'totalReceivables', label: 'A encaisser' },
  { key: 'totalPayables', changeKey: 'totalPayables', label: 'A payer' },
];

function RapportComparisonInner({
  comparison,
}: {
  comparison: RapportData['comparison'];
}) {
  if (!comparison) {
    return (
      <section className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div>
          <h3 className="text-lg font-semibold">Comparaison periode precedente</h3>
          <p className="text-sm text-base-content/60">Disponible pour les periodes datees.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Comparaison periode precedente</h3>
          <p className="text-sm text-base-content/60">
            Reference : {comparison.previousFrom || 'debut'} au {comparison.previousTo || 'fin'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.key} className="rounded-xl border border-base-200 bg-base-100 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-base-content/60">{metric.label}</p>
                <p className="mt-1 text-base font-bold">{formatValue(metric.key, comparison.current[metric.key])}</p>
              </div>
              <VariationBadge value={comparison.changes[metric.changeKey]} />
            </div>
            <p className="mt-2 text-xs text-base-content/50">
              Avant : {formatValue(metric.key, comparison.previous[metric.key])}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export const RapportComparison = memo(RapportComparisonInner);
