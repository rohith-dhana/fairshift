# Multi-stage Dockerfile for FairShift (Cloud Run Ready)
# ------------------------------------------------------------
# Stage 1: Build Vite client assets
# ------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for Docker cache optimization
COPY package*.json ./
RUN npm ci

# Copy source and build static artifacts
COPY . .
RUN npm run build

# ------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend assets and server
COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY tsconfig.json ./
COPY src/config ./src/config
COPY src/utils ./src/utils
COPY src/i18n ./src/i18n
COPY src/services ./src/services

# Install tsx globally or locally for executing server.ts in node
RUN npm install tsx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD ["npx", "tsx", "server.ts"]
