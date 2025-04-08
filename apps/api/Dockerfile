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
RUN echo "--- Contents of /app/dist/apps/api after build:cli ---" && ls -lR /app/dist/apps/api || echo "dist/apps/api not found yet"

# Build the main application bundle with specified environment
ARG ENVIRONMENT=production
RUN echo "--- Running nx build api ---" && npx nx build api --configuration=${ENVIRONMENT}
RUN echo "--- Contents of /app/dist/apps/api after nx build ---" && ls -lR /app/dist/apps/api || echo "dist/apps/api not found"


# Stage 2: Run the application
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# *** CORRECTED COPY COMMAND ***
# Copy the *entire* built api output (including cli_build) into the correct subfolder structure
# Source: /app/dist/apps/api from build stage
# Destination: /app/dist/apps/api in final stage
COPY --from=build /app/dist/apps/api ./dist/apps/api

# Add verification step in final stage
RUN echo "--- Contents of /app/dist in final stage ---" && ls -lR /app/dist

EXPOSE 3000
# *** CORRECTED CMD PATH ***
# CMD should point to the webpack bundle entry point within the copied structure
CMD ["node", "dist/apps/api/main.js"]