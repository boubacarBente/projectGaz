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
  - `db/helpers.ts` - ⚠️ **Code mort** : `findPurchaseInvoices()` n'est importé nulle part. Conservé, mais ne pas s'en servir comme référence.
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
- Toute requête sur les factures d'achat passe par `lib/operations.ts`
  (`listPaginatedPurchaseInvoices`, `getPurchaseInvoice`, `createPurchaseInvoice`…).
  Le helper `findPurchaseInvoices()` de `db/helpers.ts` n'est **importé nulle part** :
  ne pas le prendre pour la voie officielle.
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
  - Query: `?from=&to=&previousFrom=&previousTo=&productId=&customerId=&supplierId=&paymentStatus=paid|partial|pending|unpaid`
  - Retourne `summary`, `comparison`, `monthlyData`, `soldByProduct`, `productMargins`, `topCustomers`, `receivables`, `payables`, `stockInsights`, `decisionSummary`

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
- Fichiers : `lib/auth.ts`, `proxy.ts`, `components/auth-provider.tsx`
- Sessions gérées via cookies HTTP : `session_user` (JSON, httpOnly) et `session`
- Deux rôles : `admin` et `user`
- `proxy.ts` (export `proxy()`) protège toutes les routes sauf `/login` et `/api/auth/*`.
  ⚠️ Next 16 a renommé `middleware.ts` en `proxy.ts` : il n'existe **aucun** `middleware.ts` dans ce projet.

---

## Accès à l'application : jeton d'accès et boucle locale

Objectif : l'application desktop ne doit être joignable **ni depuis un navigateur,
même sur `localhost`, ni depuis le réseau** — tout en restant utilisable normalement.

### Les deux verrous

| Verrou | Où | Effet |
|---|---|---|
| **Jeton d'accès** | `electron/main.js` + `proxy.ts` | 404 sur toute requête dépourvue de l'en-tête `x-app-token` |
| **Bind boucle locale** | `HOSTNAME: '127.0.0.1'` dans le `fork` | l'instance n'est pas joignable depuis le réseau |

`electron/main.js` génère un jeton aléatoire à chaque lancement
(`crypto.randomBytes(32).toString('hex')`), le transmet au serveur Next par la
variable d'environnement `APP_TOKEN`, puis l'injecte dans **chaque** requête de la
fenêtre via `session.defaultSession.webRequest.onBeforeSendHeaders` — à
enregistrer **impérativement avant `loadURL`**.

`proxy.ts` compare `request.headers.get('x-app-token')` à `process.env.APP_TOKEN`
et répond **404** (et non 401/403 : un navigateur n'apprend même pas que
l'application existe). Le contrôle est **ignoré quand `APP_TOKEN` est absent**,
donc `next dev` reste consultable au navigateur — c'est le mode de débogage.

⚠️ En Next 16 le proxy s'exécute dans le **runtime Node.js** (et non Edge), donc
`process.env.APP_TOKEN` est lu à l'exécution et non figé au build. En Edge le
contrôle aurait été **silencieusement inactif** (cf.
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`).

### Pourquoi les fichiers de `public/` sont exemptés

`next/image` ne lit pas le fichier directement : il demande au routeur Next de le
servir **en interne**.

- `next-server.js:767,777` appelle `fetchInternalImage(href, …)` avec l'URL
  **source** (`/logo.jpeg`) — et `handleInternalReq` (ligne 749) interdit
  explicitement que ce soit `/_next/image` lui-même (invariant E496).
- `image-optimizer.js:1017` construit cette requête interne via
  `createRequestResponseMocks({ url, method, socket })` — **sans `headers`**
  (le constructeur fait `this.headers = headers`, donc `undefined`).

Cette requête ne peut donc structurellement pas porter le jeton. La filtrer casse
**toutes** les images `next/image` : c'est le bug « logo du sidebar cassé » de la
0.1.27. D'où l'exemption par extension (`PUBLIC_ASSET_PATTERN`), placée **avant**
le contrôle du jeton.

Ces fichiers sont publics par nature — ni page, ni API, ni donnée. Tout le reste
(HTML, payloads RSC, `/api/*`, chunks `_next/static`, et `/_next/image` lui-même)
reste soumis au jeton.

### Vérifier la protection

```powershell
npm run build; npm run copy:standalone

# Serveur de test avec un jeton connu, sur un port libre (ne pas gêner l'app en cours)
$env:APP_TOKEN='jeton-de-test'; $env:HOSTNAME='127.0.0.1'; $env:PORT='3210'
node .next\standalone\server.js
```

```powershell
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:3210/                                    # 404
curl.exe -s -o NUL -w "%{http_code}`n" -H "x-app-token: jeton-de-test" http://127.0.0.1:3210/     # 307 -> /login
curl.exe -s -o NUL -w "%{http_code}`n" http://127.0.0.1:3210/_next/image?url=%2Flogo.jpeg        # 404
```

Le `307` sur `/` est le comportement normal : le jeton passe, puis le contrôle de
session redirige vers `/login` faute de cookie.

---

## `lib/operations.ts` — Fonctions paginées

- `listPaginatedPurchaseInvoices(page, limit, { from, to, search, isPaid, supplierId })` → `{ data, total, page, limit, totalPages }`
- `listPaginatedSalesInvoices(page, limit, { from, to, search, type })` → `{ data, total, page, limit, totalPages }`
- `listWalletTransactions({ page, limit, search, type })` → `{ data, total, page, limit, totalPages }`
- `getRapportData({ from, to, previousFrom, previousTo, productId, customerId, supplierId, paymentStatus })` → données analytiques complètes avec comparaison, marges, dettes et stock

**Toutes les API GET paginées retournent le format :**
```json
{ "data": [...], "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
```

### Rapports analytiques

- `app/api/rapports/route.ts` parse les filtres et appelle `getRapportData()` avec un objet `RapportFilters`.
- Les types partagés des rapports sont dans `lib/rapports-types.ts`.
- Les composants principaux de la page `/rapports` sont :
  - `components/rapports/rapport-executive-summary.tsx`
  - `components/rapports/rapport-comparison.tsx`
  - `components/rapports/rapport-debts.tsx`
  - `components/rapports/rapport-stock-insights.tsx`
  - `components/rapports/rapport-product-table.tsx`
  - `components/rapports/rapport-stats-cards.tsx`
- La page `/rapports` propose une période personnalisée, des filtres par produit/client/fournisseur/statut de paiement, un export PDF complet et un export CSV.

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
- `shareOnWhatsApp(invoiceHTML: string, textMessage: string, fileName?: string): Promise<void>` — Partage via Web Share API (mobile) ou fallback WhatsApp Web (desktop)

### Pages utilisatrices
- `app/ventes/page.tsx` — `handleShareWhatsApp` pour les factures de vente
- `app/factures-usine/page.tsx` — `handleShareWhatsApp` pour les factures d'achat
- `components/ventes/ventes-table.tsx` — Passe `onShareWhatsApp` au dropdown

---

## Documents terrain

- `Bon_de_livraison_journalier_Gestion_Gaz.docx` — Fiche Word imprimable pour les livraisons journalières.
- `Bon_de_livraison_journalier_Gestion_Gaz.pdf` — Version PDF de la même fiche.
- La fiche contient une colonne `Vides récup.` pour le suivi manuel terrain.
- Important : les bouteilles vides récupérées ne sont pas encore modélisées dans `db/schema.ts`, `sales_invoice_items`, `stock_movements` ni les API de vente. Ne pas supposer que cette donnée existe dans le système applicatif avant une future évolution de schéma.

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
- Si version plus récente → téléchargement automatique → popup de redémarrage quand la mise à jour est prête
- Configuré dans `package.json` → `build.publish` (GitHub provider)
- Pour publier : modifier la version → `git tag vX.Y.Z` → `git push origin vX.Y.Z`
- Distribuer aux clients l'installateur NSIS `Gestion Gaz-Setup-x.y.z.exe`, pas le dossier `win-unpacked`
- Les fichiers d'auto-update (`latest.yml`, `.blockmap`, installateur) doivent être attachés à la Release GitHub
- Les changements de schéma DB passent par `db/schema.ts` + `npm run db:generate`; les migrations dans `db/migrations` sont copiées dans l'app packagée et exécutées automatiquement au démarrage via `db/index.ts`

---

## Retour arrière : restauration du scroll et de l'état de vue

Système en deux couches indépendantes qui partagent la même maille : **l'entrée
d'historique**.

| Fichier | Rôle |
|---|---|
| `lib/scroll-engine.ts` | Position de scroll par entrée d'historique + boucle de restauration tolérante au chargement asynchrone |
| `lib/view-state.ts` | État de vue des pages (page, recherche, filtres) par entrée d'historique |
| `components/scroll-restoration.tsx` | Monté une fois dans `app/layout.tsx`, fournit le signal « route rendue » |
| `components/back-button.tsx` | Bouton retour visible, appelle `router.back()` |

### Contraintes non négociables

Elles découlent de la lecture de
`node_modules/next/dist/client/components/app-router.js` :

1. **Ne jamais écrire dans `history`.** Next patche déjà `pushState` /
   `replaceState` et force `window.location.reload()` quand `event.state.__NA`
   est absent au popstate (`app-router.js:290-292`). Créer une entrée
   d'historique soi-même déclenche un **rechargement complet** au retour arrière.
2. **`preserveCustomHistoryState` vaut `false`** sur une navigation normale
   (`segment-cache/navigation.js:240` et `:351`) : Next efface délibérément le
   state custom des entrées. Y stocker une clé d'entrée est vain.
3. **Le déclenchement se fait uniquement sur `popstate`.** Aucun drapeau « est-ce
   un retour ? » : une navigation avant (`<Link>`, sidebar) ne produit pas de
   popstate, donc elle ne restaure jamais rien. Corollaire : un F5 ne restaure
   rien, sans avoir besoin d'un drapeau dédié.
4. **Clé d'entrée** : `navigation.currentEntry.key` sous Chromium (Electron,
   Chrome) — unique par entrée, donc deux visites de `/ventes` gardent chacune
   leur position. Firefox/Safari n'ont pas cette API : repli sur
   `pathname + search`, où seule la dernière visite d'une URL est mémorisée.

### Ajouter l'état de vue à une page

```tsx
import { useViewStateRehydration, writeViewState, clampPage } from '@/lib/view-state';

type MaPageViewState = { search: string; currentPage: number };

// 1. Après les déclarations d'état, AVANT ce qui en dérive (useMemo, useEffect)
const rehydrated = useViewStateRehydration<MaPageViewState>('ma-page', (saved) => {
  applyRestored(saved);                    // si la page utilise useSearchFilter
  if (saved.autreChamp != null) setAutreChamp(saved.autreChamp);
});

// 2. Écrire à chaque changement
useEffect(() => {
  if (!rehydrated) return;
  writeViewState<MaPageViewState>('ma-page', { search, currentPage });
}, [rehydrated, search, currentPage]);

// 3. Bloquer le fetch tant que la réhydratation n'a pas eu lieu
useEffect(() => {
  if (!rehydrated) return;                 // sinon : fetch page 1 PUIS fetch page restaurée
  // ...
}, [rehydrated, /* … */]);

// 4. Clamper après le fetch — pages paginées côté serveur uniquement
const corrected = clampPage(currentPage, data.totalPages);
if (corrected !== null) setCurrentPage(corrected);
```

**Pourquoi `useLayoutEffect` et jamais un initialiseur de `useState`** : les pages
sont des composants client, mais Next les rend quand même côté serveur. Lire
`sessionStorage` dans un initialiseur produirait un HTML serveur (page 1,
recherche vide) différent du premier rendu client → **erreur d'hydratation
React 19**.

### `useSearchFilter` et `applyRestored`

`components/search-filter.tsx` expose `applyRestored({ search, filter,
currentPage })`, à appeler **depuis la réhydratation uniquement**.

Son effet de remise à zéro de la pagination est **amorcé avec les valeurs
restaurées** plutôt qu'avec les valeurs courantes. Sans ça, la réhydratation
serait prise pour une saisie utilisateur et remettrait la page à 1. Le point
subtil : un `setState` déclenché dans un `useLayoutEffect` provoque une **seconde
passe de commit**, et React vide les effets passifs de la première passe avant de
rendre la seconde. L'effet s'exécute donc **deux fois** — un drapeau « ne pas
réinitialiser » consommé au premier passage serait déjà épuisé quand la seconde,
la vraie, arrive.

### Pages couvertes

| Page | État restauré |
|---|---|
| `/ventes`, `/clients`, `/produits`, `/fournisseurs`, `/factures-usine`, `/portefeuille`, `/stocks` | recherche, filtres, pagination |
| `/rapports` | période, produit, client, fournisseur, statut de paiement |
| `/` (dashboard) | période |
| `/clients/[id]/paiements`, `/fournisseurs/[id]/paiements` | période, recherche |

Les pages de détail sans état de liste (factures, fiches) bénéficient déjà de la
restauration du **scroll** (couche 1, générique) sans aucune modification.

**Deux patrons à ne pas confondre :**

- **Pages de liste** — le fetch est piloté par les filtres, donc il est **gaté**
  sur `rehydrated`. Sans gate : une requête sur la valeur par défaut, puis une
  seconde sur la valeur restaurée.
- **Dashboard** — son fetch a des **dépendances vides** (il charge tout le
  snapshot une fois) et le filtrage se fait côté client via `periodFilter`.
  Restaurer la période suffit, un gate n'apporterait rien. Ne pas
  « uniformiser » par erreur.

### Le bouton retour

`components/back-button.tsx` appelle `router.back()`, donc une vraie traversée
d'historique. Un `<Link href="/ventes">` **empile** une entrée et ne restaure
donc rien : c'était le défaut des anciennes flèches « Retour vers X » codées en
dur, qui ont été retirées.

Il est rendu par `components/page-header.tsx`, utilisé par **17 pages**. Une
seule page le monte encore à la main : `app/ventes/[id]/page.tsx`, où il est
**en ligne avec le numéro de facture** plutôt que dans une carte — cette page a
une mise en page d'impression (`max-w-4xl`, styles `print:`) qu'un `PageHeader`
casserait.

Il s'auto-masque quand il n'y a plus d'entrée précédente
(`navigation.currentEntry.index === 0`) et ne s'affiche jamais sur `/login`.
La prop `withMargin` (défaut `true`) ajoute `mb-3 sm:mb-4` ; passer
`withMargin={false}` quand le parent gère déjà l'espacement (conteneur
`space-y-*` ou rangée flex).

### Pièges connus

- **Le port Electron est dynamique en production** (`findFreePort(3000)`,
  `electron/main.js:95`) : l'origin `http://localhost:PORT` change entre deux
  lancements, donc tout stockage navigateur est vidé. C'est pourquoi le système
  utilise `sessionStorage` et non `localStorage`. La restauration fonctionne
  dans une session, jamais entre deux lancements.
- **Ctrl+R recharge tout le document.** `setMenuBarVisibility(false)` masque la
  barre de menu mais ne supprime pas le menu applicatif : ses accélérateurs
  restent actifs. Position perdue — comportement voulu.
- **Un clic dans la sidebar est un `push`**, donc il ne restaure rien : la page
  repart du haut. C'est la règle retenue ; le bouton retour est le seul
  déclencheur.
- **`tsconfig.json` a `"incremental": true`** : `tsc --noEmit` ne réaffiche pas
  les erreurs des fichiers non modifiés, ce qui donne une fausse impression de
  propreté. Pour un contrôle fiable : `npx tsc --noEmit --incremental false`.
- **`release/win-unpacked/` contient une copie packagée du projet** que le glob
  `**/*.ts` de tsconfig capte : ~50 erreurs de type pré-existantes en découlent.
  Les ignorer, ne pas « corriger » ce dossier.
