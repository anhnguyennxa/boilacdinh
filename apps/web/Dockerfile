FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
# API_URL được "đóng" vào rewrites lúc build → truyền đúng địa chỉ API nội bộ khi build image
ARG API_URL=http://api:4000
ARG NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
ENV API_URL=$API_URL NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL NEXT_STANDALONE=1
RUN pnpm --filter @foodhub/shared build && pnpm --filter @foodhub/web build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
ENV PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
