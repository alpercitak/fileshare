FROM node:18-alpine AS base

RUN npm i -g pnpm

FROM base AS socket-deploy

WORKDIR /app
COPY ./socket/package*.json ./socket/pnpm-lock.yaml ./
RUN pnpm install --prod
COPY ./socket .

EXPOSE 4001
CMD [ "node", "app.js"]

FROM base AS web-deploy

WORKDIR /app
COPY ./web/package*.json ./web/pnpm-lock.yaml ./
RUN pnpm install --prod
COPY ./web .

EXPOSE 4002
CMD [ "node", "app.js"]

