FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Build frontend ──────────────────────────────────────────────────────────
FROM base AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY frontend/ .
RUN pnpm build

# ── Backend ─────────────────────────────────────────────────────────────────
FROM base AS backend
WORKDIR /app/backend

COPY backend/package.json backend/pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

COPY backend/ .
# Copy built frontend to serve statically
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV FRONTEND_URL=http://localhost:3001

EXPOSE 3001
CMD ["node", "src/index.js"]
