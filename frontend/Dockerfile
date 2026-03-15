# Frontend Dockerfile for SmartAttend
# Multi-stage build: Node.js builds the React app, Nginx serves it
# Nginx also proxies API and student photo requests

FROM node:20-alpine AS build

WORKDIR /app
# Install dependencies first for better Docker layer caching
COPY package*.json ./
RUN npm ci
# Copy source and build the production bundle
COPY . .
RUN npm run build

# Production stage - serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
