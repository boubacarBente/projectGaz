'use client';

import { memo } from 'react';
import type { RapportData } from '@/lib/rapports-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function RapportProductTableInner({
  soldByProduct,
  totalSales,
  periodLabel,
}: {
  soldByProduct: RapportData['soldByProduct'];
  totalSales: number;
  periodLabel: string;
}) {
  if (soldByProduct.length === 0) {
    return (
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Detail des ventes par produit</h3>
            <p className="text-sm text-base-content/60">{periodLabel} &middot; 0 produit(s)</p>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/50">
          Aucune vente pour cette periode.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">Detail des ventes par produit</h3>
          <p className="text-sm text-base-content/60">{periodLabel} &middot; {soldByProduct.length} produit(s)</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Produit</th>
              <th className="text-right">Quantite</th>
              <th className="text-right">Chiffre d&apos;affaires</th>
              <th className="text-right">Part</th>
            </tr>
          </thead>
          <tbody>
            {soldByProduct.map((product) => {
              const percentage = totalSales > 0 ? (product.revenue / totalSales) * 100 : 0;
              return (
                <tr key={product.productCode}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-neutral badge-sm">{product.productCode}</span>
                      {product.productName}
                    </div>
                  </td>
                  <td className="text-right font-medium">{product.quantity}</td>
                  <td className="text-right font-semibold text-success">{formatCurrency(product.revenue)}</td>
                  <td className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-16 h-2 bg-base-200 rounded-full overflow-hidden">
                        <div className="h-full bg-info rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                      </div>
                      <span className="text-sm">{percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const RapportProductTable = memo(RapportProductTableInner);
