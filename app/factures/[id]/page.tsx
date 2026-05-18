import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { PrintButton } from "./print-button";

type FactureDetailPageProps = {
  params: Promise<{ id: string }>;
};

async function getInvoice(id: number) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/factures/${id}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

export default async function FactureDetailPage({
  params,
}: FactureDetailPageProps) {
  const { id } = await params;
  const invoice = await getInvoice(parseInt(id));

  if (!invoice) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Facture"
          title="Facture introuvable"
          description={`Aucune facture trouvée avec l'ID ${id}.`}
          actions={
            <Link href="/factures" className="btn btn-outline">
              Retour aux factures
            </Link>
          }
        />
      </div>
    );
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Paye': 'badge-success',
      'Partiel': 'badge-warning',
      'En attente': 'badge-error',
    };
    return <span className={`badge ${colors[status] || 'badge-ghost'} text-xs`}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Facture ${invoice.invoiceNumber}`}
        title={invoice.customerName}
        description={`Créée le ${new Date(invoice.date).toLocaleDateString('fr-FR')}`}
        actions={
          <div className="flex gap-2">
            <Link href="/factures" className="btn btn-outline">
              Retour
            </Link>
            <PrintButton />
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <SurfaceCard title="Total">{formatCurrency(invoice.totalAmount)} F</SurfaceCard>
        <SurfaceCard title="Payé">{formatCurrency(invoice.amountPaid)} F</SurfaceCard>
        <SurfaceCard title="Reste">{formatCurrency(invoice.remainingAmount)} F</SurfaceCard>
        <SurfaceCard title="Coût d'achat">{formatCurrency(invoice.costOfGoodsSold ?? 0)} F</SurfaceCard>
        <SurfaceCard title="Bénéfice">{formatCurrency(invoice.grossProfit ?? 0)} F</SurfaceCard>
        <SurfaceCard title="Statut">{statusBadge(invoice.paymentStatus)}</SurfaceCard>
      </div>

      {/* Infos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard title="Client">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-base-content/60">Nom</dt><dd>{invoice.customerName}</dd></div>
            <div className="flex justify-between"><dt className="text-base-content/60">Date</dt><dd>{new Date(invoice.date).toLocaleDateString('fr-FR')}</dd></div>
            <div className="flex justify-between"><dt className="text-base-content/60">Paiement</dt><dd>{invoice.paymentMethod}</dd></div>
            <div className="flex justify-between"><dt className="text-base-content/60">Statut</dt><dd>{statusBadge(invoice.paymentStatus)}</dd></div>
          </dl>
        </SurfaceCard>
        <SurfaceCard title="Notes">
          <p className="text-sm text-base-content/70">{invoice.notes || 'Aucune note'}</p>
        </SurfaceCard>
      </div>

      {/* Produits */}
      <SurfaceCard title="Articles">
        <div className="overflow-x-auto">
          <table className="table table-zebra text-sm">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Qté</th>
                <th>Prix unit.</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item: any, i: number) => (
                <tr key={i}>
                  <td>{item.productName} <span className="text-base-content/40">({item.productCode})</span></td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPrice)} F</td>
                  <td className="text-right">{formatCurrency(item.totalPrice)} F</td>
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
    </div>
  );
}
