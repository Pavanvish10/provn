# Provn

Provn is a job-preparation platform: AI-graded coding challenges, resume analysis, job-description-driven interview prep, and a simulated AI interview flow — plus a recruiter-facing Business Hub and an admin dashboard.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, SSR)
- TypeScript
- Tailwind CSS v4
- [Supabase](https://supabase.com) (Postgres, Auth, Storage, RLS)
- Deployed on [Vercel](https://vercel.com) via Nitro (`vite.config.ts` hard-pins `nitro.preset: "vercel"`)

## Prerequisites

- Node.js 20+
- npm
- A Supabase project (the free tier works)

## Local setup

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Configure environment variables**

   ```sh
   cp .env.example .env
   ```

   Fill in the Supabase values at minimum (see [Environment variables](#environment-variables) below). Every other integration is optional and degrades gracefully — with a clear "not configured" message — when its key is missing, so the app runs and builds fine without them.

3. **Set up the database**

   Schema and RLS policies live in `supabase/migrations/`. Link to your Supabase project and push them:

   ```sh
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

4. **Run the dev server**

   ```sh
   npm run dev
   ```

   The app serves on `http://localhost:8080` (or the next free port).

## Environment variables

See `.env.example` for the full, authoritative list with descriptions. Summary:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase publishable/anon key (client-safe) |
| `SUPABASE_SECRET_KEY` | Yes | Server-only, bypasses RLS — never expose to the client |
| `GEMINI_API_KEY` | Optional | Resume analysis, JD matching, mock interviews, roadmap generation, challenge explanations |
| `GEMINI_MODEL` | Optional | Overrides the default Gemini model |
| `OPENAI_API_KEY` | Optional | Live AI voice interview room (Realtime API) |
| `OPENAI_REALTIME_MODEL` | Optional | Overrides the default Realtime model |
| `JUDGE0_API_KEY` | Optional | Real code execution (Run/Submit) on coding challenges |
| `RESEND_API_KEY` | Optional | Transactional email (confirmations, scheduling, invites) |

Never commit `.env` — it's gitignored on purpose. Only `.env.example` (with placeholder values) should ever be tracked.

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (outputs to `.vercel/output`) |
| `npm run build:dev` | Development-mode build, for debugging a build issue without minification |
| `npm run preview` | Preview a production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier across the repo |

## Deployment

The project is configured to deploy on **Vercel**:

1. Import the repository into Vercel.
2. Set the environment variables from the table above in the Vercel project settings (Production, and Preview if you want preview deploys to work fully).
3. Deploy — Vercel will run `npm run build`. No other configuration is needed; the Nitro preset and SSR build settings are already pinned in `vite.config.ts`.

The SSR build intentionally forces a single server chunk (see the comment in `vite.config.ts`) to avoid a circular-import crash between the router's vendor chunk and `createServerFn`'s chunk that previously took down every route in production. Don't remove that `manualChunks` override without re-verifying the built `_ssr/ssr.mjs` handler directly.

To deploy elsewhere, change `nitro.preset` in `vite.config.ts` to the target platform's [Nitro preset](https://nitro.build/deploy) and re-verify the production build against that platform before relying on it — this app has only been hardened against the Vercel target.

## Project structure

```
src/
  routes/           File-based routes (TanStack Start) — one file/folder per URL
  components/       Shared and feature-scoped React components
  lib/               Server functions (*.server.ts) and client data-fetching hooks (*-client.ts)
  services/          Feature-specific business logic (job analysis, realtime voice, resume parsing, ...)
  ai/                AI prompt templates, evaluation engine, interview context/config
  store/             Client-side state (interview session/flow, navigation)
supabase/
  migrations/        Database schema and RLS policies, applied via the Supabase CLI
```

## Contributing

Run `npm run lint` and `npm run build` before opening a PR — both must pass. There is currently no automated test suite; verify behavior manually (or with the `/code-review` and `run` tooling if you're using Claude Code) before merging.
