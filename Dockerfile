FROM oven/bun:1
WORKDIR /app

ENV SKIP_ENV_VALIDATION=1
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/jg2?schema=public
ENV BETTER_AUTH_SECRET=dummy-secret-for-build
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json bun.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN bun install

COPY . .

RUN bunx prisma generate
RUN bun run build

EXPOSE 3000

CMD ["bun", "run", "deploy"]