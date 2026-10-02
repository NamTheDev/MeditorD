FROM oven/bun:1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y git \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3000

RUN mkdir -p /app/database
VOLUME ["/app/database"]

EXPOSE 3000

CMD ["sh", "-c", "git pull && bun install --frozen-lockfile && exec bun run index.ts"]