# Système de Gestion — Distribution de Bouteilles de Gaz

Application web complète pour la gestion d'une entreprise de vente et distribution de bouteilles de gaz. Ce système permet de gérer l'ensemble des opérations commerciales : facturation, gestion des stocks, suivi des clients et fournisseurs, tableaux de bord analytiques.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat&logo=next.js)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-FFFFFF?style=flat&logo=drizzle)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=flat&logo=tailwind-css)
![DaisyUI](https://img.shields.io/badge/DaisyUI-5.5-5B23E0?style=flat&logo=daisyui)
![Chart.js](https://img.shields.io/badge/Chart.js-4-FF6384?style=flat&logo=chart.js)

## Table des Matières

- [Fonctionnalités](#fonctionnalités)
- [Stack Technique](#stack-technique)
- [Installation](#installation)
- [Structure du Projet](#structure-du-projet)
- [Base de Données](#base-de-données)
- [Pages](#pages)
- [API REST](#api-rest)
- [Scripts Utiles](#scripts-utiles)
- [Design](#design)

## Fonctionnalités

### 📊 Tableau de Bord
- Indicateurs clés (CA total, achats, bénéfice brut, stock)
- Graphiques d'évolution (ventes vs achats sur 12 mois)
- Top produits vendus (graphique donut)
- Bénéfice mensuel (graphique barres)
- Ventes et approvisionnements récents
- Filtrage par période (jour, semaine, mois, année, total)

### 👥 Gestion des Clients
- Fiche complète (nom, téléphone, email, adresse, ville)
- Typologie client (classification libre avec création à la volée)
- Top clients par volume d'achats
- Recherche rapide avec filtre par type
- Modal de détail avec stats (achats totaux, nombre de factures)

### 🏭 Gestion des Fournisseurs
- Fiche complète (nom, téléphone, adresse, notes)
- Statut actif/inactif
- Modal de détail avec historique des factures d'achat
- Détail des factures expandable (code produit, quantité, prix unitaire)

### 📄 Factures de Vente
- Création avec numéro auto-incrémenté
- Sélection de produits avec prix unitaire
- Calcul automatique des totaux
- Modes de paiement (Espèces, Mobile Money, Virement)
- Statuts de paiement (Payé, Partiel, En attente)
- Gestion des avances et reste à payer
- Génération PDF et export image
- Filtres par statut de paiement

### 📦 Gestion des Stocks
- Stock actuel par produit avec capacité
- Seuil d'alerte minimum configurable
- Mouvements d'entrée/sortie avec référence
- Alertes visuelles pour stock faible
- Historique complet des mouvements

### 🚚 Dépenses / Achats Usine
- Factures d'approvisionnement multi-produits
- Filtres par fournisseur et statut de paiement
- Génération de reçu PDF et image
- Suivi du coût moyen par facture

### 📈 Rapports et Analyses
- Synthèse globale (totaux, bénéfice, panier moyen)
- Graphiques d'évolution mensuelle
- Répartition des ventes par produit
- Top clients et fournisseurs

### ⚙️ Paramètres
- Informations de l'entreprise (nom, téléphone, email, adresse)
- Personnalisation des couleurs (primaire, sidebar)
- Thème clair/sombre
- Devise et format de date
- Préfixes de numérotation (factures, achats)

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 16 (App Router) |
| Base de données | SQLite 3 |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS + DaisyUI 5.5 |
| Graphiques | Chart.js 4 (react-chartjs-2) |
| Génération PDF/Image | jsPDF + html2canvas |
| Animations | Framer Motion |
| Notifications | React Toastify |

## Installation

### Prérequis
- Node.js 18+
- npm

### Étapes

```bash
# Cloner le projet
git clone <repository-url>
cd projectGaz

# Installer les dépendances
npm install

# Initialiser la base de données SQLite
npm run db:push

# Démarrer le serveur de développement
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

## Structure du Projet

```
projectGaz/
├── app/                          # Routes Next.js (App Router)
│   ├── api/                      # Routes API REST
│   │   ├── clients/              #   CRUD clients + types
│   │   ├── depenses/             #   CRUD factures d'achat
│   │   ├── factures/             #   CRUD factures de vente
│   │   ├── fournisseurs/         #   CRUD fournisseurs
│   │   ├── operations/           #   Dashboard (snapshot)
│   │   ├── parametres/           #   GET/PUT paramètres
│   │   ├── produits/             #   CRUD produits
│   │   ├── rapports/             #   Données analytiques
│   │   └── stock/                #   Stock + mouvements
│   ├── clients/                  # Page de gestion des clients
│   ├── depenses/                 # Page des factures d'achat
│   ├── factures/                 # Pages des factures de vente
│   ├── fournisseurs/             # Page de gestion des fournisseurs
│   ├── parametres/               # Page des paramètres
│   ├── produits/                 # Page du catalogue produits
│   ├── rapports/                 # Page des rapports
│   ├── stock/                    # Page de gestion du stock
│   ├── page.tsx                  # Dashboard principal
│   └── layout.tsx                # Layout racine
├── components/                   # Composants React réutilisables
│   ├── app-shell.tsx             #   Sidebar + menu mobile
│   ├── modal.tsx                 #   Modal animée (framer-motion)
│   ├── module-page.tsx           #   Template de page module
│   ├── page-header.tsx           #   En-tête de page
│   ├── search-filter.tsx         #   Recherche + filtre + pagination
│   ├── theme-provider.tsx        #   Contexte thème clair/sombre
│   └── theme-toggle.tsx          #   Bouton de bascule thème
├── db/                           # Base de données
│   ├── schema.ts                 # Définition des tables Drizzle
│   ├── index.ts                  # Connexion SQLite
│   └── database.db               # Fichier de la base
├── lib/                          # Utilitaires
│   ├── colors.ts                 # Application des couleurs CSS
│   ├── invoice-export.ts         # Export PDF/Image
│   ├── operations.ts             # Fonctions métier
│   └── products.ts               # Fonctions produits
└── data/                         # Anciennes données JSON (archivé)
```

## Base de Données

### Tables

| Table | Description |
|-------|-------------|
| `suppliers` | Fournisseurs (nom, téléphone, adresse, total achats) |
| `customers` | Clients (nom, téléphone, email, adresse, ville, type) |
| `customer_types` | Types de clients (classification libre) |
| `products` | Produits / bouteilles (code, nom, capacité, prix) |
| `purchase_invoices` | Factures d'achat (référence, fournisseur, date, total) |
| `purchase_invoice_items` | Lignes des factures d'achat (produit, quantité, coût) |
| `sales_invoices` | Factures de vente (numéro, client, date, paiement) |
| `sales_invoice_items` | Lignes des factures de vente (produit, quantité, prix) |
| `stock` | Stock actuel par produit (quantité, seuil minimum) |
| `stock_movements` | Historique des mouvements (entrée, sortie, ajustement) |
| `settings` | Paramètres de l'application (couleurs, devise, etc.) |

### Produits par Défaut

| Code | Désignation | Capacité | Prix (GNF) |
|------|-------------|----------|------------|
| B3 | Petite bouteille | 3 kg | 28 750 |
| B6 | Moyenne bouteille | 6 kg | 51 500 |
| B9 | Grande bouteille | 9 kg | 77 250 |
| B12 | Très grande bouteille | 12 kg | 107 200 |
| B36 | Bouteille industrielle | 36 kg | 317 300 |
| B48 | Grande bouteille industrielle | 48 kg | 508 072 |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard avec graphiques et indicateurs |
| `/factures` | Liste et gestion des factures de vente |
| `/factures/nouvelle` | Création d'une nouvelle facture |
| `/factures/[id]` | Détail et export d'une facture |
| `/clients` | Gestion des clients (CRUD + modals) |
| `/clients/types` | Gestion des types de clients |
| `/produits` | Catalogue des produits |
| `/stock` | Gestion du stock et mouvements |
| `/depenses` | Factures d'achat / approvisionnement |
| `/fournisseurs` | Gestion des fournisseurs |
| `/rapports` | Rapports et analyses détaillées |
| `/parametres` | Configuration de l'application |

## API REST

### Clients
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/clients` | Liste tous les clients |
| POST | `/api/clients` | Créer un client |
| GET | `/api/clients/[id]` | Détail d'un client |
| PUT | `/api/clients/[id]` | Modifier un client |
| DELETE | `/api/clients/[id]` | Supprimer un client |
| GET | `/api/clients/types` | Liste des types de clients |
| POST | `/api/clients/types` | Créer un type de client |
| GET | `/api/clients/types/[id]` | Détail d'un type |
| PUT | `/api/clients/types/[id]` | Modifier un type |
| DELETE | `/api/clients/types/[id]` | Supprimer un type |

### Fournisseurs
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/fournisseurs` | Liste tous les fournisseurs |
| POST | `/api/fournisseurs` | Créer un fournisseur |
| GET | `/api/fournisseurs/[id]` | Détail + factures d'achat |
| PUT | `/api/fournisseurs/[id]` | Modifier un fournisseur |
| DELETE | `/api/fournisseurs/[id]` | Supprimer un fournisseur |

### Produits
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/produits` | Liste tous les produits |
| POST | `/api/produits` | Créer un produit |
| PUT | `/api/produits/[id]` | Modifier un produit |
| DELETE | `/api/produits/[id]` | Supprimer un produit |

### Factures de Vente
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/factures` | Liste toutes les factures |
| POST | `/api/factures` | Créer une facture |
| GET | `/api/factures/[id]` | Détail d'une facture |
| PUT | `/api/factures/[id]` | Modifier une facture |
| DELETE | `/api/factures/[id]` | Supprimer une facture |

### Dépenses (Factures d'Achat)
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/depenses` | Liste toutes les dépenses |
| POST | `/api/depenses` | Créer une dépense |
| GET | `/api/depenses/[id]` | Détail d'une dépense |
| PUT | `/api/depenses/[id]` | Modifier une dépense |
| DELETE | `/api/depenses/[id]` | Supprimer une dépense |

### Stock
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/stock` | Stock actuel (ou ?type=movements / ?type=alerts) |
| POST | `/api/stock` | Ajouter un mouvement de stock |
| PUT | `/api/stock` | Mettre à jour le seuil minimum |

### Autres
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/operations/snapshot` | Statistiques pour le dashboard |
| GET | `/api/rapports` | Données analytiques complètes |
| GET | `/api/parametres` | Récupérer les paramètres |
| PUT | `/api/parametres` | Mettre à jour les paramètres |

## Scripts Utiles

```bash
npm run dev              # Démarrer le serveur de développement
npm run build            # Builder pour production
npm run lint             # Linter le code
npm run db:generate      # Générer les migrations Drizzle
npm run db:push          # Pousser le schéma vers la DB
npm run db:studio        # Ouvrir Drizzle Studio
```

## Design

### Personnalisation
Les couleurs de l'application sont **configurables dynamiquement** depuis la page Paramètres :
- **Couleur primaire** (`primary_color`) : boutons, accents, badges
- **Couleur sidebar** (`sidebar_color`) : fond de la barre latérale
- **Thème** : clair ou sombre
- Appliquées en temps réel via des variables CSS DaisyUI (voir `lib/colors.ts`)

### Navigation
- **Desktop** : Sidebar fixe avec navigation complète + lien rapide vers les paramètres
- **Mobile** : Header fixe avec menu hamburger → drawer coulissant animé

---

*Dernière mise à jour : 16/05/2026*