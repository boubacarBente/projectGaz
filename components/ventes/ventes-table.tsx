'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ExportDropdown } from '@/components/export-dropdown';
import { ResponsiveTable, type Column } from '@/components/responsive-table';
import type { SalesInvoice } from '@/lib/ventes-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

const statusLabels: Record<string, string> = {
  Paye: 'Payée',
  Payée: 'Payée',
  Partiel: 'Partiel',
  'En attente': 'En attente',
};

function getStatusColor(status: string) {
  switch (status) {
    case 'Paye':
    case 'Payée': return 'badge-primary';
    case 'Partiel': return 'badge-error';
    case 'En attente': return 'badge-warning';
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
  const columns: Column<SalesInvoice>[] = [
    { key: 'invoiceNumber', label: 'N° Facture', primary: true, render: (inv) => inv.invoiceNumber },
    { key: 'customerName', label: 'Client', render: (inv) => inv.customerName },
    { key: 'date', label: 'Date', render: (inv) => new Date(inv.date).toLocaleDateString('fr-MA') },
    { key: 'totalAmount', label: 'Total', className: 'text-right font-semibold', render: (inv) => formatCurrency(inv.totalAmount) },
    { key: 'amountPaid', label: 'Encaisse', className: 'text-right text-success', render: (inv) => formatCurrency(inv.amountPaid) },
    { key: 'remainingAmount', label: 'Reste', className: `text-right`, render: (inv) => (
      <span className={inv.remainingAmount > 0 ? 'text-warning font-medium' : ''}>
        {formatCurrency(inv.remainingAmount)}
      </span>
    )},
    { key: 'paymentStatus', label: 'Statut', render: (inv) => (
      <span className={`badge ${getStatusColor(inv.paymentStatus)} badge-sm`}>
        {statusLabels[inv.paymentStatus] ?? inv.paymentStatus}
      </span>
    )},
  ];

  const actions = (invoice: SalesInvoice) => (
    <>
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
    </>
  );

  return (
    <ResponsiveTable
      columns={columns}
      data={invoices}
      getRowKey={(inv) => inv.id}
      actions={actions}
      emptyMessage={total === 0 && invoices.length === 0 ? 'Aucune vente enregistrée.' : 'Aucune facture ne correspond aux filtres.'}
    />
  );
}

export const VentesTable = memo(VentesTableInner);
