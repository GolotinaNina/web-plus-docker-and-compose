FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build \
    && rm -rf ./src \
    && rm -rf ./.eslintrc.js \
    && rm -rf ./node_modules \
    && rm -rf ./.prettierrc \
    && rm -rf ./README.md

FROM node:16-alpine AS backend
WORKDIR /app
COPY package*.json .
RUN npm ci --omit=dev --no-audit --no-fund \ 
    && npm install pm2 -g
COPY --from=builder /app/dist ./dist
COPY ./ecosystem.config.js .
EXPOSE 3000
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
