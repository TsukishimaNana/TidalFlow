FROM node:18-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json ./shared/package.json
COPY shared/tsconfig.json ./shared/tsconfig.json
COPY shared/src ./shared/src
COPY server/package.json ./server/package.json
COPY server/tsconfig.json ./server/tsconfig.json
COPY server/src ./server/src

RUN corepack enable \
  && pnpm install --frozen-lockfile --filter server... \
  && pnpm --filter shared build \
  && pnpm --filter server build

FROM node:18-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl libstdc++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY shared/package.json ./shared/package.json
COPY server/package.json ./server/package.json

RUN apk add --no-cache --virtual .build-deps python3 make g++ \
  && corepack enable \
  && pnpm install --frozen-lockfile --prod --filter server... \
  && apk del .build-deps

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist

WORKDIR /app/data

EXPOSE 3000

CMD ["node", "../server/dist/index.js"]
