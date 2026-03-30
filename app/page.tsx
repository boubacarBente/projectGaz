import Link from "next/link";

import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { getOperationsSnapshot } from "@/lib/operations";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function HomePage() {
  const snapshot = await getOperationsSnapshot();

  const stats = [
    {
      label: "Achats usine",
      value: `${formatCurrency(snapshot.totalPurchases)} GNF`,
      hint: "Total des factures d'approvisionnement enregistrees.",
    },
    {
      label: "Ventes clients",
      value: `${formatCurrency(snapshot.totalSales)} GNF`,
      hint: "Total des factures de vente saisies.",
    },
    {
      label: "Nombres des clients",
      value: '0',
      hint: "Nombres de clients total.",
    },
    {
      label: "Benefice brut",
      value: `${formatCurrency(snapshot.grossProfit)} GNF`,
      hint: "Calcul initial: ventes moins achats usine.",
    },
    {
      label: "Factures de vente",
      value: String(snapshot.sales.length),
      hint: "Historique disponible pour les prochaines ventes.",
    },
  ];

  const quickLinks = [
    { href: "/depenses", label: "Saisir une facture usine" },
    { href: "/factures/nouvelle", label: "Enregistrer une vente" },
    { href: "/factures", label: "Voir les factures clients" },
    { href: "/rapports", label: "Voir le benefice" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard principal"
        title="Pilotage de l'activite gaz"
        description="Le tableau de bord rapproche maintenant les factures de l'usine et les ventes clients pour suivre le stock vendu et le benefice brut."
        actions={
          <Link
            href="/depenses"
            className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Ajouter une facture usine
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <SurfaceCard
          title="Vision metier"
          description="Synthese rapide de ce que l'application sait deja calculer pour toi."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-dashed border-sky-300 bg-sky-50/70 p-5">
              <p className="text-sm font-semibold text-sky-900">Ventes enregistrees</p>
              <p className="mt-2 text-sm leading-6 text-sky-800/80">
                {snapshot.sales.length} facture(s) client et {snapshot.soldByProduct.reduce((sum, item) => sum + item.quantity, 0)} bouteille(s) vendue(s).
              </p>
            </div>
            <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50/80 p-5">
              <p className="text-sm font-semibold text-amber-900">Approvisionnement</p>
              <p className="mt-2 text-sm leading-6 text-amber-900/75">
                {snapshot.purchases.length} facture(s) usine en historique pour suivre tes futurs chargements.
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="Acces rapides"
          description="Navigation directe vers les operations du quotidien."
        >
          <div className="grid gap-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-sky-300 hover:bg-sky-50"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
