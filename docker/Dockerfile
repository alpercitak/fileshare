FROM oven/bun:1.3.8-alpine AS base

WORKDIR /app
COPY package.json bun.lock turbo.json ./
COPY apps/client/package.json ./apps/client/package.json
COPY apps/server/package.json ./apps/server/package.json
RUN bun install --frozen-lockfile

FROM base AS build-server

WORKDIR /app/apps/server
COPY apps/server ./
RUN bun run build

FROM base AS build-client

WORKDIR /app
COPY apps/client ./apps/client
RUN bun run --cwd apps/client build

FROM oven/bun:1.3.8-alpine AS deploy-server

WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=build-server /app/apps/server ./apps/server
EXPOSE 4001

CMD ["bun", "apps/server/dist/index.js"]

FROM nginx:1.29.4-alpine-slim AS deploy-client

COPY ./apps/client/nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build-client /app/apps/client/dist .
EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]
