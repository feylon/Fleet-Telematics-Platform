FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend ./
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
RUN addgroup -S fleet && adduser -S fleet -G fleet
COPY --from=build /app/.output ./.output
USER fleet
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
