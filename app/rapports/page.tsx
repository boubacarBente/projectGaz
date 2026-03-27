import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { getOperationsSnapshot } from "@/lib/operations";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function RapportsPage() {
  const snapshot = await getOperationsSnapshot();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rapports"
        title="Suivi des ventes et du benefice"
        description="Cette page rapproche les factures de l usine et les factures de vente pour montrer ce qui a ete vendu et le benefice brut degage."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-500">Achats usine</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {formatCurrency(snapshot.totalPurchases)} GNF
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-500">Ventes clients</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {formatCurrency(snapshot.totalSales)} GNF
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
          <p className="text-sm font-medium text-slate-500">Benefice brut</p>
          <p className={`mt-3 text-3xl font-semibold tracking-tight ${snapshot.grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {formatCurrency(snapshot.grossProfit)} GNF
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard
          title="Bouteilles vendues"
          description="Resume des ventes cumulees par type de bouteille."
        >
          <div className="grid gap-4">
            {snapshot.soldByProduct.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                Aucune vente n a encore ete enregistree.
              </p>
            ) : (
              snapshot.soldByProduct.map((item) => (
                <article
                  key={item.productCode}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{item.productCode}</p>
                      <p className="text-sm text-slate-500">{item.productName}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-slate-900">{item.quantity} bouteille(s)</p>
                      <p className="text-slate-500">{formatCurrency(item.revenue)} GNF</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="Lecture metier"
          description="Ce calcul est volontairement simple pour te donner un point de depart concret."
        >
          <ul className="space-y-3 text-sm leading-7 text-slate-700">
            <li>Les factures de l usine sont considerees comme ton cout achat approvisionnement.</li>
            <li>Les factures de vente representent ton chiffre affaires reel.</li>
            <li>Le benefice brut affiche ici est: ventes cumulees moins achats cumules.</li>
            <li>On pourra ensuite ajouter le transport, les salaires et les autres depenses pour un benefice net plus precis.</li>
          </ul>
        </SurfaceCard>
      </div>
    </div>
  );
}
