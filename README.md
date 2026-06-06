# Système de Gestion — Distribution de Bouteilles de Gaz

Application web complète pour la gestion d'une entreprise de vente et distribution de bouteilles de gaz. Ce système permet de gérer l'ensemble des opérations commerciales : facturation, gestion des stocks, suivi des clients et fournisseurs, tableaux de bord analytiques, avec authentification et gestion des utilisateurs.

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
- [Authentification](#authentification)

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

### 🔐 Authentification & Utilisateurs
- Système d'authentification par cookie (hachage SHA-256)
- Deux rôles : **admin** et **user**
- Page de connexion sécurisée
- Gestion des utilisateurs (création, modification, suppression)
- Routes protégées par middleware

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
| Styling | Tailwind CSS 4 + DaisyUI 5.5 |
| Graphiques | Chart.js 4 (react-chartjs-2) |
| Génération PDF/Image | jsPDF + html2canvas |
| Animations | Framer Motion |
| Notifications | React Toastify |
| Authentification | Système custom (cookies + SHA-256) |

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

# (Optionnel) Insérer les données de démonstration
# Démarrer le serveur :
npm run dev
# Puis dans un autre terminal :
curl -X POST http://localhost:3000/api/parametres/seed-data

# Démarrer le serveur de développement
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

## Structure du Projet

```
projectGaz/
├── app/                          # Routes Next.js (App Router)
│   ├── api/                      # Routes API REST
│   │   ├── auth/                 #   Connexion, déconnexion, session
│   │   ├── clients/              #   CRUD clients + types
│   │   ├── depenses/             #   CRUD factures d'achat
│   │   ├── factures/             #   CRUD factures de vente
│   │   ├── fournisseurs/         #   CRUD fournisseurs + stats
│   │   ├── operations/           #   Dashboard (snapshot)
│   │   ├── parametres/           #   GET/PUT paramètres + seed/reset
│   │   ├── produits/             #   CRUD produits
│   │   ├── rapports/             #   Données analytiques
│   │   ├── stock/                #   Stock + mouvements
│   │   ├── users/                #   Gestion des utilisateurs
│   │   └── ventes/               #   Stats ventes
│   ├── clients/                  # Pages clients (liste, détail, types)
│   ├── factures-usine/           # Pages des factures d'achat usine
│   ├── fournisseurs/             # Pages fournisseurs
│   ├── login/                    # Page de connexion
│   ├── parametres/               # Page des paramètres
│   ├── produits/                 # Page du catalogue produits
│   ├── rapports/                 # Page des rapports
│   ├── stock/                    # Page de gestion du stock
│   ├── utilisateurs/             # Page de gestion des utilisateurs
│   ├── ventes/                   # Pages des ventes (liste, nouvelle, détail)
│   ├── page.tsx                  # Dashboard principal
│   └── layout.tsx                # Layout racine
├── components/                   # Composants React réutilisables
│   ├── app-shell.tsx             #   Sidebar + menu mobile + user menu
│   ├── auth-provider.tsx         #   Contexte d'authentification
│   ├── date-picker.tsx           #   Sélecteur de date
│   ├── metric-card.tsx           #   Carte de métrique dashboard
│   ├── modal.tsx                 #   Modal animée (framer-motion)
│   ├── module-page.tsx           #   Template de page module
│   ├── page-header.tsx           #   En-tête de page
│   ├── search-filter.tsx         #   Recherche + filtre + pagination
│   ├── surface-card.tsx          #   Carte générique
│   ├── theme-provider.tsx        #   Contexte thème clair/sombre + couleurs
│   └── theme-toggle.tsx          #   Bouton de bascule thème
├── db/                           # Base de données
│   ├── schema.ts                 # Définition des tables Drizzle
│   ├── helpers.ts                #   Requêtes avec relations (JOIN auto)
│   ├── index.ts                  #   Connexion SQLite + schéma
│   └── database2.db              #   Fichier de la base SQLite
├── lib/                          # Utilitaires et fonctions métier
│   ├── auth.ts                   # Authentification (hachage, CRUD users)
│   ├── colors.ts                 # Application des couleurs CSS (OKLCH)
│   ├── invoice-export.ts         # Export PDF/Image
│   ├── operations.ts             # Fonctions métier (CRUD + rapports)
│   ├── products.ts               # Fonctions produits
│   └── seed-data.ts              # Données de démonstration
├── data/                         # Anciennes données JSON (archivé)
└── middleware.ts                 # Protection des routes (auth)
```

## Base de Données

### Tables

| Table | Description |
|-------|-------------|
| `users` | Utilisateurs (nom, hash mot de passe, rôle admin/user) |
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

### Relations Drizzle

Les relations entre tables sont définies dans `db/schema.ts` et permettent des **JOIN automatiques** via le helper `db/helpers.ts` :

- `purchase_invoices → suppliers` : one-to-one via `supplierId`
- `purchase_invoices → purchase_invoice_items` : one-to-many
- `sales_invoices → sales_invoice_items` : one-to-many
- `customers → customer_types` : one-to-one via `typeId`
- `purchase_invoice_items → products` : one-to-one
- `sales_invoice_items → products` : one-to-one
- `stock → products` : one-to-one

**Principe :** Les helpers utilisent `db.query...with` pour charger automatiquement les relations sans avoir à écrire de `SELECT` avec toutes les colonnes en dur. Si le schéma change, un seul endroit est à modifier : `mapPurchaseInvoiceRow()` dans `lib/operations.ts`.

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
| `/ventes` | Liste et gestion des factures de vente |
| `/ventes/nouvelle` | Création d'une nouvelle facture |
| `/ventes/[id]` | Détail et export d'une facture |
| `/factures-usine` | Liste des factures d'achat (fournisseurs) |
| `/factures-usine/[id]` | Détail d'une facture d'achat |
| `/clients` | Gestion des clients (CRUD + modals) |
| `/clients/types` | Gestion des types de clients |
| `/clients/[id]/paiements` | Historique des achats d'un client |
| `/produits` | Catalogue des produits |
| `/stock` | Gestion du stock et mouvements |
| `/fournisseurs` | Gestion des fournisseurs |
| `/fournisseurs/[id]/paiements` | Paiements d'un fournisseur |
| `/rapports` | Rapports et analyses détaillées |
| `/parametres` | Configuration de l'application |
| `/login` | Page de connexion |
| `/utilisateurs` | Gestion des utilisateurs (admin) |

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

### Authentification
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Session courante |
| GET | `/api/auth/setup` | Vérifier si premier démarrage |
| POST | `/api/auth/setup` | Créer le premier admin |

### Utilisateurs
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/users` | Liste tous les utilisateurs |
| POST | `/api/users` | Créer un utilisateur |
| PUT | `/api/users/[id]` | Modifier un utilisateur |
| DELETE | `/api/users/[id]` | Supprimer un utilisateur |

### Autres
| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/operations/snapshot` | Statistiques pour le dashboard |
| GET | `/api/rapports` | Données analytiques complètes |
| GET | `/api/parametres` | Récupérer les paramètres |
| PUT | `/api/parametres` | Mettre à jour les paramètres |
| POST | `/api/parametres/seed-data` | Insérer les données de démonstration |
| POST | `/api/parametres/reset-data` | Réinitialiser toutes les données |
| GET | `/api/ventes/stats` | Statistiques des ventes |
| GET | `/api/fournisseurs/stats` | Statistiques des fournisseurs |

## Scripts Utiles

```bash
npm run dev              # Démarrer le serveur de développement
npm run build            # Builder pour production
npm run lint             # Linter le code
npm run db:generate      # Générer les migrations Drizzle
npm run db:push          # Pousser le schéma vers la DB
npm run db:studio        # Ouvrir Drizzle Studio
```

## Server Actions

| Action | Fichier | Description |
|--------|---------|-------------|
| `getCustomers()` | `app/clients/actions.ts` | Liste tous les clients |
| `getCustomer(id)` | `app/clients/actions.ts` | Détail d'un client |
| `createCustomer(data)` | `app/clients/actions.ts` | Créer un client |
| `updateCustomer(id, data)` | `app/clients/actions.ts` | Modifier un client |
| `deleteCustomer(id)` | `app/clients/actions.ts` | Supprimer un client |
| `getTopCustomers(limit)` | `app/clients/actions.ts` | Top clients par achats |
| `getCustomerTypes()` | `app/clients/actions.ts` | Types de clients |
| `addPurchaseToCustomer()` | `app/clients/actions.ts` | Ajouter un achat client |
| `createInvoice()` | `app/ventes/actions.ts` | Créer une facture de vente |
| `createProduct()` | `app/produits/actions.ts` | Créer un produit |
| `updateProduct()` | `app/produits/actions.ts` | Modifier un produit |
| `deleteProduct()` | `app/produits/actions.ts` | Supprimer un produit |

## Authentification

Le système utilise une **authentification custom** sans dépendance externe :

- **Hachage** : SHA-256 via `crypto.subtle.digest()`
- **Session** : Cookies HTTP (`session_user` + `session`)
- **Rôles** : `admin` et `user`
- **Protection** : Middleware Next.js protégeant toutes les routes sauf `/login` et les assets statiques
- **Setup** : Route `/api/auth/setup` pour créer le premier administrateur au premier démarrage

### Middleware

Le fichier `middleware.ts` intercepte toutes les requêtes et :
- Laisse passer les routes publiques (`/login`, `/api/auth/*`)
- Vérifie la présence du cookie `session_user`
- Redirige vers `/login` si non authentifié (pages) ou retourne 401 (API)

## Design

### Personnalisation
Les couleurs de l'application sont **configurables dynamiquement** depuis la page Paramètres :
- **Couleur primaire** (`primary_color`) : boutons, accents, badges
- **Couleur sidebar** (`sidebar_color`) : fond de la barre latérale
- **Thème** : clair ou sombre
- Appliquées en temps réel via des variables CSS DaisyUI en format OKLCH (voir `lib/colors.ts`)

### Navigation
- **Desktop** : Sidebar fixe avec navigation complète + menu utilisateur + lien rapide vers les paramètres
- **Mobile** : Header fixe avec menu hamburger → drawer coulissant animé

---

*Dernière mise à jour : 06/06/2026*