<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Base de données

Le projet utilise **SQLite** avec **Drizzle ORM** pour la gestion des données.

### Structure de la DB

- **Fichiers**:
  - `db/schema.ts` - Schéma des tables (customers, customer_types)
  - `db/index.ts` - Connexion à la base SQLite
  - `db/gaz.db` - Fichier de la base SQLite

### Commandes utiles

- `npm run db:generate` - Générer les migrations
- `npm run db:push` - Pousser le schéma vers la DB
- `npm run db:studio` - Ouvrir Drizzle Studio

### API Clients

- `GET /api/clients` - Liste tous les clients
- `POST /api/clients` - Créer un client
- `GET /api/clients/[id]` - Détail d'un client
- `PUT /api/clients/[id]` - Modifier un client
- `DELETE /api/clients/[id]` - Supprimer un client
- `GET /api/clients/types` - Liste des types de clients

### Server Actions (app/clients/actions.ts)

- `getCustomers()` - Récupérer tous les clients
- `getCustomer(id)` - Récupérer un client par ID
- `createCustomer(data)` - Créer un client
- `updateCustomer(id, data)` - Modifier un client
- `deleteCustomer(id)` - Supprimer un client
- `getTopCustomers(limit)` - Clients avec les meilleurs achats
