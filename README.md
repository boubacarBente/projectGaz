# Système de Gestion - Entreprise de Distribution de Bouteilles de Gaz

Application web complète pour la gestion d'une entreprise de vente et distribution de bouteilles de gaz. Ce système permet de gérer l'ensemble des opérations commerciales, de la facturation à l'analyse des performances, en passant par la gestion des stocks et des clients.

![Next.js](https://img.shields.io/badge/Next.js-14+-000000?style=flat&logo=next.js)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat&logo=sqlite)
![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-FFFFFF?style=flat&logo=drizzle)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38BDF8?style=flat&logo=tailwind-css)
![DaisyUI](https://img.shields.io/badge/DaisyUI-5B23E0?style=flat)

## Table des Matières

- [Fonctionnalités](#fonctionnalités)
- [Stack Technique](#stack-technique)
- [Installation](#installation)
- [Structure du Projet](#structure-du-projet)
- [Base de Données](#base-de-données)
- [API et Routes](#api-et-routes)
- [Scripts Utiles](#scripts-utiles)
- [Déploiement](#déploiement)

## Fonctionnalités

### Gestion des Produits
- Catalogue de produits (bouteilles de gaz de différentes capacités)
- Gestion des prix unitaires
- Gestion des accessoires et kg acheté
- Historique des modifications de prix

### Gestion des Clients
- Fiche client complète (nom, téléphone, adresse, type)
- Historique des achats
- Identification automatique des meilleurs clients
- Recherche rapide par nom ou téléphone

### Gestion des Factures
- Création de factures avec numéro auto-incrémenté (format: N° 000001)
- Calcul automatique des totaux
- Gestion des avances et reste à payer
- Modes de paiement multiples (Espèces, Mobile Money, Virement)
- Statuts de paiement (Payé, Partiellement payé, En attente)
- Génération PDF des factures
- Réimpression de factures antérieures

### Gestion des Stocks
- Inventaire par type de bouteille
- Suivi des bouteilles pleines vs vides
- Seuil d'alerte pour réapprovisionnement
- Historique des mouvements de stock
- Notifications automatiques pour stock faible

### Gestion des Dépenses
- Catégories variées (achat de bouteilles, transport, salaires, loyer, électricité, eau, maintenance)
- Enregistrement détaillé avec pièces justificatives
- Suivi des dépenses par catégorie

### Tableau de Bord et Statistiques
- Indicateurs en temps réel (CA, ventes, dépenses, bénéfice)
- Graphiques interactifs (évolution des ventes sur 7 jours, 4 semaines, 12 mois)
- Analyse des meilleurs clients (Top 10)
- Analyse financière mensuelle
- Répartition des ventes par type de bouteille

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 14+ (App Router, React Server Components) |
| Base de données | SQLite 3 |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS + DaisyUI |
| Validation | Zod |
| Gestion État | Zustand ou React Context |
| Graphiques | Recharts ou Chart.js |
| Génération PDF | jsPDF ou react-pdf |
| Gestion Dates | date-fns ou Day.js |

## Installation

### Prérequis
- Node.js 18+
- npm ou pnpm

### Étapes

```bash
# Cloner le projet
git clone <repository-url>
cd projectGaz

# Installer les dépendances
npm install
# ou
pnpm install

# Configurer la base de données
npm run db:generate
npm run db:push

# Démarrer le serveur de développement
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

## Structure du Projet

```
projectGaz/
├── app/                    # Routes Next.js (App Router)
│   ├── api/               # Routes API
│   ├── clients/           # Gestion des clients
│   ├── depenses/          # Gestion des dépenses
│   ├── factures/          # Gestion des factures
│   ├── parametres/        # Paramètres de l'application
│   ├── produits/          # Catalogue produits
│   ├── rapports/         # Rapports et analyses
│   ├── stock/            # Gestion du stock
│   └── page.tsx          # Dashboard principal
├── components/            # Composants React réutilisables
├── db/                    # Schéma et connexion SQLite
│   ├── schema.ts         # Définition des tables
│   └── index.ts          # Connexion à la base
├── lib/                   # Utilitaires et fonctions helper
└── data/                  # Données JSON (produits, invoices)
```

## Base de Données

### Tables Principales

- **products** - Catalogue des produits (code, nom, capacité, prix)
- **customers** - Informations clients
- **invoices** - Factures avec paiement et statut
- **invoice_items** - Lignes de facture
- **expenses** - Dépenses par catégorie
- **stock_movements** - Historique des mouvements de stock
- **inventory** - État actuel du stock
- **settings** - Paramètres de l'entreprise

### Produits par Défaut

| Code | Désignation | Capacité | Prix (GNF) |
|------|-------------|----------|------------|
| B3 | Petite bouteille | 3 kg | 28 750 |
| B6 | Moyenne bouteille | 6 kg | 51 500 |
| B9 | Grande bouteille | 9 kg | 77 250 |
| B12 | Très grande bouteille | 12 kg | 107 200 |
| B36 | Bouteille industrielle | 36 kg | 317 300 |
| B48 | Grande bouteille industrielle | 48 kg | 508 072 |

## API et Routes

### Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard principal avec statistiques |
| `/factures` | Liste et gestion des factures |
| `/factures/nouvelle` | Créer une nouvelle facture |
| `/factures/[id]` | Détails et impression d'une facture |
| `/clients` | Gestion des clients |
| `/clients/[id]` | Profil et historique client |
| `/produits` | Catalogue de produits |
| `/stock` | Gestion du stock et inventaire |
| `/depenses` | Suivi des dépenses |
| `/rapports` | Rapports et analyses détaillées |
| `/parametres` | Configuration de l'application |

### API REST

- `GET /api/clients` - Liste tous les clients
- `POST /api/clients` - Créer un client
- `GET /api/clients/[id]` - Détail d'un client
- `PUT /api/clients/[id]` - Modifier un client
- `DELETE /api/clients/[id]` - Supprimer un client
- `GET /api/clients/types` - Liste des types de clients

- `GET /api/produits` - Liste des produits
- `POST /api/produits` - Créer un produit
- `PUT /api/produits/[id]` - Modifier un produit
- `DELETE /api/produits/[id]` - Supprimer un produit

- `GET /api/factures` - Liste des factures
- `POST /api/factures` - Créer une facture
- `GET /api/factures/[id]` - Détails d'une facture
- `PUT /api/factures/[id]` - Modifier une facture
- `DELETE /api/factures/[id]` - Annuler une facture

- `GET /api/depenses` - Liste des dépenses
- `POST /api/depenses` - Ajouter une dépense

- `GET /api/stock` - État du stock
- `POST /api/stock` - Mouvement de stock

## Scripts Utiles

```bash
# Générer les migrations Drizzle
npm run db:generate

# Appliquer le schéma à la base de données
npm run db:push

# Ouvrir Drizzle Studio
npm run db:studio

# Linter le code
npm run lint

# Builder pour production
npm run build
```

## Design

### Palette de Couleurs
- Couleur primaire : Bleu professionnel (#2E75B6)
- Couleur secondaire : Orange (#F59E0B)
- Succès : Vert (#10B981)
- Erreur : Rouge (#EF4444)
- Neutre : Gris (#6B7280)

### Composants DaisyUI
- Boutons : btn, btn-primary, btn-secondary
- Cartes : card, card-bordered
- Tableaux : table, table-zebra
- Formulaires : input, select, textarea
- Modales : modal
- Alertes : alert
- Stats : stat

## Sécurité

- Validation côté serveur avec Zod
- Protection CSRF
- Sanitization des inputs
- Chiffrement de la base de données (optionnel)

## Planning

| Phase | Description | Durée |
|-------|-------------|-------|
| Phase 1 | Configuration et Setup | 1 semaine |
| Phase 2 | Gestion produits et clients | 2 semaines |
| Phase 3 | Système de facturation | 2 semaines |
| Phase 4 | Gestion stock et dépenses | 2 semaines |
| Phase 5 | Dashboard et statistiques | 2 semaines |
| Phase 6 | Tests et déploiement | 1 semaine |

**Durée totale estimée : 10 semaines**

---

*Version 1.0 - 22/03/2026*