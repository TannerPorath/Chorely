# syntax=docker/dockerfile:1

# ===== Stage 1: Build the frontend =====
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ===== Stage 2: Install backend deps =====
FROM node:20-alpine AS backend-deps
WORKDIR /build
# build tools for better-sqlite3 native compile
RUN apk add --no-cache python3 make g++
COPY backend/package.json ./
RUN npm install --omit=dev

# ===== Stage 3: Final runtime image =====
FROM node:20-alpine
WORKDIR /app

# Copy backend
COPY backend/ ./
COPY --from=backend-deps /build/node_modules ./node_modules

# Copy built frontend into backend's /public so Express can serve it
COPY --from=frontend-builder /build/dist ./public

# Data directory for SQLite (mount a volume here on Unraid)
RUN mkdir -p /data
ENV DATA_DIR=/data
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
