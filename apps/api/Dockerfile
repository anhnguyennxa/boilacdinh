FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @foodhub/shared build && pnpm --filter @foodhub/api build
RUN pnpm deploy --filter @foodhub/api --prod /out && cp -r apps/api/dist apps/api/prisma /out/

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /out /app
RUN npx prisma generate
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
