import Link from "next/link";

import { getSalesInvoice } from "@/lib/operations";
import { PrintButton } from "./print-button";

type FactureDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  'Payée': { label: 'Payée', cls: 'badge-soft badge-success' },
  'Paye': { label: 'Payée', cls: 'badge-soft badge-success' },
  'Partiel': { label: 'Partielle', cls: 'badge-soft badge-warning' },
  'En attente': { label: 'En attente', cls: 'badge-soft badge-error' },
};

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-3 sm:px-8 py-4 sm:py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-base-content/40 mb-1">{label}</p>
      <p className={`text-base sm:text-lg font-semibold ${accent ? 'text-primary' : 'text-base-content'} break-words`}>{value}</p>
    </div>
  );
}

export default async function FactureDetailPage({
  params,
}: FactureDetailPageProps) {
  const { id } = await params;
  const invoice = await getSalesInvoice(parseInt(id));

  if (!invoice) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center">
            <svg className="w-7 h-7 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Facture introuvable</h2>
          <p className="text-base-content/60 text-sm">Aucune facture trouvée avec l&rsquo;ID {id}.</p>
          <Link href="/ventes" className="btn btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour aux ventes
          </Link>
        </div>
      </div>
    );
  }

  const status = statusConfig[invoice.paymentStatus] || statusConfig['En attente'];
  const dateFormatted = new Date(invoice.date).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const profit = invoice.grossProfit ?? 0;
  const cost = invoice.costOfGoodsSold ?? 0;
  const margin = invoice.totalAmount > 0 ? (profit / invoice.totalAmount) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto print:mx-0">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6 print:mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ventes"
            className="btn btn-ghost btn-sm btn-square"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/40">{invoice.invoiceNumber}</span>
            <span className={`badge ${status.cls} text-xs`}>{status.label}</span>
          </div>
        </div>
        <div className="print:hidden">
          <PrintButton />
        </div>
      </div>

      {/* Carte facture */}
      <div className="rounded-3xl border border-base-200/80 bg-base-100/80 shadow-lg shadow-black/5 backdrop-blur overflow-hidden print:shadow-none print:border print:border-base-200">
        {/* En-tête client */}
        <div className="px-4 sm:px-8 pt-6 sm:pt-8 pb-6 border-b border-base-200/60">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-0">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Facture de vente</p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2">
                {invoice.customerName}
              </h1>
              <p className="text-base-content/50 text-sm">{dateFormatted}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-base-content/30">Montant total</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary mt-1">{formatCurrency(invoice.totalAmount)} <span className="text-sm text-base-content/40 font-normal">GNF</span></p>
            </div>
          </div>
        </div>

        {/* Grille infos paiement */}
        <div className="grid grid-cols-3 divide-x divide-base-200/60 border-b border-base-200/60">
          <InfoRow label="Payé" value={`${formatCurrency(invoice.amountPaid)} GNF`} />
          <InfoRow label="Reste" value={`${formatCurrency(invoice.remainingAmount)} GNF`} />
          <InfoRow label="Paiement" value={invoice.paymentMethod || '\u2014'} />
        </div>

        {/* Métriques bénéfice */}
        {(cost > 0 || profit !== 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-base-200/60 border-b border-base-200/60 bg-base-200/20">
            <div className="px-4 sm:px-8 py-4 sm:py-5 flex items-center gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/40">Coût d&rsquo;achat</p>
                <p className="font-semibold text-sm sm:text-base truncate">{formatCurrency(cost)} GNF</p>
              </div>
            </div>
            <div className="px-4 sm:px-8 py-4 sm:py-5 flex items-center gap-3 sm:gap-4">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                profit >= 0 ? 'bg-success/10' : 'bg-error/10'
              }`}>
                <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${profit >= 0 ? 'text-success' : 'text-error'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/40">Bénéfice</p>
                <p className={`font-semibold text-sm sm:text-base truncate ${profit >= 0 ? 'text-success' : 'text-error'}`}>
                  {formatCurrency(profit)} GNF
                </p>
              </div>
            </div>
            <div className="px-4 sm:px-8 py-4 sm:py-5 flex items-center gap-3 sm:gap-4">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                margin >= 0 ? 'bg-info/10' : 'bg-error/10'
              }`}>
                <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${margin >= 0 ? 'text-info' : 'text-error'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/40">Marge</p>
                <p className={`font-semibold text-sm sm:text-base truncate ${margin >= 0 ? 'text-info' : 'text-error'}`}>
                  {margin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Articles */}
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Articles</h3>
            <span className="text-xs text-base-content/40">{invoice.items.length} produit(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/40">Produit</th>
                  <th className="text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/40 w-16">Qté</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/40 w-28">Prix unit.</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/40 w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-base-200/40 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.productName}</span>
                        <span className="badge badge-neutral badge-sm">{item.productCode}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 text-base-content/70">{item.quantity}</td>
                    <td className="text-right py-3 text-base-content/70">{formatCurrency(item.unitPrice)} GNF</td>
                    <td className="text-right py-3 font-medium">{formatCurrency(item.totalPrice)} GNF</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-base-content/10">
                  <td colSpan={3} className="text-right py-4 text-sm font-bold">Total</td>
                  <td className="text-right py-4 text-sm font-bold text-primary">{formatCurrency(invoice.totalAmount)} GNF</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes ? (
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-base-200/60 bg-base-200/20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-base-content/40 mb-2">Notes</p>
            <p className="text-sm text-base-content/70 leading-relaxed">{invoice.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
