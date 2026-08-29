# HomelabARR CE Frontend
# Multi-stage build: Node for building, nginx for serving

FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS build
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --loglevel=error --no-fund
COPY . .
RUN npm run build

FROM nginx:1.31.4-alpine@sha256:db35bfc6b2951e7f8a72db5db120288c127ffaeeb4a6d4b95a26fead017d5913
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
