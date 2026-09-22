# Vercel deployment guide

## 1) Frontend (Vercel)

Import the project root or the frontend folder depending on your Vercel setup.

Set the project environment variables:

- `VITE_API_URL=https://your-api-domain.com`
- `VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_key_here`
- `VITE_CLERK_PROXY_URL=https://your-api-domain.com/api/__clerk` (optional)

Build settings:

- Framework: Vite
- Build command: `pnpm --dir artifacts/adforge build`
- Output directory: `artifacts/adforge/dist/public`

## 2) API (Railway / Render / Fly / VPS)

Use the repo root as the app directory and set these environment variables:

- `PORT=5000`
- `NODE_ENV=production`
- `DATABASE_URL=postgresql://user:password@host:5432/database`
- `CORS_ORIGINS=https://your-frontend-domain.com`
- `CLERK_PUBLISHABLE_KEY=pk_live_your_key_here`
- `CLERK_SECRET_KEY=sk_live_your_key_here`
- `REPLICATE_API_TOKEN=r8_your_token_here`
- `REPLICATE_MODEL=black-forest-labs/flux-schnell`
- `GOOGLE_CLOUD_PROJECT=your-gcp-project-id`
- `PUBLIC_OBJECT_SEARCH_PATHS=gs://your-public-bucket/public`
- `PRIVATE_OBJECT_DIR=gs://your-private-bucket/private`

Start command:

```bash
pnpm --filter @workspace/api-server start
```

## 3) Recommended production flow

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm --filter @workspace/api-server start
```
