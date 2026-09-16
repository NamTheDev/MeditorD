FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3000

RUN mkdir -p /app/database
VOLUME ["/app/database"]

EXPOSE 3000

CMD ["bun", "run", "index.ts"]
