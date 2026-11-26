# ============================================================
# InterviewAI API — Multi-stage Production Dockerfile
# ============================================================

# Stage 1: Install dependencies & build
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++ && \
    corepack enable && corepack prepare pnpm@10.11.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod=false

COPY packages/shared-types/ ./packages/shared-types/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @interviewai/shared-types build && \
    pnpm --filter @interviewai/api build && \
    CI=true pnpm prune --prod

# Stage 2: Minimal production runtime
FROM node:22-alpine AS runner
RUN apk add --no-cache dumb-init python3 wget && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy pruned production dependencies and built artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY package.json pnpm-workspace.yaml ./

RUN mkdir -p /app/uploads && chown -R nestjs:nodejs /app

USER nestjs

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health/live || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]

