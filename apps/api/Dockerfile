FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @foodhub/shared build && pnpm --filter @foodhub/api build
# Gói riêng API + dependencies production (kèm @foodhub/shared đã build)
RUN pnpm deploy --legacy --filter @foodhub/api --prod /out && cp -r apps/api/dist apps/api/prisma /out/

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out /app
RUN npx prisma generate
EXPOSE 4000
# Khởi động: áp migration → seed lần đầu (chỉ khi database trống) → chạy API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed/seed.js --if-empty && node dist/main.js"]
