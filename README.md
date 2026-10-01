# OpenSourceMatch

OpenSourceMatch connects developers with open-source contribution opportunities tailored to their programming languages, experience level, and learning goals. It combines live repository and issue retrieval from the GitHub REST API with reasoning from Gemma (`gemma-4-26b-a4b-it`) via the Gemini API to explain project fit, highlight skill gaps, and provide actionable contribution roadmaps.

## Architecture

- **Frontend (`web/`)**: React + TypeScript + Vite, plain CSS, single-reading-column layout, keyboard accessible, zero persistence.
- **Backend (`supabase/`)**: Supabase Edge Function (`recommend`) implemented in TypeScript/Deno.
- **Model**: Gemma `gemma-4-26b-a4b-it` via Google Gemini API (structured inference with `thinkingLevel: "minimal"`).
- **Public No-Login Invocation**: `[functions.recommend] verify_jwt = false`. CORS restricted to configured frontend origin (`http://localhost:5173`).

## Project Layout

```text
├── examples/               # Example profile payloads (beginner, intermediate, advanced)
├── supabase/
│   ├── config.toml         # Function configuration (verify_jwt = false)
│   ├── functions/
│   │   ├── .env.example    # Environment variable placeholders
│   │   └── recommend/      # TypeScript/Deno Edge Function source & tests
│   └── scripts/            # Inference verification scripts
├── web/                    # React frontend application
├── LICENSE                 # MIT License
└── README.md
```

## Prerequisites

- [Deno](https://deno.com/) 2.0+ or the bundled binary in `supabase/.tools/deno-2.9.7/`
- [Node.js](https://nodejs.org/) 20+ and npm
- A Google AI Studio API Key with access to `gemma-4-26b-a4b-it`
- (Optional) A GitHub Personal Access Token (`GITHUB_TOKEN`) for higher rate limits

## Backend Setup & Local Execution

1. Create a local environment file at `supabase/functions/.env.local`:
   ```bash
   cp supabase/functions/.env.example supabase/functions/.env.local
   ```
2. Populate `GEMINI_API_KEY` in `supabase/functions/.env.local` privately.
3. Test Gemma inference:
   ```powershell
   & './supabase/.tools/deno-2.9.7/deno.exe' run --env-file=supabase/functions/.env.local --allow-env --allow-net supabase/scripts/check-gemma.ts
   ```
4. Run the backend test suite:
   ```powershell
   & './supabase/.tools/deno-2.9.7/deno.exe' test --env-file=supabase/functions/.env.local --allow-env --allow-net --allow-read supabase/functions/recommend/recommend_test.ts
   ```
5. Serve the Edge Function locally:
   ```powershell
   & './supabase/.tools/deno-2.9.7/deno.exe' run --env-file=supabase/functions/.env.local --allow-env --allow-net supabase/functions/recommend/index.ts
   ```
   The service listens on `http://localhost:54321`.

## Curl Invocation Example

```bash
curl -X POST http://localhost:54321/functions/v1/recommend \
  -H "Content-Type: application/json" \
  -d @examples/profile-beginner.json
```

## Frontend Setup & Execution

1. Navigate to `web/`:
   ```bash
   cd web
   npm install
   ```
2. Configure `.env`:
   - Mock mode: `VITE_USE_MOCK=true`
   - Live integration mode:
     ```env
     VITE_USE_MOCK=false
     VITE_API_URL=http://localhost:54321/functions/v1/recommend
     ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
   The UI runs on `http://localhost:5173`.

## Limitations & Disclaimers

- **Fit & Difficulty Estimates**: Ratings are heuristic suggestions based on repository documentation and label evidence; they do not guarantee an issue is trivial or unclaimed.
- **Unclaimed Issues**: Always inspect the GitHub issue conversation before writing code.
- **No Data Retention**: No profiles, searches, or accounts are persisted between visits.
- **Model Attribution**: Powered by Google Gemma via the Gemini API. Model license and hosted-service terms: [Google Generative AI Terms of Service](https://ai.google.dev/terms) (to verify).

## License

Original project code is licensed under the [MIT License](LICENSE).
