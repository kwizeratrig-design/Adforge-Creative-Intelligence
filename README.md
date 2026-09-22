# AdForge

AdForge is a pnpm monorepo with a Vite frontend and a separate Express API.

## Local development

```bash
pnpm install
pnpm run typecheck
pnpm build
```

## Frontend deployment

Set these environment variables in your hosting provider:

- `VITE_API_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLERK_PROXY_URL` (optional)

Build command:

```bash
pnpm --dir artifacts/adforge build
```

## API deployment

Set these environment variables:

- `PORT`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `REPLICATE_API_TOKEN`
- `REPLICATE_MODEL`
- `GOOGLE_CLOUD_PROJECT`
- `PUBLIC_OBJECT_SEARCH_PATHS`
- `PRIVATE_OBJECT_DIR`

Build command:

```bash
pnpm --filter @workspace/api-server build
```

Start command:

```bash
pnpm --filter @workspace/api-server start
```

## Docker

```bash
docker build -t adforge .
docker run --env-file .env.production -p 5000:5000 adforge
```
