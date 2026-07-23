'use client';

import Link from 'next/link';

import { ResponsiveTable, type Column } from '@/components/responsive-table';
import type { LinkedSalesInvoice } from '@/lib/ventes-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR');
}

function formatDeliveredQuantity(items: LinkedSalesInvoice['items']) {
  const quantitiesByCode = new Map<string, number>();

  for (const item of items) {
    const code = item.productCode || item.productName;
    quantitiesByCode.set(code, (quantitiesByCode.get(code) ?? 0) + item.quantity);
  }

  return Array.from(quantitiesByCode.entries())
    .map(([code, quantity]) => `${code}x${quantity}`)
    .join(', ');
}

function SalesPaymentStatus({ status }: { status: LinkedSalesInvoice['paymentStatus'] }) {
  const styles = status === 'Payée'
    ? 'bg-success/10 text-success'
    : status === 'Partiel'
      ? 'bg-warning/10 text-warning'
      : 'bg-error/10 text-error';

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>
      {status}
    </span>
  );
}

export function PurchaseLinkedSales({ sales }: { sales: LinkedSalesInvoice[] }) {
  const columns: Column<LinkedSalesInvoice>[] = [
    {
      key: 'date',
      label: 'Date',
      render: (sale) => <span className="whitespace-nowrap text-base-content/60">{formatDate(sale.date)}</span>,
    },
    {
      key: 'invoiceNumber',
      label: 'Facture',
      primary: true,
      render: (sale) => (
        <Link href={`/ventes/${sale.id}`} className="font-semibold text-primary hover:underline">
          {sale.invoiceNumber}
        </Link>
      ),
    },
    {
      key: 'customerName',
      label: 'Client',
      render: (sale) => <span className="font-medium">{sale.customerName}</span>,
    },
    {
      key: 'deliveredQuantity',
      label: 'Quantité livrée',
      render: (sale) => (
        <span className="text-sm font-medium text-base-content/70">
          {formatDeliveredQuantity(sale.items) || 'Aucune'}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      className: 'whitespace-nowrap text-right font-semibold tabular-nums',
      render: (sale) => `${formatCurrency(sale.totalAmount)} F`,
    },
    {
      key: 'paymentStatus',
      label: 'Statut',
      render: (sale) => <SalesPaymentStatus status={sale.paymentStatus} />,
    },
  ];

  return (
    <ResponsiveTable
      columns={columns}
      data={sales}
      getRowKey={(sale) => sale.id}
      actions={(sale) => (
        <Link
          href={`/ventes/${sale.id}`}
          className="btn btn-ghost btn-sm btn-square"
          aria-label={`Voir la vente ${sale.invoiceNumber}`}
          title="Voir la vente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      )}
      actionsClassName="w-20 whitespace-nowrap"
      emptyMessage="Aucune vente n'est liée à cette facture d'usine."
    />
  );
}
