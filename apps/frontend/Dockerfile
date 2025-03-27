# Stage 1: Build the Angular application
FROM node:18 as build
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
RUN if [ "$ENVIRONMENT" = "test" ]; then \
      npx nx build frontend; \
    else \
      npx nx build frontend --configuration=${ENVIRONMENT}; \
    fi

# Stage 2: Serve the app with Nginx
FROM nginx:alpine
# Copy the Angular app to the correct location
COPY --from=build /app/dist/apps/frontend /usr/share/nginx/html/
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]