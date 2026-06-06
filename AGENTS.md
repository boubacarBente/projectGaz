<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Base de données

Le projet utilise **SQLite** avec **Drizzle ORM** pour la gestion des données.

### Structure de la DB

- **Fichiers**:
  - `db/schema.ts` - Schéma des tables + relations Drizzle
  - `db/helpers.ts` - Requêtes avec JOIN automatiques via `db.query...with`
  - `db/index.ts` - Connexion à la base SQLite
  - `db/database2.db` - Fichier de la base SQLite

### Commandes utiles

- `npm run db:generate` - Générer les migrations
- `npm run db:push` - Pousser le schéma vers la DB
- `npm run db:studio` - Ouvrir Drizzle Studio

### Tables de la base

- `users` - Utilisateurs (nom, hash, rôle admin/user)
- `customers` - Clients
- `customer_types` - Types de clients
- `suppliers` - Fournisseurs/usines
- `products` - Produits (bouteilles de gaz)
- `purchase_invoices` - Factures d'achat (dépenses)
- `purchase_invoice_items` - Items des factures d'achat
- `sales_invoices` - Factures de vente
- `sales_invoice_items` - Items des factures de vente
- `stock` - Stock actuel par produit
- `stock_movements` - Historique des mouvements de stock
- `settings` - Paramètres de l'application

### Relations importantes

Les relations Drizzle dans `db/schema.ts` permettent les JOIN automatiques :

- `purchaseInvoiceRelations` : `supplier` (one-to-one via `supplierId`) + `items` (one-to-many)
- Toute requête sur les factures d'achat doit passer par le helper
  `findPurchaseInvoices()` / `findPurchaseInvoiceById()` dans `db/helpers.ts`
- Le mapping vers le type `PurchaseInvoice` est centralisé dans
  `mapPurchaseInvoiceRow()` dans `lib/operations.ts`

---

## API Routes

### Clients
- `GET /api/clients` - Liste tous les clients
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
- `GET /api/fournisseurs` - Liste tous les fournisseurs
- `POST /api/fournisseurs` - Créer un fournisseur
- `GET /api/fournisseurs/[id]` - Détail d'un fournisseur
- `PUT /api/fournisseurs/[id]` - Modifier un fournisseur
- `DELETE /api/fournisseurs/[id]` - Supprimer un fournisseur
- `GET /api/fournisseurs/[id]/paiements` - Factures d'achat d'un fournisseur

### Produits
- `GET /api/produits` - Liste tous les produits
- `POST /api/produits` - Créer un produit
- `GET /api/produits/[id]` - Détail d'un produit
- `PUT /api/produits/[id]` - Modifier un produit
- `DELETE /api/produits/[id]` - Supprimer un produit

### Dépenses (Factures d'achat)
- `GET /api/depenses` - Liste toutes les dépenses
- `POST /api/depenses` - Créer une dépense
- `GET /api/depenses/[id]` - Détail d'une dépense
- `PUT /api/depenses/[id]` - Modifier une dépense
- `DELETE /api/depenses/[id]` - Supprimer une dépense

### Factures (Ventes)
- `GET /api/factures` - Liste toutes les factures de vente
- `POST /api/factures` - Créer une facture de vente
- `GET /api/factures/[id]` - Détail d'une facture
- `PUT /api/factures/[id]` - Modifier une facture
- `DELETE /api/factures/[id]` - Supprimer une facture

### Stock
- `GET /api/stock` - Liste le stock actuel
- `GET /api/stock?type=movements` - Historique des mouvements
- `GET /api/stock?type=alerts` - Alertes de stock faible
- `POST /api/stock` - Ajouter un mouvement de stock
- `PUT /api/stock` - Mettre à jour le seuil minimum

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

**Champs de la table settings :** `primary_color` (couleur principale des boutons/accents, hex), `sidebar_color` (couleur du fond du sidebar, hex). Appliqués dynamiquement via CSS variables DaisyUI. Voir `lib/colors.ts`.

### Dashboard
- `GET /api/operations/snapshot` - Statistiques pour le dashboard

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
