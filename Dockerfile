# =========================
# 1. Build stage
# =========================
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# TanStack Start compila SSR aquí (dist/server/server.js exporta un fetch
# handler, sin index.html estático en dist/client — no se puede servir como
# SPA con un file server plano). VITE_API_URL se inyecta en build time y
# queda embebido en el bundle del cliente.
ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_API_URL=${VITE_API_URL}

RUN pnpm run build

# =========================
# 2. Serve stage (SSR real vía srvx)
# =========================
FROM node:22-alpine AS deploy

WORKDIR /app

RUN corepack enable

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN pnpm prune --prod

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app
USER appuser

EXPOSE 3100

CMD ["pnpm", "run", "start"]
