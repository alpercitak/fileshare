FROM oven/bun:1.3.8-alpine AS base

WORKDIR /app
COPY package.json bun.lock turbo.json ./
COPY apps/client/package.json ./apps/client/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile

FROM base AS build-server

WORKDIR /app
COPY packages/shared ./packages/shared
RUN bun run --cwd packages/shared build
COPY apps/server ./apps/server
RUN bun run --cwd apps/server build

FROM base AS build-client

WORKDIR /app
COPY packages/shared ./packages/shared
RUN bun run --cwd packages/shared build
COPY apps/client ./apps/client
RUN bun run --cwd apps/client build

FROM oven/bun:1.3.8-alpine AS deploy-server

ARG PORT=4001
ENV PORT=${PORT}

WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules ./node_modules
COPY --from=build-server /app/apps/server ./apps/server
COPY --from=build-server /app/packages/shared ./packages/shared

EXPOSE ${PORT}

CMD ["bun", "apps/server/dist/index.js"]

FROM nginx:1.29.4-alpine-slim AS deploy-client

COPY ./docker/nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build-client /app/apps/client/dist .
EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]
