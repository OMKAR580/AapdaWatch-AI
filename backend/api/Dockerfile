# Multi-stage Dockerfile for AapdaWatch AI NestJS Backend API
# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@12.4.1

# Copy workspace configs and API package definitions
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/api/package.json ./backend/api/
COPY backend/api/prisma ./backend/api/prisma/

# Install dependencies
RUN pnpm --filter aapdawatch-api install --frozen-lockfile

# Generate Prisma Client
WORKDIR /app/backend/api
RUN pnpm prisma generate

# Copy source code and build
COPY backend/api ./
RUN pnpm build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app/backend/api

ENV NODE_ENV=production
ENV PORT=3001
ENV API_PREFIX=api/v1

# Install pnpm
RUN npm install -g pnpm@12.4.1

# Run container as non-root user
USER node

# Copy built artifacts and node_modules from builder
COPY --chown=node:node --from=builder /app/node_modules /app/node_modules
COPY --chown=node:node --from=builder /app/backend/api/dist ./dist
COPY --chown=node:node --from=builder /app/backend/api/package.json ./package.json
COPY --chown=node:node --from=builder /app/backend/api/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main"]

