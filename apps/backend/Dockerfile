FROM oven/bun:1.3.4-alpine AS base
WORKDIR /app
COPY package.json bun.lockb* ./

FROM base AS dev
RUN bun install
COPY . .
CMD ["bun", "dev"]

FROM base AS prod
RUN bun install --production
COPY . .
CMD ["bun", "start"]
