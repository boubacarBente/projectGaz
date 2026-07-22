import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PurchaseLinkedSales } from "@/components/purchase-linked-sales";
import { PurchasePaymentStatusBadge } from "@/components/purchase-payment-status-badge";
import { SurfaceCard } from "@/components/surface-card";
import { getPurchaseInvoice, listSalesInvoicesByPurchaseInvoiceId } from "@/lib/operations";

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
  const [invoice, linkedSales] = Number.isInteger(invoiceId)
    ? await Promise.all([
        getPurchaseInvoice(invoiceId),
        listSalesInvoicesByPurchaseInvoiceId(invoiceId),
      ])
    : [null, []];

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Réf. ${invoice.reference}`}
        title={invoice.supplierName}
        description={`Créée le ${new Date(invoice.date).toLocaleDateString('fr-FR')}`}
        actions={
          <div className="flex gap-2">
            <Link href="/factures-usine" className="btn btn-outline">
              Retour
            </Link>
            <PurchasePaymentStatusBadge isPaid={invoice.isPaid} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SurfaceCard title="Total">{formatCurrency(invoice.totalAmount)} F</SurfaceCard>
        <SurfaceCard title="Fournisseur">{invoice.supplierName}</SurfaceCard>
        <SurfaceCard title="Statut"><PurchasePaymentStatusBadge isPaid={invoice.isPaid} /></SurfaceCard>
        <SurfaceCard title="Ventes liées">
          <p className="text-xl font-semibold">{linkedSales.length}</p>
          <p className="mt-1 text-xs text-base-content/55">{formatCurrency(linkedSalesTotal)} F au total</p>
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
        <SurfaceCard title="Notes">
          <p className="text-sm text-base-content/70">{invoice.notes || 'Aucune note'}</p>
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
                  <td>{formatCurrency(item.unitCost)} F</td>
                  <td className="text-right">{formatCurrency(item.totalCost)} F</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={3} className="text-right">Total</td>
                <td className="text-right">{formatCurrency(invoice.totalAmount)} F</td>
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
