# Backend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./
COPY backend/tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy prisma schema
COPY backend/prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY backend/src ./src/

# Build TypeScript
RUN npm run build

# Production stage - using slim (Debian) for better Prisma compatibility
FROM node:20-slim

WORKDIR /app

# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy prisma schema and generate client
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy CSV data structure
COPY backend/data_2025 ./data_2025

# Copy entrypoint and make executable
COPY backend/entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Expose port
EXPOSE 4000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application with entrypoint
ENTRYPOINT ["./entrypoint.sh"]
