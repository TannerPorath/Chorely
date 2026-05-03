# ============================================================
# Stage 1: Build the frontend
# ============================================================
FROM node:20-alpine AS frontend-build

WORKDIR /build/frontend

# Install frontend deps
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ============================================================
# Stage 2: Build the backend (with native modules compiled)
# ============================================================
FROM node:20-alpine AS backend-build

# Install build tools needed for better-sqlite3 native compilation
RUN apk add --no-cache python3 make g++ sqlite

WORKDIR /build/backend

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY backend/ ./

# ============================================================
# Stage 3: Final runtime image
# ============================================================
FROM node:20-alpine

# sqlite for occasional CLI inspection (optional, small)
RUN apk add --no-cache sqlite

WORKDIR /app

# Copy backend with its installed node_modules
COPY --from=backend-build /build/backend ./

# Copy built frontend assets to be served by Express
COPY --from=frontend-build /build/frontend/dist ./public

# Data directory is mounted as a volume
RUN mkdir -p /data
ENV DB_PATH=/data/chorely.db
ENV NODE_ENV=production
ENV PORT=3000
ENV FRONTEND_DIR=/app/public

EXPOSE 3000

# Healthcheck — uses node (no wget/curl needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
