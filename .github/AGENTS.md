# Mademo Studio — Agent Instructions

Portfolio artistique interactif. Architecture : **React SPA (TypeScript + Vite)** côté front,
**WordPress headless** côté back (Custom Post Types + REST API personnalisée).

## Commandes essentielles

| Commande | Usage |
|---|---|
| `pnpm dev` | Serveur Vite dev (port 5173, sans WordPress, données de démo) |
| `pnpm build` | Build SPA standard → `dist/` |
| `pnpm build:wp` | Build WordPress (`BUILD_TARGET=wordpress`) → `wordpress/theme/mademo/dist/` puis copie dans Local by Flywheel |
| `pnpm deploy:plugin` | Copie le plugin dans Local by Flywheel |
| `pnpm deploy:theme` | Copie le thème dans Local by Flywheel |
| `pnpm deploy:all` | `deploy:plugin` + `deploy:theme` + `build:wp` |

Il n'y a pas de suite de tests.

## Structure du projet

```
src/
  main.tsx              # Entrée React
  app/
    App.tsx             # Composant racine
    components/         # ui/ (shadcn-style), figma/ (composants générés)
  lib/
    api.ts              # Client REST WordPress (endpoints mademo/v1/*)
    useData.ts          # Hook central de données (fetch + fallback)
    fallback-data.ts    # Données statiques pour preview sans WP
  styles/
    theme.css           # Tokens CSS (noir/blanc, design minimaliste)
    globals.css / index.css / tailwind.css / fonts.css

wordpress/
  theme/mademo/         # Thème WordPress (functions.php, index.php, dist/)
  plugin/mademo-studio/ # Plugin WordPress (CPTs, REST, ACF, admin)
```

## Deux modes de build

1. **Preview / dev** (`pnpm dev` ou `pnpm build`) : SPA autonome, pas de WordPress.
   `window.MADEMO_CONFIG` est absent → `useData` utilise `fallback-data.ts`.

2. **WordPress** (`pnpm build:wp`) : `BUILD_TARGET=wordpress` activé dans `vite.config.ts`.
   - `base` devient `/wp-content/themes/mademo/dist/`
   - Sortie : `wordpress/theme/mademo/dist/`
   - `functions.php` lit `dist/.vite/manifest.json` pour enqueue les assets hashés.
   - WordPress injecte `window.MADEMO_CONFIG` dans `<head>` (apiBase, nonce, siteUrl, uploadsUrl).

## Data layer

- `src/lib/api.ts` : client fetch vers `mademo/v1/{projects,fragments,texts,research}`.
  `API_BASE` : `window.MADEMO_CONFIG.apiBase` → `VITE_WP_API_BASE` → fallback localhost.
- `src/lib/useData.ts` : hook unique, retourne `{ projects, fragments, research, texts, status, reload }`.
  `status` : `"loading" | "ready" | "fallback" | "error"`.

## WordPress — Plugin

Custom Post Types : `mademo_project`, `mademo_fragment`, `mademo_text`, `mademo_research`.  
REST API : `mademo/v1/projects`, `/fragments`, `/texts`, `/research`.  
Source : [wordpress/plugin/mademo-studio/mademo-studio.php](../wordpress/plugin/mademo-studio/mademo-studio.php)

## Conventions

- **Alias** : `@` → `src/`
- **Assets Figma** : imports `figma:asset/<filename>` → résolus vers `src/assets/` par le plugin Vite `figmaAssetResolver`
- **UI** : Tailwind CSS v4, Radix UI, shadcn-style (`class-variance-authority`, `cn()`). Design minimaliste noir/blanc.
- **Animations** : `motion` (Motion for React, v12 — alias de framer-motion).
- **Icônes** : Lucide React.
- **Langue** : l'interface, les labels, les types métier et les commentaires sont en **français**.
- **No SSR** : tout est CSR ; le thème WordPress ne sert qu'un `<div id="root">`.
- Ne pas modifier les fichiers WordPress core (`wp-includes/`, `wp-admin/`).
- **Local by Flywheel** : l'environnement WP local est dans `/Users/mademo/Library/Application Support/Local/sites/mademo-studio/`. Les scripts `deploy:*` y copient les fichiers.
