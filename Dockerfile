# Multi-stage production build for SellBot
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and assets
COPY src/ ./src/
COPY dashboard/ ./dashboard/
COPY data/ ./data/

# Compile TypeScript to dist/
RUN npm run build

# ----------------------------------------------------
# Production Runner Image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript, static dashboard, and data files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dashboard ./dashboard
COPY --from=builder /app/data ./data

# Create directory for Baileys auth tokens & audio cache
RUN mkdir -p /app/auth /app/data/audio

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]
