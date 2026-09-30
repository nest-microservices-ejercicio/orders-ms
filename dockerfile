FROM node:22-alpine

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN npm install -g pnpm

RUN pnpm install 

COPY . .


CMD ["pnpm", "start:dev"]