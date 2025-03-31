#apps/api/Dockerfile

# Stage 1: Build the NestJS application
FROM node:18 AS build
WORKDIR /app

# Copy package.json and related files
COPY package.json package-lock.json nx.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the code
COPY . .

# Build with specified environment
ARG ENVIRONMENT=production
RUN npx nx build api --configuration=${ENVIRONMENT}

# Stage 2: Run the application
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the built application from the build stage
COPY --from=build /app/dist/apps/api ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]