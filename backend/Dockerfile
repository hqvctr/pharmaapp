FROM node:22.22.2-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22.22.2-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY migrations ./migrations
COPY config ./config
# Pasta de dados do coletor (lista da CMED, estado do último ciclo); fica num volume.
RUN mkdir -p /app/data && chown node:node /app/data
ENV DADOS=/app/data
USER node
CMD ["node", "dist/api/server.js"]
