FROM oven/bun:1

WORKDIR /app

ARG BUILD_ID=local
ENV BUILD_ID=${BUILD_ID}
ENV HOST=0.0.0.0
ENV PORT=3000

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production

COPY . .

RUN mkdir -p /app/database
VOLUME ["/app/database"]

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
