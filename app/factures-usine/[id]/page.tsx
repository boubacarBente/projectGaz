import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PurchaseInvoiceReportExport } from "@/components/purchase-invoice-report-export";
import { PurchaseLinkedSales } from "@/components/purchase-linked-sales";
import { PurchasePaymentStatusBadge } from "@/components/purchase-payment-status-badge";
import { SurfaceCard } from "@/components/surface-card";
import {
  getPurchaseInvoice,
  getSettings,
  listSalesInvoicesByPurchaseInvoiceId,
  listWalletTransactionsByPurchaseInvoiceId,
} from "@/lib/operations";

type FactureUsineDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

export default async function FactureUsineDetailPage({
  params,
}: FactureUsineDetailPageProps) {
  const { id } = await params;
  const invoiceId = parseInt(id, 10);
  const [invoice, linkedSales, settings, linkedWalletTransactions] = Number.isInteger(invoiceId)
    ? await Promise.all([
        getPurchaseInvoice(invoiceId),
        listSalesInvoicesByPurchaseInvoiceId(invoiceId),
        getSettings(),
        listWalletTransactionsByPurchaseInvoiceId(invoiceId),
      ])
    : [null, [], null, []];

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Dépense"
          title="Facture d'achat introuvable"
          description={`Aucune dépense trouvée avec l'ID ${id}.`}
          actions={
            <Link href="/factures-usine" className="btn btn-outline">
              Retour aux factures d'usine
            </Link>
          }
        />
      </div>
    );
  }

  const linkedSalesTotal = linkedSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const linkedCashGiven = linkedWalletTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );
  const linkedCashTransactionCount = linkedWalletTransactions.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Réf. ${invoice.reference}`}
        title={invoice.supplierName}
        description={`Créée le ${new Date(invoice.date).toLocaleDateString('fr-FR')}`}
        actions={
          <div className="flex gap-2">
            <PurchaseInvoiceReportExport
              invoice={invoice}
              linkedSales={linkedSales}
              companyName={settings?.companyName}
              cashGivenAmount={linkedCashGiven}
              cashGivenTransactionCount={linkedCashTransactionCount}
            />
            <Link href="/factures-usine" className="btn btn-outline">
              Retour
            </Link>
            <PurchasePaymentStatusBadge isPaid={invoice.isPaid} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <SurfaceCard title="Total">{formatCurrency(invoice.totalAmount)} GNF</SurfaceCard>
        <SurfaceCard title="Fournisseur">{invoice.supplierName}</SurfaceCard>
        <SurfaceCard title="Statut"><PurchasePaymentStatusBadge isPaid={invoice.isPaid} /></SurfaceCard>
        <SurfaceCard title="Agent livreur">
          <p className="font-medium">{invoice.notes || 'Aucun agent livreur'}</p>
        </SurfaceCard>
        <SurfaceCard title="Ventes liées">
          <p className="text-xl font-semibold">{linkedSales.length}</p>
          <p className="mt-1 text-xs text-base-content/55">{formatCurrency(linkedSalesTotal)} GNF au total</p>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard title="Fournisseur">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-base-content/60">Nom</dt><dd>{invoice.supplierName}</dd></div>
            <div className="flex justify-between"><dt className="text-base-content/60">Date</dt><dd>{new Date(invoice.date).toLocaleDateString('fr-FR')}</dd></div>
            <div className="flex justify-between"><dt className="text-base-content/60">Référence</dt><dd>{invoice.reference}</dd></div>
            <div className="flex justify-between"><dt className="text-base-content/60">Payée</dt><dd>{invoice.isPaid ? 'Oui' : 'Non'}</dd></div>
          </dl>
        </SurfaceCard>
        <SurfaceCard title="Montant espèce donnée">
          {linkedWalletTransactions.length > 0 ? (
            <div className="divide-y divide-base-200">
              {linkedWalletTransactions.map((transaction) => {
                const isIncome = transaction.type === 'income';

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-semibold ${
                            isIncome
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          {isIncome ? 'Entrée' : 'Sortie'}
                        </span>
                        <span className="text-xs text-base-content/50">
                          {transaction.createdAt.toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-base-content/70">
                        {transaction.description || `Transaction #${transaction.id}`}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums ${
                        isIncome ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)} GNF
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-base-content/60">Aucune transaction liée</p>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard title="Articles achetés">
        <div className="overflow-x-auto">
          <table className="table table-zebra text-sm">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Qté</th>
                <th>Coût unit.</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item: any, i: number) => (
                <tr key={i}>
                  <td>{item.productName} <span className="text-base-content/40">({item.productCode})</span></td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitCost)} GNF</td>
                  <td className="text-right">{formatCurrency(item.totalCost)} GNF</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={3} className="text-right">Total</td>
                <td className="text-right">{formatCurrency(invoice.totalAmount)} GNF</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SurfaceCard>

      <SurfaceCard
        title="Ventes liées"
        description="Toutes les ventes rattachées directement à cette facture d'usine."
      >
        <PurchaseLinkedSales sales={linkedSales} />
      </SurfaceCard>
    </div>
  );
}
