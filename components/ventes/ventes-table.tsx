'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ExportDropdown } from '@/components/export-dropdown';
import type { SalesInvoice } from '@/lib/ventes-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Payée': return 'badge-primary';
    case 'Partiel': return 'badge-error';
    case 'En attente': return 'badge-primary';
    default: return 'badge-primary';
  }
}

function VentesTableInner({
  invoices,
  total,
  onExportPDF,
  onExportImage,
  onShareWhatsApp,
  onEdit,
  onDelete,
}: {
  invoices: SalesInvoice[];
  total: number;
  onExportPDF: (invoice: SalesInvoice) => void;
  onExportImage: (invoice: SalesInvoice) => void;
  onShareWhatsApp?: (invoice: SalesInvoice) => void;
  onEdit: (invoice: SalesInvoice) => void;
  onDelete: (invoice: SalesInvoice) => void;
}) {
  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-base-content/60">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>{total === 0 && invoices.length === 0 ? 'Aucune vente enregistrée.' : 'Aucune facture ne correspond aux filtres.'}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr className="bg-base-200">
            <th className="font-semibold">N° Facture</th>
            <th className="font-semibold">Client</th>
            <th className="font-semibold">Date</th>
            <th className="font-semibold text-right">Total</th>
            <th className="font-semibold text-right">Encaisse</th>
            <th className="font-semibold text-right">Reste</th>
            <th className="font-semibold">Statut</th>
            <th className="font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-base-200">
              <td className="font-medium">{invoice.invoiceNumber}</td>
              <td>{invoice.customerName}</td>
              <td>{new Date(invoice.date).toLocaleDateString('fr-MA')}</td>
              <td className="text-right font-semibold">{formatCurrency(invoice.totalAmount)}</td>
              <td className="text-right text-success">{formatCurrency(invoice.amountPaid)}</td>
              <td className={`text-right ${invoice.remainingAmount > 0 ? 'text-warning font-medium' : ''}`}>
                {formatCurrency(invoice.remainingAmount)}
              </td>
              <td>
                <span className={`badge ${getStatusColor(invoice.paymentStatus)} badge-sm`}>
                  {invoice.paymentStatus}
                </span>
              </td>
              <td>
                <div className="flex justify-end gap-1">
                  <Link href={`/ventes/${invoice.id}`} className="btn btn-ghost btn-sm btn-square" title="Voir détail">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </Link>
                  <ExportDropdown
                    compact
                    onExportPDF={() => onExportPDF(invoice)}
                    onExportImage={() => onExportImage(invoice)}
                    onShareWhatsApp={onShareWhatsApp ? () => onShareWhatsApp(invoice) : undefined}
                  />
                  <button onClick={() => onEdit(invoice)} className="btn btn-ghost btn-sm btn-square" title="Modifier">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => onDelete(invoice)} className="btn btn-ghost btn-sm btn-square" title="Supprimer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const VentesTable = memo(VentesTableInner);
