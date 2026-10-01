# Pathfinder — Frontend

Vite + React + TypeScript single-page application.  
Matches developers to open-source repositories and issues via the backend Edge Function.

## Quick start

```bash
cd web
npm install
cp .env.example .env        # edit VITE_API_URL and VITE_USE_MOCK
npm run dev                  # http://localhost:5173
```

## Environment variables

| Variable | Required | Default in `.env.example` | Purpose |
|---|---|---|---|
| `VITE_USE_MOCK` | Yes | `true` | `"true"` → mock adapter with fixtures and sample-data banner. `"false"` → live backend. |
| `VITE_API_URL` | Only when live | `https://<project-ref>.supabase.co/functions/v1/recommend` | Full URL to the Supabase Edge Function. Replace `<project-ref>` with the real project ID. |

> `.env` is gitignored. Never commit real values. Copy from `.env.example`.

### Local development with live backend

The backend Edge Function can be served locally with Deno (no Docker needed):

```powershell
# From repo root — run the backend directly
& 'supabase/.tools/deno-2.9.7/deno.exe' run `
  --no-config `
  --env-file=supabase/functions/.env.local `
  --allow-env=GEMINI_API_KEY,GITHUB_TOKEN,GEMMA_MODEL,ALLOWED_ORIGINS `
  --allow-net `
  supabase/functions/recommend/index.ts
```

Then set `web/.env`:
```dotenv
VITE_USE_MOCK=false
VITE_API_URL=http://localhost:54321/functions/v1/recommend
```

Backend listens on port `54321`. Frontend dev server listens on port `5173` (strict).

### Mock mode

```dotenv
VITE_USE_MOCK=true
```

All fixtures are bundled in `src/api/mock.ts`. A "Sample data — not live results" banner appears. The mock toolbar lets you select beginner/intermediate/advanced fixtures and every DRD error code.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Vite dev server on port 5173 (strict) |
| `npm run build` | TypeScript type-check + production bundle |
| `npm run preview` | Serve the production bundle locally |

## Build-time mock gating

`MockControls`, `mock.ts`, and the sample-data banner are only included in the bundle when `VITE_USE_MOCK=true` at build time. A live build (`VITE_USE_MOCK=false`) contains no fixture strings.

Verified:
```powershell
# Build with VITE_USE_MOCK=false (current .env):
npm run build
Select-String -Path "dist/assets/*.js" -Pattern "Sample data" -Quiet   # False
Select-String -Path "dist/assets/*.js" -Pattern "good first issue"  -Quiet   # False
```

## Project structure

```
web/
├── src/
│   ├── api/
│   │   ├── client.ts       # API client; dynamic import of mock.ts
│   │   └── mock.ts         # Mock adapter + fixtures (mock-only bundle)
│   ├── components/
│   │   ├── ProfileForm.tsx
│   │   ├── RecommendationCard.tsx
│   │   ├── RecommendationList.tsx
│   │   ├── MockControls.tsx   (lazy-loaded, mock builds only)
│   │   ├── LoadingState.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── AboutSection.tsx
│   │   └── TagInput.tsx
│   ├── types/
│   │   └── api.ts          # TypeScript types matching DRD.md contract exactly
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env                    # gitignored; copy from .env.example
├── .env.example            # committed placeholder; no real credentials
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Design

- **Palette**: dark background `#0d1117`, accent `#2ea043` (green), surface cards with subtle borders.
- **Typography**: system font stack; `JetBrains Mono` for code/monospace elements.
- **Responsive**: works from ~375 px mobile to wide desktop.
- **Accessibility**: semantic HTML, ARIA labels, keyboard-navigable form, sufficient colour contrast.

## Integration status

See `web/STATUS.md` for verified facts, mocked parts, and open contract questions.
