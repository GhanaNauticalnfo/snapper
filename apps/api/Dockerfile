#apps/api/Dockerfile

# Stage 1: Build the NestJS application AND CLI files
FROM node:18 AS build
WORKDIR /app

# Copy package.json and related files first for layer caching
COPY package.json package-lock.json nx.json ./
COPY tsconfig*.json ./

# Install ALL dependencies (including dev needed for tsc)
RUN npm ci

# Copy the rest of the code
COPY . .

# Build the CLI files using tsc
RUN echo "--- Running build:cli ---" && npm run build:cli
RUN echo "--- Verifying cli_build contents ---"
# Check if the specific datasource file exists after tsc build
RUN if [ -f /app/dist/apps/api/cli_build/datasource.js ]; then echo "cli_build/datasource.js FOUND after tsc"; else echo "cli_build/datasource.js NOT FOUND after tsc"; fi
# List the contents of the cli_build directory
RUN ls -lR /app/dist/apps/api/cli_build || echo "cli_build directory not found"


# Build the main application bundle with specified environment
ARG ENVIRONMENT=production
# Ensure webpack doesn't clean (check webpack.config.js for output.clean=false)
RUN echo "--- Running nx build api (Webpack) ---"
RUN npx nx build api --configuration=${ENVIRONMENT}
RUN echo "--- Contents of /app/dist/apps/api after nx build (should include cli_build) ---"
RUN ls -lR /app/dist/apps/api || echo "/app/dist/apps/api not found after webpack"


# Stage 2: Run the application
FROM node:18-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# *** MORE EXPLICIT COPY STRATEGY ***
# Ensure the target directory exists
RUN mkdir -p /app/dist/apps/api
# Copy specific essential items from the build stage to the final stage

# 1. Copy the Webpack bundle (main.js, assets, etc.)
COPY --from=build /app/dist/apps/api/main.js* ./dist/apps/api/
COPY --from=build /app/dist/apps/api/assets ./dist/apps/api/assets/
# Copy generated package.json if present (adjust path if needed)
COPY --from=build /app/dist/apps/api/package.json ./dist/apps/api/
COPY --from=build /app/dist/apps/api/package-lock.json ./dist/apps/api/ # Usually not needed but safe

# 2. Copy the ENTIRE cli_build directory explicitly
COPY --from=build /app/dist/apps/api/cli_build ./dist/apps/api/cli_build

# Add verification step in final stage
RUN echo "--- Contents of /app/dist in final stage ---" && ls -lR /app/dist
RUN echo "--- Specifically checking for /app/dist/apps/api/cli_build/datasource.js ---"
RUN if [ -f /app/dist/apps/api/cli_build/datasource.js ]; then echo "FINAL CHECK: datasource.js FOUND"; else echo "FINAL CHECK: datasource.js NOT FOUND"; fi


EXPOSE 3000
# CMD should point to the webpack bundle entry point within the copied structure
CMD ["node", "dist/apps/api/main.js"]