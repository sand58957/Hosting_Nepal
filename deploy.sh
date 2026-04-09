#!/bin/bash
# ============================================================
# Hosting Nepal Deployment Script
# Run this on VPS: 194.180.176.91
# DOES NOT touch existing nepalfillings.com site
# ============================================================

set -e

echo "=========================================="
echo "  Hosting Nepal - Docker Deployment"
echo "=========================================="

# 1. Create project directory
echo "[1/8] Creating project directory..."
mkdir -p /root/hostingnepals
cd /root/hostingnepals

# 2. Create docker-compose.yml
echo "[2/8] Creating Docker Compose configuration..."
cat > docker-compose.yml << 'COMPOSE'
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: hn-postgres
    restart: always
    environment:
      POSTGRES_DB: hosting_nepal
      POSTGRES_USER: hosting_nepal
      POSTGRES_PASSWORD: HN_SecureDB_2026!
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5434:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hosting_nepal"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: hn-redis
    restart: always
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "127.0.0.1:6380:6379"
    volumes:
      - redisdata:/data

  # NestJS Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: hn-backend
    restart: always
    environment:
      APP_PORT: 4001
      APP_ENV: production
      APP_URL: https://api.hostingnepals.com
      FRONTEND_URL: https://hostingnepals.com
      DATABASE_URL: postgresql://hosting_nepal:HN_SecureDB_2026!@postgres:5432/hosting_nepal
      REDIS_HOST: redis
      REDIS_PORT: 6379
      JWT_SECRET: hn-jwt-super-secret-production-key-2026
      JWT_EXPIRES_IN: 15m
      JWT_REFRESH_SECRET: hn-refresh-secret-production-key-2026
      JWT_REFRESH_EXPIRES_IN: 7d
      NODE_ENV: production
    ports:
      - "127.0.0.1:4001:4001"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  # Next.js Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: hn-frontend
    restart: always
    environment:
      NEXT_PUBLIC_API_URL: https://api.hostingnepals.com/api/v1
      NEXT_PUBLIC_APP_URL: https://hostingnepals.com
      NODE_ENV: production
    ports:
      - "127.0.0.1:3001:3000"
    depends_on:
      - backend

volumes:
  pgdata:
  redisdata:
COMPOSE

# 3. Create Backend Dockerfile
echo "[3/8] Creating Backend Dockerfile..."
mkdir -p backend
cat > backend/Dockerfile << 'DOCKERFILE'
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 4001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
DOCKERFILE

# 4. Create Frontend Dockerfile
echo "[4/8] Creating Frontend Dockerfile..."
mkdir -p frontend
cat > frontend/Dockerfile << 'DOCKERFILE'
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_PUBLIC_API_URL=https://api.hostingnepals.com/api/v1
ENV NEXT_PUBLIC_APP_URL=https://hostingnepals.com
RUN npm install -g pnpm && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
DOCKERFILE

# 5. Create Nginx config for hostingnepals.com
echo "[5/8] Creating Nginx configuration..."
cat > /etc/nginx/sites-available/hostingnepals.com << 'NGINX'
# API subdomain
server {
    listen 80;
    server_name api.hostingnepals.com;

    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}

# Main website
server {
    listen 80;
    server_name hostingnepals.com www.hostingnepals.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX

# Enable the site
ln -sf /etc/nginx/sites-available/hostingnepals.com /etc/nginx/sites-enabled/

# Test and reload nginx
nginx -t && systemctl reload nginx

echo "[6/8] Nginx configured and reloaded"

# 6. Instructions for copying code
echo ""
echo "=========================================="
echo "  NEXT STEPS - Run from your LOCAL machine"
echo "=========================================="
echo ""
echo "Copy your project files to the VPS:"
echo ""
echo "  # From your local machine, run:"
echo "  scp -r /Users/sandeep/Documents/Hosting_Nepal/backend/* root@194.180.176.91:/root/hostingnepals/backend/"
echo "  scp -r /Users/sandeep/Documents/Hosting_Nepal/frontend/* root@194.180.176.91:/root/hostingnepals/frontend/"
echo ""
echo "  # Exclude node_modules and .next:"
echo "  rsync -avz --exclude='node_modules' --exclude='.next' /Users/sandeep/Documents/Hosting_Nepal/backend/ root@194.180.176.91:/root/hostingnepals/backend/"
echo "  rsync -avz --exclude='node_modules' --exclude='.next' /Users/sandeep/Documents/Hosting_Nepal/frontend/ root@194.180.176.91:/root/hostingnepals/frontend/"
echo ""
echo "Then come back to VPS and run:"
echo ""
echo "  cd /root/hostingnepals"
echo "  docker compose up -d --build"
echo ""
echo "=========================================="
echo "  CLOUDFLARE DNS SETTINGS"
echo "=========================================="
echo ""
echo "  hostingnepals.com    -> A    -> 194.180.176.91  (Proxied)"
echo "  www.hostingnepals.com -> CNAME -> hostingnepals.com (Proxied)"
echo "  api.hostingnepals.com -> A    -> 194.180.176.91  (Proxied)"
echo ""
echo "  SSL/TLS: Full (Strict)"
echo ""
echo "=========================================="
