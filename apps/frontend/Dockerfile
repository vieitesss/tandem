FROM oven/bun:1.3.4-alpine AS base
WORKDIR /app
COPY package.json bun.lockb* ./

FROM base AS dev
RUN bun install
COPY . .
CMD ["bun", "dev"]

FROM base AS builder
RUN bun install
COPY . .
RUN bun run build

FROM oven/bun:1.3.4-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only the standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Use node to run the standalone server
CMD ["node", "server.js"]
