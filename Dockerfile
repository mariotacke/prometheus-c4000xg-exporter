FROM node:16-alpine

WORKDIR /app
COPY package*.json .npmrc ./

RUN --mount=type=secret,id=npmrc,dst=/app/.npmrc \
  npm ci --only=production

COPY . .

EXPOSE 9998

CMD ["node", "src/index.js"]