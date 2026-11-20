# ─── Next.js production build ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install deps from package.json (lockfile copied for reproducibility when present)
COPY package*.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts

# Build-time values (next.config.ts rewrites + metadata are baked at build)
ARG BACKEND_INTERNAL_URL=http://backend:3001
ARG NEXT_PUBLIC_SITE_URL=https://www.exploria360.com
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Cap build memory: the server is shared with other production apps
ENV NODE_OPTIONS=--max-old-space-size=1536

# Copy source and build
COPY . .
RUN npm run build

# ─── Production runtime ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Pull the build artefacts + production deps
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-p", "3000", "-H", "0.0.0.0"]
