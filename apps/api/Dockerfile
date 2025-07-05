#apps/api/Dockerfile

# Stage 1: Build
FROM node:22 AS build
WORKDIR /app

COPY package.json package-lock.json nx.json ./
COPY tsconfig*.json ./
RUN npm ci
COPY . .

# Build CLI files to /tmp/cli_build/apps/api
RUN echo "--- Running build:cli (outputting to /tmp) ---" && npm run build:cli
RUN echo "--- Verifying /tmp/cli_build contents ---"
RUN ls -lR /tmp/cli_build || echo "/tmp/cli_build not found"
RUN if [ -f /tmp/cli_build/apps/api/datasource.js ]; then echo "/tmp cli_build/datasource.js FOUND"; else echo "/tmp cli_build/datasource.js NOT FOUND"; fi

# Build main app to /app/dist/apps/api (this might clean dist/apps/api, but that's ok now)
ARG ENVIRONMENT=prod
RUN echo "--- Running nx build api (Webpack to dist) ---"
RUN npx nx build api --configuration=${ENVIRONMENT}
RUN echo "--- Contents of /app/dist/apps/api after nx build ---"
RUN ls -lR /app/dist/apps/api || echo "/app/dist/apps/api not found"

# Stage 2: Run
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Ensure target directory exists in final stage
RUN mkdir -p /app/dist/apps/api

# Copy Webpack bundle from Stage 1's /app/dist/apps/api
COPY --from=build /app/dist/apps/api/main.js* ./dist/apps/api/
COPY --from=build /app/dist/apps/api/assets ./dist/apps/api/assets/
COPY --from=build /app/dist/apps/api/package.json ./dist/apps/api/
COPY --from=build /app/dist/apps/api/package-lock.json ./dist/apps/api/

# *** UPDATED COPY for CLI build ***
# Copy CLI build from Stage 1's /tmp into the final dist location
# Source: /tmp/cli_build/apps/api (where tsc put it)
# Destination: /app/dist/apps/api/cli_build (where typeorm:js script expects it)
COPY --from=build /tmp/cli_build/apps/api ./dist/apps/api/cli_build

# Verification in final stage
RUN echo "--- Contents of /app/dist in final stage ---" && ls -lR /app/dist
RUN echo "--- Specifically checking for /app/dist/apps/api/cli_build/datasource.js ---"
RUN if [ -f /app/dist/apps/api/cli_build/datasource.js ]; then echo "FINAL CHECK: datasource.js FOUND"; else echo "FINAL CHECK: datasource.js NOT FOUND"; fi

EXPOSE 3000
CMD ["node", "dist/apps/api/main.js"]