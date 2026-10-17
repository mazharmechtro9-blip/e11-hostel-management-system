FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
    npm ci
FROM dependencies AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup -S e11 && adduser -S e11 -G e11
COPY --from=build --chown=e11:e11 /app/.next/standalone ./
COPY --from=build --chown=e11:e11 /app/.next/static ./.next/static
COPY --from=build --chown=e11:e11 /app/public ./public
USER e11
EXPOSE 3000
CMD ["node","server.js"]
