'use client';

import { memo } from 'react';
import type { RapportData } from '@/lib/rapports-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function RapportTopCustomersInner({
  topCustomers,
}: {
  topCustomers: RapportData['topCustomers'];
}) {
  if (topCustomers.length === 0) {
    return (
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Top clients</h3>
          <p className="text-sm text-base-content/60">Par chiffre d&apos;affaires</p>
        </div>
        <div className="flex items-center justify-center h-48 text-base-content/50">
          Aucun client
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">Top clients</h3>
        <p className="text-sm text-base-content/60">Par chiffre d&apos;affaires</p>
      </div>
      <div className="space-y-3">
        {topCustomers.map((customer, index) => (
          <div key={customer.name} className="flex items-center justify-between p-3 rounded-xl bg-base-200">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-300'
              }`}>
                {index + 1}
              </div>
              <div>
                <p className="font-medium">{customer.name}</p>
                <p className="text-xs text-base-content/60">{customer.invoiceCount} facture(s)</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-success">{formatCurrency(customer.totalSpent)}</p>
              <p className="text-xs text-base-content/60">GNF</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const RapportTopCustomers = memo(RapportTopCustomersInner);
