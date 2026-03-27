import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";

type ClientDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientDetailPage({
  params,
}: ClientDetailPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profil client"
        title={`Client ${id}`}
        description="Route dynamique reservee au profil detaille d'un client, avec historique complet des achats et indicateurs de fidelite."
        actions={
          <Link
            href="/clients"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:bg-sky-50"
          >
            Retour aux clients
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SurfaceCard
          title="Fiche client"
          description="Emplacement prevu pour l'identite, l'adresse, le type de client et la date de premiere transaction."
        >
          <ul className="space-y-3 text-sm leading-7 text-slate-700">
            <li>Nom et prenoms, numero de telephone, adresse complete.</li>
            <li>Type de client: particulier ou entreprise.</li>
            <li>Total des achats et date de premiere transaction.</li>
          </ul>
        </SurfaceCard>

        <SurfaceCard
          title="Historique d'achats"
          description="Le profil client doit permettre la consultation des transactions liees et l'identification des meilleurs clients."
        >
          <ul className="space-y-3 text-sm leading-7 text-slate-700">
            <li>Liste chronologique des factures associees au client.</li>
            <li>Statistiques de frequence et montant cumule.</li>
            <li>Zone future pour exports et relances de clients inactifs.</li>
          </ul>
        </SurfaceCard>
      </div>
    </div>
  );
}
