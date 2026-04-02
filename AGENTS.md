<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Base de données

Le projet utilise **SQLite** avec **Drizzle ORM** pour la gestion des données.

### Structure de la DB

- **Fichiers**:
  - `db/schema.ts` - Schéma des tables
  - `db/index.ts` - Connexion à la base SQLite
  - `db/database.db` - Fichier de la base SQLite

### Commandes utiles

- `npm run db:generate` - Générer les migrations
- `npm run db:push` - Pousser le schéma vers la DB
- `npm run db:studio` - Ouvrir Drizzle Studio

### Tables de la base

- `customers` - Clients
- `customer_types` - Types de clients
- `products` - Produits (bouteilles de gaz)
- `purchase_invoices` - Factures d'achat (dépenses)
- `purchase_invoice_items` - Items des factures d'achat
- `sales_invoices` - Factures de vente
- `sales_invoice_items` - Items des factures de vente
- `stock` - Stock actuel par produit
- `stock_movements` - Historique des mouvements de stock
- `settings` - Paramètres de l'application

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

### Paramètres
- `GET /api/parametres` - Liste les paramètres
- `PUT /api/parametres` - Mettre à jour les paramètres

### Dashboard
- `GET /api/operations/snapshot` - Statistiques pour le dashboard

---

## Server Actions (app/clients/actions.ts)

- `getCustomers()` - Récupérer tous les clients
- `getCustomer(id)` - Récupérer un client par ID
- `createCustomer(data)` - Créer un client
- `updateCustomer(id, data)` - Modifier un client
- `deleteCustomer(id)` - Supprimer un client
- `getTopCustomers(limit)` - Clients avec les meilleurs achats
