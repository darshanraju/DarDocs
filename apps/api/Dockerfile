FROM node:20-slim

# Install git for repo cloning (God Mode analysis)
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./

# Copy the core package (API dependency)
COPY packages/core/package.json packages/core/package.json
COPY packages/core/src packages/core/src

# Copy the API package
COPY apps/api/package.json apps/api/package.json
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/api/drizzle.config.ts apps/api/drizzle.config.ts
COPY apps/api/src apps/api/src

# Create stub package.jsons for other workspaces so npm doesn't error
RUN mkdir -p packages/editor apps/web && \
    echo '{"name":"@dardocs/editor","version":"0.0.0","private":true}' > packages/editor/package.json && \
    echo '{"name":"@dardocs/web","version":"0.0.0","private":true}' > apps/web/package.json

# Install production dependencies
RUN npm install --omit=dev --ignore-scripts 2>/dev/null; \
    npm install --workspace=@dardocs/api --omit=dev 2>/dev/null; \
    npm install tsx --workspace=@dardocs/api; \
    exit 0

EXPOSE 3456

ENV NODE_ENV=production
ENV PORT=3456
ENV CLONE_DIR=/data/repos

# Create default clone directory (mount a volume here for persistence)
RUN mkdir -p /data/repos

CMD ["node", "--import", "tsx", "apps/api/src/index.ts"]
