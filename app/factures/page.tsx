import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { listSalesInvoices } from "@/lib/operations";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function FacturesPage() {
  const invoices = await listSalesInvoices();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facturation"
        title="Factures de vente"
        description="Ici tu retrouves toutes les ventes enregistrees, ce qui a ete encaisse, le reste a payer et l historique a conserver pour les prochaines factures."
        actions={
          <Link
            href="/factures/nouvelle"
            className="rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Nouvelle vente
          </Link>
        }
      />

      <SurfaceCard
        title="Historique des ventes"
        description="Chaque facture de vente participe au suivi des bouteilles sorties et du benefice."
      >
        <div className="grid gap-4">
          {invoices.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Aucune vente enregistree pour le moment.
            </p>
          ) : (
            invoices.map((invoice) => (
              <article
                key={invoice.id}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-slate-500">
                      {invoice.customerName} • {new Date(invoice.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                    {invoice.paymentStatus}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="text-slate-500">Total</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatCurrency(invoice.totalAmount)} GNF
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="text-slate-500">Encaisse</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatCurrency(invoice.amountPaid)} GNF
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="text-slate-500">Reste</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatCurrency(invoice.remainingAmount)} GNF
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="text-slate-500">Paiement</p>
                    <p className="mt-1 font-semibold text-slate-900">{invoice.paymentMethod}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {invoice.items.map((item) => (
                    <p key={`${invoice.id}-${item.productCode}`}>
                      {item.productCode} - {item.productName} : {item.quantity} x {formatCurrency(item.unitPrice)} GNF
                    </p>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
