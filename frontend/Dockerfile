FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* are baked into the client bundle at build time. The GlitchTip DSN
# is public by design (it lives in the browser), so passing it as a build arg is
# fine. Sourced from the root compose's NEXT_PUBLIC_SENTRY_DSN; empty = disabled.
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_GLITCHTIP_URL=https://errors.hostingnepals.com
ENV NEXT_PUBLIC_API_URL=https://api.hostingnepals.com/api/v1
ENV NEXT_PUBLIC_APP_URL=https://hostingnepals.com
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
ENV NEXT_PUBLIC_GLITCHTIP_URL=$NEXT_PUBLIC_GLITCHTIP_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build:icons && pnpm build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
