FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/package.json
COPY client/package.json client/package.json
RUN npm ci --workspace=hookline-shared --workspace=hookline-client --include-workspace-root

COPY shared/src shared/src
COPY shared/tsconfig.json shared/tsconfig.json
COPY client client
# Same-origin relative path — nginx below proxies it to the server
# container, so the browser never needs to know the backend's real address.
ENV VITE_SERVER_URL=/ws
RUN npm run build -w client

FROM nginx:1.27-alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
