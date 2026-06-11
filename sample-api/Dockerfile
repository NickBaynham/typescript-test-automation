FROM node:24-alpine
WORKDIR /app
RUN npm install -g pnpm@11.1.3
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY server.mjs .
USER node
EXPOSE 8100
CMD ["node", "server.mjs"]
