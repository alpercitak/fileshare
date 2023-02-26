FROM node:18-alpine AS base

RUN npm i -g pnpm
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN pnpm fetch

FROM base AS build-server

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server ./server

RUN rm -rf ./node_modules
RUN rm -rf ./server/node_modules
RUN pnpm install -r --offline --prod --filter=./server 

FROM node:18-alpine AS deploy-server

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build-server /app/node_modules/ ./node_modules
COPY --from=build-server /app/server/node_modules ./server/node_modules
COPY --from=build-server /app/server ./server

CMD ["node", "server/app.js"]

FROM base AS build-client

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client ./client

RUN pnpm i --offline
RUN pnpm run --filter=./client build

FROM nginx:1.23.3-alpine-slim AS deploy-client

COPY ./client/nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=build-client /app/client/dist .
ENTRYPOINT [ "nginx", "-g", "daemon off;" ]
