# AdForge deployment

AdForge is a pnpm monorepo with a Vite frontend and a separate Express API.
Lovable can host or import the frontend, but the API must be deployed separately.

## Frontend

Set the Lovable project root to `artifacts/adforge` and configure:

- `VITE_API_URL`: public URL of the deployed API, without a trailing slash
- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
- `VITE_CLERK_PROXY_URL`: optional Clerk proxy URL

Build command:

```text
pnpm --dir artifacts/adforge build
```

## API

Deploy `artifacts/api-server` with the workspace packages available. The API needs:

- `PORT`
- `DATABASE_URL`
- `CORS_ORIGINS`: comma-separated frontend origins
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `REPLICATE_API_TOKEN`
- `REPLICATE_MODEL`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_APPLICATION_CREDENTIALS` or workload identity
- `PUBLIC_OBJECT_SEARCH_PATHS`
- `PRIVATE_OBJECT_DIR`

Build and start commands:

```text
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server start
```

After setting `DATABASE_URL`, apply the schema change that adds brand ownership:

```text
pnpm --filter @workspace/db push
```

## Security checklist

- Rotate every credential that was ever committed in a local `.env` file.
- Never upload `.env` files to Lovable or commit them to Git.
- Set `CORS_ORIGINS` to the exact production frontend origin.
- Use a dedicated GCS bucket or prefixes for private objects.
- Use workload identity or a secret manager instead of committing a GCP key file.
- Keep `CLERK_SECRET_KEY`, `DATABASE_URL`, `REPLICATE_API_TOKEN`, and GCS credentials server-side only.
