FROM node:18-alpine

WORKDIR /app

RUN npm i -g pnpm

COPY ./package*.json ./pnpm-lock.yaml ./

RUN pnpm install --prod

COPY . .

EXPOSE ${PORT}
CMD [ "node", "app.js"]