# ==============================================================================
# RentSphere Backend API - Production Multi-Stage Dockerfile
# Stage 1: Build & Compilation (Node.js 20 Alpine)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies required for native binaries and Prisma
RUN apk add --no-cache openssl libc6-compat

# Install dependencies using frozen lockfile
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client binaries for linux-musl
COPY prisma ./prisma
RUN npx prisma generate

# Copy configuration and application source code
COPY tsconfig.json ./
COPY src ./src
COPY docs ./docs

# Compile TypeScript to JavaScript in /app/dist
RUN npm run build

# Remove development dependencies to keep production footprint minimal
RUN npm prune --omit=dev

# ==============================================================================
# Stage 2: Minimal Production Runtime
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for Prisma and process signal management
RUN apk add --no-cache openssl dumb-init

# Security: Set production environment and default port
ENV NODE_ENV=production
ENV PORT=3000

# Copy runtime artifacts from builder with proper non-root permissions
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/docs ./docs

# Security Hardening: Drop privileges to non-root node user (Alpine UID 1000)
USER node

# Expose standard application port
EXPOSE 3000

# Native Docker Healthcheck against the health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/api/v1/health || exit 1

# Process supervisor for signal handling (SIGTERM, SIGINT)
ENTRYPOINT ["dumb-init", "--"]

# Launch production server
CMD ["node", "dist/server.js"]
