FROM oven/bun:debian AS base
WORKDIR /app

# Install dependencies
COPY api/package.json api/bun.lock ./api/

# Install dependencies for api
WORKDIR /app/api
RUN bun install --frozen-lockfile

# Copy source code
WORKDIR /app
COPY api ./api

# Build the API
WORKDIR /app/api
RUN bun run build

# Run the API
ENV NODE_ENV=production
CMD ["bun", "run", "start"]
