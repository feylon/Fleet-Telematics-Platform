FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json nest-cli.json jest.config.ts ./
COPY apps ./apps
COPY libs ./libs
COPY proto ./proto
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache python3 make g++ && addgroup -S fleet && adduser -S fleet -G fleet
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && apk del python3 make g++ && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY proto ./proto
COPY assets ./assets
COPY scripts ./scripts
RUN mkdir -p /data/reports && chown -R fleet:fleet /app /data
USER fleet
CMD ["node", "dist/apps/gateway/main.js"]
