# Stage 1: Install dependencies
FROM node:22-slim AS deps
WORKDIR /app
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Stage 2: Build TypeScript
FROM node:22-slim AS builder
WORKDIR /app
RUN corepack enable pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
RUN pnpm prune --prod

# Stage 3: Production runtime (distroless, no shell, no package manager)
FROM gcr.io/distroless/nodejs22-debian12

LABEL org.opencontainers.image.source="https://github.com/layers-pub/layers"
LABEL org.opencontainers.image.description="Layers ATProto appview for linguistic annotation"

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production

EXPOSE 3000

# Default entrypoint: API server. Override CMD for indexer: ["dist/indexer.js"]
CMD ["dist/index.js"]
