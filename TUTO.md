# 🖥️ Gestion Gaz — Application Desktop avec Auto-Update

Ce projet peut maintenant être transformé en application desktop exécutable
(Windows, macOS, Linux) avec **mise à jour automatique depuis GitHub**.

---

## 📦 Architecture

```
┌──────────────────────────────────────────┐
│  Electron (fenêtre desktop native)       │
│  ┌────────────────────────────────────┐  │
│  │  Next.js (serveur local)           │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │  Gestion Gaz (React + API)   │  │  │
│  │  │  + SQLite (better-sqlite3)   │  │  │
│  │  └──────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  🔄 electron-updater                     │
│     Vérifie GitHub Releases              │
│     → Télécharge → Installe → Redémarre  │
└──────────────────────────────────────────┘
```

### Fichiers créés

| Fichier | Rôle |
|---|---|
| `electron/main.js` | Processus principal Electron : lance Next.js, crée la fenêtre, gère l'auto-update |
| `electron/preload.js` | Pont sécurisé entre Electron et le renderer (React) |
| `package.json` | Scripts `build:desktop:*` + config `electron-builder` + publish GitHub |
| `.github/workflows/release.yml` | CI/CD : build automatique sur Windows/macOS/Linux à chaque tag `v*` |

---

## 🚀 Comment builder l'application desktop

### Prérequis

- **Node.js 20+** et **npm** installés
- **Git** installé

### 1. Cloner le projet

```bash
git clone https://github.com/boubacarBente/projectGaz.git
cd projectGaz
npm install
```

### 2. Rebuilder les modules natifs pour Electron

```bash
npx @electron/rebuild -f -w better-sqlite3
```

> **Pourquoi ?** `better-sqlite3` est un module C++. Il doit être compilé pour la
> version d'Electron, pas pour Node.js classique.

### 3. Builder l'application

```bash
# Windows → .exe (NSIS installer)
npm run build:desktop:win

# macOS → .dmg
npm run build:desktop:mac

# Linux → .AppImage + .deb
npm run build:desktop:linux

# Plateforme actuelle
npm run build:desktop
```

Le fichier exécutable sera dans le dossier `release/`.

### 4. Icône de l'application

Crée un fichier `public/icon.png` (minimum **256×256**, idéalement **512×512**).
Tu peux utiliser ton `logo.jpeg` comme base.

```bash
# Avec ImageMagick (Linux/macOS)
convert public/logo.jpeg -resize 512x512 public/icon.png

# Ou avec n'importe quel outil de retouche d'image
```

---

## 🔄 Mise à jour automatique (Auto-Update)

### Comment ça marche

1. L'app Electron inclut `electron-updater`
2. Au lancement, il vérifie les **Releases GitHub** du repo `boubacarBente/projectGaz`
3. Si une version plus récente existe → notification → téléchargement → installation automatique

### Publier une nouvelle version

**Méthode 1 : Automatique (recommandé)**
```bash
# 1. Mettre à jour la version dans package.json (ex: "0.2.0")
# 2. Commiter et pusher
git add package.json
git commit -m "Release v0.2.0"
git push origin main

# 3. Créer le tag → GitHub Actions build automatiquement
git tag v0.2.0
git push origin v0.2.0
```

👉 GitHub Actions va builder pour Windows + macOS + Linux, créer les artefacts,
et les attacher à une **Release GitHub** automatiquement.

**Méthode 2 : Manuel**
```bash
# Builder localement
npm run build:desktop

# Aller sur GitHub → Releases → "Draft a new release"
# → Tag: v0.2.0
# → Uploader les fichiers de release/
# → "Publish release"
```

### Fonctionnement de l'auto-update

```
App lancée
    │
    ▼
Vérifie https://github.com/boubacarBente/projectGaz/releases/latest
    │
    ├── Version plus récente trouvée ?
    │   ├── Oui → Popup "Mise à jour dispo" → Téléchargement → Installation
    │   └── Non → Rien
    │
    └── Erreur réseau → Ignore silencieusement
```

---

## 🛠️ Développement local avec Electron

```bash
# Lancer l'app en mode dev (Next.js + Electron)
npm run dev:desktop
```

Cela démarre :
1. Le serveur Next.js sur le port 12000
2. Electron qui ouvre une fenêtre pointant vers `http://localhost:12000`

---

## 📋 Résumé des commandes

| Commande | Description |
|---|---|
| `npm run dev` | Next.js dev server uniquement |
| `npm run dev:desktop` | Next.js + Electron en mode dev |
| `npm run build` | Build Next.js production |
| `npm run build:desktop` | Build l'app Electron pour la plateforme courante |
| `npm run build:desktop:win` | Build pour Windows (.exe) |
| `npm run build:desktop:mac` | Build pour macOS (.dmg) |
| `npm run build:desktop:linux` | Build pour Linux (.AppImage) |
| `npx @electron/rebuild -f -w better-sqlite3` | Recompiler SQLite pour Electron |

---

## 🔐 Note sur la base de données

L'application utilise SQLite. En production (app desktop) :
- La base de données est créée automatiquement au premier lancement
  (via Drizzle ORM push)
- Elle est stockée dans le dossier de l'application (`db/database2.db`)
- Pour migrer des données existantes, copier le fichier `.db` dans le dossier
  d'installation

---

## 📁 Structure des dossiers (production)

```
Gestion Gaz/
├── Gestion Gaz.exe          ← L'exécutable
├── resources/
│   └── app/                 ← Ton app Next.js buildée
│       ├── .next/
│       ├── node_modules/
│       ├── db/              ← Base de données SQLite
│       └── public/
└── ...
```