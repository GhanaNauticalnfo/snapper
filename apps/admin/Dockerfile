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

# Build arguments
ARG ENVIRONMENT=prod
ARG BUILD_TAG=development

# Inject BUILD_TAG into environment file
ENV BUILD_TAG=${BUILD_TAG}
RUN node apps/admin/scripts/inject-build-tag.js ${ENVIRONMENT}

# Build with specified environment
RUN npx nx build admin --configuration=${ENVIRONMENT}

# Stage 2: Serve the app with Nginx
FROM nginx:alpine
# Remove default nginx static resources
RUN rm -rf /usr/share/nginx/html/*
# Copy the Angular app to the correct location - update path to include /browser
COPY --from=build /app/dist/apps/admin/browser/ /usr/share/nginx/html/
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]