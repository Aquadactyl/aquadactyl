# Stage 0:
# Build frontend assets and retain the dependency tree used by Blueprint for
# extension installs and rebuilds at runtime.
FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend
WORKDIR /app
COPY . ./
RUN npm install --global pnpm@12.10.1 \
    && pnpm install --frozen-lockfile \
    && pnpm run build:production

# Stage 1:
# Build the Aquadactyl runtime image.
FROM --platform=$TARGETOS/$TARGETARCH php:8.5-fpm-alpine
WORKDIR /app

COPY . ./
COPY --from=frontend /app/public/assets ./public/assets
COPY --from=frontend /app/node_modules ./node_modules

RUN apk add --no-cache --update \
        bash \
        ca-certificates \
        certbot \
        certbot-nginx \
        curl \
        dcron \
        git \
        libpng-dev \
        libxml2-dev \
        libzip-dev \
        mysql-client \
        nginx \
        nodejs \
        npm \
        oniguruma-dev \
        supervisor \
        tar \
        unzip \
    && npm install --global pnpm@12.10.1 \
    && docker-php-ext-configure zip \
    && docker-php-ext-install bcmath gd mbstring pdo_mysql posix zip \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
    && cp .env.example .env \
    && mkdir -p bootstrap/cache storage/logs storage/framework/sessions storage/framework/views storage/framework/cache \
    && chmod 777 -R bootstrap storage \
    && composer install --no-dev --optimize-autoloader \
    && rm -rf .env bootstrap/cache/*.php \
    && mkdir -p /app/storage/logs \
    && chown -R nginx:nginx .

RUN rm /usr/local/etc/php-fpm.conf \
    && echo "* * * * * /usr/local/bin/php /app/artisan schedule:run >> /dev/null 2>&1" >> /var/spool/cron/crontabs/root \
    && echo "0 23 * * * certbot renew --nginx --quiet" >> /var/spool/cron/crontabs/root \
    && sed -i s/ssl_session_cache/#ssl_session_cache/g /etc/nginx/nginx.conf \
    && mkdir -p /var/run/php /var/run/nginx

COPY .github/docker/default.conf /etc/nginx/http.d/default.conf
COPY .github/docker/www.conf /usr/local/etc/php-fpm.conf
COPY .github/docker/supervisord.conf /etc/supervisord.conf

EXPOSE 80 443
ENTRYPOINT ["/bin/ash", ".github/docker/entrypoint.sh"]
CMD ["supervisord", "-n", "-c", "/etc/supervisord.conf"]
