# ===== Build stage =====
FROM node:20-alpine AS builder

WORKDIR /app

# necessário pra compilar better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

# ===== Production stage =====
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/yarn.lock ./

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3001

CMD ["node", "dist/main"]