'use client';

import { memo } from 'react';
import type { RapportData } from '@/lib/rapports-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function formatDate(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/50">
      {message}
    </div>
  );
}

function RapportDebtsInner({
  receivables,
  payables,
  totalReceivables,
  totalPayables,
}: {
  receivables: RapportData['receivables'];
  payables: RapportData['payables'];
  totalReceivables: number;
  totalPayables: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Dettes clients</h3>
            <p className="text-sm text-base-content/60">Factures de vente avec reste a payer.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-base-content/50">Total</p>
            <p className="font-bold text-warning">{formatCurrency(totalReceivables)} GNF</p>
          </div>
        </div>
        {receivables.length === 0 ? (
          <EmptyState message="Aucun reste client sur cette periode." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Client</th>
                  <th className="text-right">Factures</th>
                  <th className="text-right">Reste</th>
                  <th className="text-right">Derniere</th>
                </tr>
              </thead>
              <tbody>
                {receivables.slice(0, 8).map((item) => (
                  <tr key={`${item.customerId ?? 'name'}-${item.customerName}`}>
                    <td className="font-medium">{item.customerName}</td>
                    <td className="text-right">{item.invoiceCount}</td>
                    <td className="text-right font-semibold text-warning">{formatCurrency(item.remainingAmount)}</td>
                    <td className="text-right text-base-content/70">{formatDate(item.lastInvoiceDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Achats non payes</h3>
            <p className="text-sm text-base-content/60">Factures fournisseurs encore ouvertes.</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-base-content/50">Total</p>
            <p className="font-bold text-error">{formatCurrency(totalPayables)} GNF</p>
          </div>
        </div>
        {payables.length === 0 ? (
          <EmptyState message="Aucune facture fournisseur impayee sur cette periode." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th className="text-right">Factures</th>
                  <th className="text-right">Montant</th>
                  <th className="text-right">Derniere</th>
                </tr>
              </thead>
              <tbody>
                {payables.slice(0, 8).map((item) => (
                  <tr key={`${item.supplierId ?? 'name'}-${item.supplierName}`}>
                    <td className="font-medium">{item.supplierName}</td>
                    <td className="text-right">{item.invoiceCount}</td>
                    <td className="text-right font-semibold text-error">{formatCurrency(item.totalAmount)}</td>
                    <td className="text-right text-base-content/70">{formatDate(item.lastInvoiceDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export const RapportDebts = memo(RapportDebtsInner);
