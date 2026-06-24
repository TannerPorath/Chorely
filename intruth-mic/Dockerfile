# Single-stage runtime image. No build step needed — the frontend is plain
# static files served by Express.
FROM node:20-alpine

WORKDIR /app

# Install production deps first for better layer caching
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# App source
COPY server.js ./
COPY lib ./lib
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Healthcheck via node (no curl/wget in alpine base)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
