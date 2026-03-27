import { ModulePage } from "@/components/module-page";

export default function ClientsPage() {
  return (
    <ModulePage
      eyebrow="Clients"
      title="Gestion des clients"
      description="Route de consultation des clients avec recherche rapide, ajout, edition et identification des meilleurs comptes."
      highlights={[
        "Chaque client doit porter nom, telephone, adresse, type et historique des achats.",
        "Le module doit permettre la recherche rapide par nom ou telephone.",
        "Le cahier des charges prevoit l'identification automatique des meilleurs clients et l'export de la liste.",
      ]}
      nextSteps={[
        "Creer le schema customers et calculer le total des achats agrege.",
        "Ajouter une table avec filtres et acces direct a /clients/[id].",
        "Prevoir les exports et l'affichage de l'historique complet des transactions.",
      ]}
    />
  );
}
