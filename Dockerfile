# Build stage
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Production stage
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
EXPOSE 8000
USER node
CMD ["node", "dist/index.js"]
