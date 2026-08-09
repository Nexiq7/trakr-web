# Stage 1: Build
FROM node:20-alpine AS build

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .

# The API URL is inlined into the bundle at build time, so an empty value would
# produce an image that silently calls the wrong origin. Fail here instead.
RUN test -n "$VITE_API_URL" || (echo "ERROR: VITE_API_URL build arg is required" && exit 1)
RUN npm run build

# Stage 2: Serve
FROM nginx:stable-alpine

# Replaces the default config, which 404s on client-side routes.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
