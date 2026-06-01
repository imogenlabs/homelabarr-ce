# HomelabARR CE Frontend
# Multi-stage build: Node for building, nginx for serving

FROM node:24-alpine@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14 AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --loglevel=error --no-fund
COPY . .
RUN npm run build

FROM nginx:1.31-alpine@sha256:7e8ff0a32da368869608f285124b4375b901401d88f5027865d8f88984d35d38
RUN apk add --no-cache gettext dumb-init
RUN apk upgrade --no-cache && \
    addgroup -g 1001 homelabarr && \
    adduser -u 1001 -G homelabarr -s /bin/sh -D homelabarr && \
    chown -R homelabarr:homelabarr /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown homelabarr:homelabarr /var/run/nginx.pid

COPY --from=build /app/dist /usr/share/nginx/html
COPY --chown=homelabarr:homelabarr public/icons /usr/share/nginx/html/icons
COPY --chown=homelabarr:homelabarr public/mascot.webp /usr/share/nginx/html/mascot.webp
COPY --chown=homelabarr:homelabarr public/mascot-2x.webp /usr/share/nginx/html/mascot-2x.webp
COPY --chown=homelabarr:homelabarr nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY --chown=homelabarr:homelabarr docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

LABEL org.opencontainers.image.title="homelabarr-ce-frontend"
LABEL org.opencontainers.image.description="React frontend for HomelabARR CE container management"
LABEL org.opencontainers.image.url="https://ce-demo.homelabarr.com"
LABEL org.opencontainers.image.source="https://github.com/imogenlabs/homelabarr-ce"
LABEL org.opencontainers.image.documentation="https://github.com/imogenlabs/homelabarr-ce/blob/main/README.md"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="Imogen Labs"
LABEL io.homelabarr.security.contact="https://github.com/imogenlabs/homelabarr-ce/security/policy"

USER homelabarr

ENTRYPOINT ["dumb-init", "--", "/docker-entrypoint.sh"]
