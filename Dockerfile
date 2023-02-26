FROM node:18-alpine AS base

RUN npm i -g pnpm
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN pnpm fetch

FROM base AS build-socket

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY socket ./socket

RUN rm -rf ./node_modules
RUN rm -rf ./socket/node_modules
RUN pnpm install -r --offline --prod --filter=./socket 

FROM node:18-alpine AS deploy-socket

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build-socket /app/node_modules/ ./node_modules
COPY --from=build-socket /app/socket/node_modules ./socket/node_modules
COPY --from=build-socket /app/socket ./socket

CMD ["node", "socket/app.js"]

FROM base AS build-client

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client ./client

RUN pnpm i --offline
RUN pnpm run --filter=./client build

FROM nginx:1.23.3-alpine-slim AS deploy-client

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build-client /app/client/dist .
ENTRYPOINT [ "nginx", "-g", "daemon off;" ]

