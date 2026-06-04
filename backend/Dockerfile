# ─────────────────────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files only (layer cache)
COPY package.json package-lock.json ./

# Install production deps only
RUN npm ci --omit=dev

# ─────────────────────────────────────────────────────────────
# Stage 2: Runtime
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy installed deps from previous stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY src ./src
COPY package.json ./

# Change ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

# Health check
HEALTHCHECK --interval=20s --timeout=10s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
