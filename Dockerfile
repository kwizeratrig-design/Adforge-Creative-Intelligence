FROM node:24-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

RUN corepack enable && pnpm install --frozen-lockfile

ENV NODE_ENV=production
ENV PORT=5000

RUN pnpm run build

EXPOSE 5000

CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
