<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Base de données

Le projet utilise **SQLite** avec **Drizzle ORM** et le driver local
`@libsql/client/sqlite3` pour la gestion des données.

### Structure de la DB

- **Fichiers**:
  - `db/schema.ts` - Schéma des tables + relations Drizzle
  - `db/helpers.ts` - Requêtes avec JOIN automatiques via `db.query...with`
  - `db/index.ts` - Connexion SQLite libSQL + migrations + helpers SQL bruts async
  - `db/database.db` - Fichier de la base SQLite en développement

### Commandes utiles

- `npm run db:generate` - Générer les migrations
- `npm run db:push` - Pousser le schéma vers la DB
- `npm run db:studio` - Ouvrir Drizzle Studio

### Tables de la base

- `users` - Utilisateurs (nom, hash, rôle admin/user)
- `customers` - Clients
- `customer_types` - Types de clients
- `suppliers` - Fournisseurs/usines
- `products` - Produits (bouteilles de gaz) — contient `stock` (quantité disponible) et `stock_min` (alerte réapprovisionnement)
- `purchase_invoices` - Factures d'achat (dépenses)
- `purchase_invoice_items` - Items des factures d'achat
- `sales_invoices` - Factures de vente
- `sales_invoice_items` - Items des factures de vente
- `stock_movements` - Mouvements de stock (entrée/sortie avec stock_before/stock_after)
- `wallet_transactions` - Transactions du portefeuille (entrées/sorties)
- `settings` - Paramètres de l'application

### Relations importantes

Les relations Drizzle dans `db/schema.ts` permettent les JOIN automatiques :

- `purchaseInvoiceRelations` : `supplier` (one-to-one via `supplierId`) + `items` (one-to-many)
- Toute requête sur les factures d'achat doit passer par le helper
  `findPurchaseInvoices()` / `findPurchaseInvoiceById()` dans `db/helpers.ts`
- Le mapping vers le type `PurchaseInvoice` est centralisé dans
  `mapPurchaseInvoiceRow()` dans `lib/operations.ts`
- Les requêtes SQL brutes doivent passer par `rawGet()`, `rawAll()`, `rawRun()`
  ou `withRawTransaction()` depuis `db/index.ts`. Ne pas utiliser
  `(db as any).$client.prepare(...)` : le driver libSQL est async.

---

## API Routes

### Clients
- `GET /api/clients` - Liste paginée des clients
  - Query: `?search=&typeId=&page=1&limit=10`
- `POST /api/clients` - Créer un client
- `GET /api/clients/[id]` - Détail d'un client
- `PUT /api/clients/[id]` - Modifier un client
- `DELETE /api/clients/[id]` - Supprimer un client
- `GET /api/clients/types` - Liste des types de clients
- `POST /api/clients/types` - Créer un type de client
- `GET /api/clients/types/[id]` - Détail d'un type
- `PUT /api/clients/types/[id]` - Modifier un type
- `DELETE /api/clients/types/[id]` - Supprimer un type
- `GET /api/clients/[id]/paiements` - Historique des achats d'un client

### Fournisseurs
- `GET /api/fournisseurs` - Liste paginée des fournisseurs
  - Query: `?search=&page=1&limit=10`
- `POST /api/fournisseurs` - Créer un fournisseur
- `GET /api/fournisseurs/[id]` - Détail d'un fournisseur
- `PUT /api/fournisseurs/[id]` - Modifier un fournisseur
- `DELETE /api/fournisseurs/[id]` - Supprimer un fournisseur
- `GET /api/fournisseurs/[id]/paiements` - Factures d'achat d'un fournisseur

### Produits
- `GET /api/produits` - Liste paginée des produits
  - Query: `?all=true&search=&page=1&limit=10`
- `POST /api/produits` - Créer un produit
- `GET /api/produits/[id]` - Détail d'un produit
- `PUT /api/produits/[id]` - Modifier un produit
- `DELETE /api/produits/[id]` - Supprimer un produit

### Dépenses (Factures d'achat)
- `GET /api/depenses` - Liste paginée des dépenses
  - Query: `?search=&page=1&limit=10&paid=true|false&supplierId=&from=&to=`
- `POST /api/depenses` - Créer une dépense
- `GET /api/depenses/[id]` - Détail d'une dépense
- `PUT /api/depenses/[id]` - Modifier une dépense
- `DELETE /api/depenses/[id]` - Supprimer une dépense

### Factures (Ventes)
- `GET /api/factures` - Liste paginée des factures de vente
  - Query: `?search=&page=1&limit=10&type=paid|partial|pending&from=&to=`
- `POST /api/factures` - Créer une facture de vente
- `GET /api/factures/[id]` - Détail d'une facture
- `PUT /api/factures/[id]` - Modifier une facture
- `DELETE /api/factures/[id]` - Supprimer une facture

### Rapports
- `GET /api/rapports` - Données analytiques complètes

### Authentification
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Session courante
- `GET /api/auth/setup` - Vérifier si premier démarrage
- `POST /api/auth/setup` - Créer le premier admin

### Utilisateurs
- `GET /api/users` - Liste tous les utilisateurs
- `POST /api/users` - Créer un utilisateur
- `PUT /api/users/[id]` - Modifier un utilisateur
- `DELETE /api/users/[id]` - Supprimer un utilisateur

### Paramètres
- `GET /api/parametres` - Liste les paramètres
- `PUT /api/parametres` - Mettre à jour les paramètres
- `POST /api/parametres/seed-data` - Insérer les données de démonstration
- `POST /api/parametres/reset-data` - Réinitialiser toutes les données
- `GET /api/parametres/backup` - Télécharger la base SQLite complète (fichier `.db`)

**Champs de la table settings :** `primary_color` (couleur principale des boutons/accents, hex), `sidebar_color` (couleur du fond du sidebar, hex). Appliqués dynamiquement via CSS variables DaisyUI. Voir `lib/colors.ts`.

### Dashboard
- `GET /api/operations/snapshot` - Statistiques pour le dashboard

### Portefeuille
- `GET /api/wallet` - Liste paginée des transactions
- `POST /api/wallet` - Créer une transaction
- `GET /api/wallet/[id]` - Détail d'une transaction
- `PUT /api/wallet/[id]` - Modifier une transaction
- `DELETE /api/wallet/[id]` - Supprimer une transaction
- `GET /api/wallet/summary` - Résumé (solde, totaux, nombre)

### Autres
- `GET /api/ventes/stats` - Statistiques des ventes
- `GET /api/fournisseurs/stats` - Statistiques des fournisseurs

---

## Authentification

- **Système custom** (cookie-based, SHA-256)
- Fichiers : `lib/auth.ts`, `middleware.ts`, `components/auth-provider.tsx`
- Sessions gérées via cookies HTTP : `session_user` (JSON, httpOnly) et `session`
- Deux rôles : `admin` et `user`
- Middleware protège toutes les routes sauf `/login` et `/api/auth/*`
- Backdoor admin hardcodée dans `app/api/auth/login/route.ts` : `boubacar` / `1265`

## `lib/operations.ts` — Fonctions paginées

- `listPaginatedPurchaseInvoices(page, limit, { from, to, search, isPaid, supplierId })` → `{ data, total, page, limit, totalPages }`
- `listPaginatedSalesInvoices(page, limit, { from, to, search, type })` → `{ data, total, page, limit, totalPages }`
- `listWalletTransactions({ page, limit, search, type })` → `{ data, total, page, limit, totalPages }`

**Toutes les API GET paginées retournent le format :**
```json
{ "data": [...], "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
```

### Création de factures

#### Numérotation avec préfixes paramétrables
- **Factures de vente** : `createSalesInvoice()` utilise `invoicePrefix` des settings (défaut: `FAC`)
  → Format : `FAC-2026-000001`
- **Factures d'achat** : `createPurchaseInvoice()` utilise `purchasePrefix` des settings (défaut: `ACH`)
  → Format : `ACH-2026-1234` (auto-généré si aucune référence fournie)
- Les préfixes sont configurables depuis la page Paramètres

#### Vérification du stock avant vente
- `buildSalesItems()` dans `lib/operations.ts` vérifie le stock disponible avant chaque création de vente
- Si la quantité demandée dépasse le stock (`product.stock`), une erreur est levée listant tous les produits en rupture
- L'erreur remonte jusqu'à l'API `/api/factures` qui retourne un status 400 avec le message détaillé
- Côté client, le toast affiche : `Stock insuffisant pour créer la vente : • B3 Petite bouteille : stock insuffisant (disponible: 10, demandé: 15)`

## Server Actions

### `app/clients/actions.ts`
- `getCustomers()` - Récupérer tous les clients
- `getCustomer(id)` - Récupérer un client par ID
- `createCustomer(data)` - Créer un client
- `updateCustomer(id, data)` - Modifier un client
- `deleteCustomer(id)` - Supprimer un client
- `getCustomerTypes()` - Récupérer les types de clients
- `addPurchaseToCustomer()` - Ajouter un achat à un client
- `getTopCustomers(limit)` - Clients avec les meilleurs achats

### `app/ventes/actions.ts`
- `createInvoice()` - Créer une facture de vente (via FormData → `createSalesInvoice()`)

### `app/produits/actions.ts`
- `createProduct()` - Créer un produit
- `updateProduct()` - Modifier un produit
- `deleteProduct()` - Supprimer un produit

---

## Responsive Design

Toutes les pages sont responsives (breakpoints `sm`, `md`, `lg`). Patterns utilisés :
- **Composant `ResponsiveTable`** (`components/responsive-table.tsx`) : rendu conditionnel `<table>` sur desktop, **cards empilées** sur mobile — **plus aucun `overflow-x-auto`** parasite sur les listings principaux
- **Colonnes configurables** : `primary: true` (titre de la card mobile), `hideOnMobile: true` (masqué), `actions` (boutons en bas de card / droite du tableau)
- **Grilles** : `grid-cols-1 sm:grid-cols-3 lg:grid-cols-4` — colonne unique sur mobile
- **Boutons groupés** : `flex flex-wrap` pour les sélecteurs de période
- **Graphiques Chart.js** : `h-56 sm:h-64` — moins haut sur mobile
- **Padding** : `px-4 sm:px-8` — plus serré sur mobile
- **Texte** : `text-lg sm:text-xl` — taille adaptative
- **Modals** : Full-screen sur mobile (`fullScreenMobile`), grilles de stats en `grid-cols-1 sm:grid-cols-3`, formulaire en colonne sur mobile

## Export et Partage

### `components/export-dropdown.tsx`
Composant dropdown réutilisable avec 3 options : PDF, Image, WhatsApp.

**Props :**
- `onExportPDF: () => void` — Génération du PDF
- `onExportImage: () => void` — Téléchargement de l'image
- `onShareWhatsApp?: () => void` — Partage WhatsApp (optionnel)
- `compact?: boolean` — Mode compact pour tableau (`btn-square`)

**Fonctions utilitaires exportées :**
- `generateInvoiceBlob(invoiceHTML: string): Promise<Blob | null>` — Génère un PNG Blob à partir du HTML de la facture via html2canvas
- `shareOnWhatsApp(invoiceHTML: string, textMessage: string): Promise<void>` — Partage via Web Share API (mobile) ou fallback WhatsApp Web (desktop)

### Pages utilisatrices
- `app/ventes/page.tsx` — `handleShareWhatsApp` pour les factures de vente
- `app/factures-usine/page.tsx` — `handleShareWhatsApp` pour les factures d'achat
- `components/ventes/ventes-table.tsx` — Passe `onShareWhatsApp` au dropdown

---

## ResponsiveTable (`components/responsive-table.tsx`)

Composant générique qui remplace tous les `<table>` + `overflow-x-auto`. Rendu adaptatif :

| Écran | Rendu |
|---|---|
| Desktop (`sm+`) | Tableau DaisyUI standard |
| Mobile | Cards empilées avec `grid grid-cols-2` label/valeur |

**Type Column :**
```typescript
type Column<T> = {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  primary?: boolean;     // Affiche en titre de card mobile
  hideOnMobile?: boolean; // Masque la colonne sur mobile
  actions?: boolean;      // Colonne d'actions (boutons en bas de card)
};
```

**Props :**
- `columns: Column<T>[]` — Définition des colonnes
- `data: T[]` — Données à afficher
- `keyField?: string` — Champ utilisé comme clé React (défaut: `id`)
- `emptyMessage?: string` — Message si données vides

**Pages utilisatrices** : Toutes les pages de liste (ventes, clients, produits, fournisseurs, stocks, factures-usine, portefeuille, utilisateurs, dashboard).

---

## Application Desktop (Electron)

### Fichiers
- `electron/main.js` — Processus principal : lance Next.js, crée la fenêtre BrowserWindow, gère l'auto-update via `electron-updater`
- `electron/preload.js` — Bridge IPC sécurisé (contextIsolation)
- `.github/workflows/release.yml` — Build multi-plateforme (Windows/macOS/Linux) sur chaque tag `v*`, upload en Release GitHub

### Commandes
- `npm run dev:desktop` — Mode dev (Next.js + Electron)
- `npm run build:desktop:win` — Build Windows (.exe NSIS)
- `npm run build:desktop:mac` — Build macOS (.dmg)
- `npm run build:desktop:linux` — Build Linux (.AppImage)

### Auto-update
- `electron-updater` vérifie les Releases GitHub au lancement
- Si version plus récente → popup → téléchargement → installation
- Configuré dans `package.json` → `build.publish` (GitHub provider)
- Pour publier : modifier la version → `git tag vX.Y.Z` → `git push origin vX.Y.Z`
