# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm install


# ─── Stage 2: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are embedded into browser bundles at build time.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3120
ARG NEXT_PUBLIC_WS_URL=ws://localhost:3121
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Generate Prisma Client
ENV NEXT_TELEMETRY_DISABLED 1
RUN npx prisma generate

# Build Next.js Application
RUN npm run build

# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/prisma ./prisma

# Uploads are persisted through a Docker volume in production. Ensure the
# non-root Next.js user can write to the mount point.
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3120

ENV PORT 3120

ENV HOSTNAME "0.0.0.0"

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
