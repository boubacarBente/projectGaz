import { ModulePage } from "@/components/module-page";

export default function ParametresPage() {
  return (
    <ModulePage
      eyebrow="Parametres"
      title="Configuration de l'application"
      description="Section prevue pour les informations de l'entreprise, le logo, l'adresse du mini-centre et les parametres generaux."
      highlights={[
        "Le schema technique prevoit une table settings pour le nom, l'adresse et le logo.",
        "Ce module portera aussi les preferences utiles aux impressions et aux exports.",
        "Il peut accueillir les seuils de stock, les modes de paiement et les donnees du point de vente.",
      ]}
      nextSteps={[
        "Creer la table settings et son formulaire d'administration.",
        "Ajouter la configuration du logo et des coordonnees pour la facture PDF.",
        "Prevoir les options globales de sauvegarde et de personnalisation.",
      ]}
    />
  );
}
