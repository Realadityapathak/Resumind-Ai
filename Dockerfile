# Development dependencies stage
FROM node:24-alpine AS development-dependencies-env
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Production dependencies stage (omitting devDependencies)
FROM node:24-alpine AS production-dependencies-env
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Build stage
FROM node:24-alpine AS build-env
WORKDIR /app
COPY package*.json ./
COPY --from=development-dependencies-env /app/node_modules ./node_modules
COPY . ./
RUN npm run build

# Production runner stage
FROM node:24-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy application artifacts with non-root node ownership
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=production-dependencies-env /app/node_modules ./node_modules
COPY --chown=node:node --from=build-env /app/build ./build
COPY --chown=node:node --from=build-env /app/public ./public

# Non-root user execution
USER node

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Direct execution bypassing npm run to ensure graceful SIGTERM/SIGINT propagation
CMD ["node_modules/.bin/react-router-serve", "./build/server/index.js"]
