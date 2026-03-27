import { ModulePage } from "@/components/module-page";

export default function StockPage() {
  return (
    <ModulePage
      eyebrow="Stock"
      title="Gestion du stock et inventaire"
      description="Route dediee au suivi du stock plein/vide, aux mouvements et aux alertes de reapprovisionnement."
      highlights={[
        "Le cahier des charges demande le stock actuel pour chaque type de bouteille.",
        "Les mouvements attendus couvrent entrees, sorties, retours de bouteilles vides et ajustements.",
        "Des notifications automatiques doivent signaler les niveaux de stock faibles.",
      ]}
      nextSteps={[
        "Creer les tables inventory et stock_movements.",
        "Declencher automatiquement les sorties lors de la validation d'une facture.",
        "Ajouter un tableau des alertes avec seuil minimum configurable.",
      ]}
    />
  );
}
