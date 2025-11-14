# Copilot Instructions for MyGymApp

## Architecture snapshot
- Monorepo with `backend/` (Express 4 on Node 22) and `frontend/` (Next.js 14 App Router) documented in `ARCHITECTURE.md` and `PROJECT_SUMMARY.md`—read those first when reworking cross-cutting flows.
- API surface is organized per domain inside `backend/src/routes/*` and wired in `backend/src/server.js`; every route depends on Mongoose models in `backend/src/models` plus shared middleware (`auth.js`, `requirePremium.js`).
- Data persists in Cosmos DB (Mongo API) collections (`users`, `memberships`, `payments`, `products`) defined via the models; file assets (product images, avatars, chat uploads) live under `/uploads` locally and mirror Azure Blob containers in production.
- Frontend pages live under `frontend/src/app`, grouped by route segments: `(client)` for member dashboard, `(admin)` for operations, and public marketing routes at root; global state & helpers sit in `src/store` and `src/lib`.

## Environment & local workflows
- Copy `backend/ENV_EJEMPLO.txt` into `backend/.env` and keep `JWT_SECRET` ≥32 chars; run `npm run check-env` and `npm run check-openai` before starting the API so CI-like checks fail fast.
- `start-local.ps1` launches both servers (`backend` on :3000, `frontend` on :3001) and reminds you to run Mongo/Cosmos—prefer it for day-to-day work; otherwise run `npm run dev` in each package manually.
- Frontend expects `NEXT_PUBLIC_API_URL` (set in `frontend/.env.local`) to point at the backend `/api`; dev defaults to `http://localhost:3000/api` via `src/lib/api.ts`.
- Jest exists on the backend (`npm test`) but has no suites yet; add smoke tests when touching core auth/AI flows.

## Backend conventions
- Every route module exports an Express router and mounts under `/api/<domain>` in `server.js`; prefer extending existing routers instead of adding ad-hoc endpoints elsewhere.
- Environment access always happens through `dotenv.config` near the top of each module—follow this pattern if a file needs env vars to avoid missing `.env` in scripts.
- Authentication is JWT-based: use `authenticate` middleware plus `requireAdmin`/`requirePremium` as needed, and rely on `req.user` already hydrated by Mongoose.
- Azure integrations live in `src/config/azure.js`; always guard blob/email operations behind connection checks like `getContainerClient` does to keep local dev working without Azure credentials.
- Long-running jobs (expiry emails, membership status) belong in `src/services/membershipService.js`; keep cron/Azure Function triggers thin and delegate logic there.

## Frontend patterns
- `ProtectedRoute` (`src/components/ProtectedRoute.tsx`) wraps any page that needs auth or role gating—reuse it instead of duplicating redirect logic in pages.
- API calls must go through `src/lib/api.ts` so Axios attaches the bearer token and drops `Content-Type` for `FormData`; direct `fetch` calls should be rare and justified.
- Auth state is centralized in `src/store/authStore.ts` (Zustand), which syncs token/user with `localStorage`. After mutating user data, call `useAuthStore.getState().updateUser(...)` to keep UI consistent.
- Admin analytics views use Recharts; follow existing chart config under `src/app/(admin)/dashboard/page.tsx` for consistent styling and color tokens defined in `globals.css`/Tailwind config.

## AI Hub specifics
- All premium AI endpoints live in `backend/src/routes/ai.js` and persist transcripts via `models/AIConversation.js`; whenever you add prompts or new AI flows, update both the route and the model metadata.
- AI features require both `OPENAI_API_KEY` and a premium membership (`planType: "premium"`)—enforce via `requirePremium` middleware plus frontend checks in `src/app/(client)/ai-hub/page.tsx`.
- File uploads for AI (images/PDF) land in `uploads/chat/`; if you add new media types, update the Multer config in the route and ensure those folders are created in `server.js` before serving static assets.

## Deployment & ops
- Real deployments target Azure App Service; `docs/DEPLOYMENT.md` + `azure-deploy.ps1|.sh` detail the required CLI steps, environment variables, and startup command (`npm start`). Keep those in sync with any runtime change.
- Scheduled tasks (membership reminders) should run via Azure Functions or cron hitting `/api/admin/cron` style endpoints—don’t embed schedulers inside the web process beyond what `membershipService` already exposes.
- When adding new env vars or secrets, document them in `README.md` + `QUICK_START.md` to keep infra scripts (especially `.azure` configs) accurate, and remember to mirror them in Azure App Settings.
