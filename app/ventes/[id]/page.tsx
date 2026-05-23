import Link from "next/link";

import { getSalesInvoice } from "@/lib/operations";
import { PrintButton } from "./print-button";

type FactureDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
  'Paye': { label: 'Payée', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'Partiel': { label: 'Partielle', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  'En attente': { label: 'En attente', dot: 'bg-rose-500', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default async function FactureDetailPage({
  params,
}: FactureDetailPageProps) {
  const { id } = await params;
  const invoice = await getSalesInvoice(parseInt(id));

  if (!invoice) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-stone-800">Facture introuvable</h2>
          <p className="text-stone-500 text-sm">Aucune facture trouvée avec l&rsquo;ID {id}.</p>
          <Link href="/ventes" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors">
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* En-tête compact */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/ventes"
            className="w-9 h-9 rounded-xl border border-stone-200 bg-white flex items-center justify-center text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">{invoice.invoiceNumber}</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
          </div>
        </div>
        <PrintButton />
      </div>

      {/* Carte facture principale */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm shadow-stone-200/50 overflow-hidden">
        {/* En-tête de la facture */}
        <div className="px-8 pt-8 pb-6 border-b border-stone-100">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-stone-900">
                {invoice.customerName}
              </h1>
              <p className="text-stone-400 text-sm">{dateFormatted}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-300">Montant</p>
              <p className="text-2xl font-bold text-stone-900">{formatCurrency(invoice.totalAmount)} <span className="text-sm text-stone-400 font-normal">F</span></p>
            </div>
          </div>
        </div>

        {/* Grille d'infos */}
        <div className="grid grid-cols-3 divide-x divide-stone-100 border-b border-stone-100">
          <div className="px-8 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-1">Payé</p>
            <p className="text-lg font-semibold text-stone-800">{formatCurrency(invoice.amountPaid)} F</p>
          </div>
          <div className="px-8 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-1">Reste</p>
            <p className="text-lg font-semibold text-stone-800">{formatCurrency(invoice.remainingAmount)} F</p>
          </div>
          <div className="px-8 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 mb-1">Paiement</p>
            <p className="text-lg font-semibold text-stone-800">{invoice.paymentMethod || '—'}</p>
          </div>
        </div>

        {/* Métriques bénéfice */}
        {(invoice.costOfGoodsSold !== undefined || invoice.grossProfit !== undefined) && (
          <div className="grid grid-cols-2 divide-x divide-stone-100 border-b border-stone-100 bg-stone-50/50">
            <div className="px-8 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">Coût d&rsquo;achat</p>
                <p className="text-sm font-semibold text-stone-700">{formatCurrency(invoice.costOfGoodsSold ?? 0)} F</p>
              </div>
            </div>
            <div className="px-8 py-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                (invoice.grossProfit ?? 0) >= 0
                  ? 'bg-emerald-50 border border-emerald-100'
                  : 'bg-red-50 border border-red-100'
              }`}>
                <svg className={`w-4 h-4 ${(invoice.grossProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">Bénéfice</p>
                <p className="text-sm font-semibold text-stone-700">{formatCurrency(invoice.grossProfit ?? 0)} F</p>
              </div>
            </div>
          </div>
        )}

        {/* Articles */}
        <div className="px-8 py-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">Produit</th>
                  <th className="text-center py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 w-16">Qté</th>
                  <th className="text-right py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 w-28">Prix unit.</th>
                  <th className="text-right py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 w-28">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {invoice.items.map((item: any, i: number) => (
                  <tr key={i} className="group hover:bg-stone-50/50 transition-colors">
                    <td className="py-3.5">
                      <span className="text-stone-800 font-medium">{item.productName}</span>
                      <span className="text-stone-300 ml-2 text-xs">{item.productCode}</span>
                    </td>
                    <td className="text-center py-3.5 text-stone-600">{item.quantity}</td>
                    <td className="text-right py-3.5 text-stone-600">{formatCurrency(item.unitPrice)} F</td>
                    <td className="text-right py-3.5 font-medium text-stone-800">{formatCurrency(item.totalPrice)} F</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-stone-200">
                  <td colSpan={3} className="text-right py-4 text-sm font-bold text-stone-900">Total</td>
                  <td className="text-right py-4 text-sm font-bold text-stone-900">{formatCurrency(invoice.totalAmount)} F</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes ? (
          <div className="px-8 py-5 border-t border-stone-100 bg-stone-50/30">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 mb-2">Notes</p>
            <p className="text-sm text-stone-600 leading-relaxed">{invoice.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
