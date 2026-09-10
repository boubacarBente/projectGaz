'use client';

import Link from 'next/link';

import { ResponsiveTable, type Column } from '@/components/responsive-table';
import type { LinkedSalesInvoice } from '@/lib/ventes-types';
import { formatDateShort } from '@/lib/date-format';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function formatDate(value: string) {
  return formatDateShort(value);
}

function getDeliveredQuantities(items: LinkedSalesInvoice['items']) {
  const quantitiesByCode = new Map<string, number>();

  for (const item of items) {
    const code = item.productCode || item.productName;
    quantitiesByCode.set(code, (quantitiesByCode.get(code) ?? 0) + item.quantity);
  }

  return Array.from(quantitiesByCode.entries()).map(([code, quantity]) => ({
    code,
    quantity,
  }));
}

function SalesPaymentStatus({ status }: { status: LinkedSalesInvoice['paymentStatus'] }) {
  const normalizedStatus = status.toLowerCase();
  const isPaid = status === 'Payée' || normalizedStatus.startsWith('pay');
  const isPartial = normalizedStatus.includes('partiel');
  const styles = isPaid
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : isPartial
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-rose-200 bg-rose-50 text-rose-700';
  const label = isPaid ? 'Payée' : isPartial ? 'Partiel' : 'En attente';

  return (
    <span className={`inline-flex h-7 min-w-[6.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-semibold leading-none ${styles}`}>
      <span className="h-2 w-2 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true" />
      {label}
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
      render: (sale) => {
        const deliveredQuantities = getDeliveredQuantities(sale.items);

        return deliveredQuantities.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {deliveredQuantities.map(({ code, quantity }) => (
              <span
                key={code}
                className="inline-flex h-6 items-center whitespace-nowrap rounded-md border border-base-content/35 bg-base-100 px-2 text-xs font-medium text-base-content/80"
              >
                {code} x{quantity}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-base-content/50">Aucune</span>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Total',
      className: 'whitespace-nowrap text-right font-semibold tabular-nums',
      render: (sale) => `${formatCurrency(sale.totalAmount)} GNF`,
    },
    {
      key: 'paymentStatus',
      label: 'Statut',
      className: 'min-w-28',
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
