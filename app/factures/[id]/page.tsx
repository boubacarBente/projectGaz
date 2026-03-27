import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";

type FactureDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FactureDetailPage({
  params,
}: FactureDetailPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facture"
        title={`Details de la facture ${id}`}
        description="Route dynamique prevue pour afficher une facture, son client, ses lignes produits, ses paiements et les actions d'impression."
        actions={
          <Link
            href="/factures"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:bg-sky-50"
          >
            Retour aux factures
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard
          title="Contenu de la facture"
          description="Le cahier des charges demande les informations du client, les produits, les quantites, les prix unitaires et le total."
        >
          <ul className="space-y-3 text-sm leading-7 text-slate-700">
            <li>Bloc client avec nom, adresse et date/heure de transaction.</li>
            <li>Tableau des lignes de vente avec calcul automatique du total.</li>
            <li>
              Zone notes pour motif, rechargement et justification d annulation.
            </li>
          </ul>
        </SurfaceCard>

        <SurfaceCard
          title="Paiement et impression"
          description="La route detail doit aussi couvrir l'avance payee, le reste a payer et l'impression PDF."
        >
          <ul className="space-y-3 text-sm leading-7 text-slate-700">
            <li>Statut de paiement: paye, partiel ou en attente.</li>
            <li>Mode de paiement: especes, mobile money ou virement.</li>
            <li>Actions futures: exporter en PDF, envoyer et reimprimer.</li>
          </ul>
        </SurfaceCard>
      </div>
    </div>
  );
}
