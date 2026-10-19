# syntax=docker/dockerfile:1

# Stage 0:
# Build frontend assets and retain the dependency tree used by Blueprint for
# extension installs and rebuilds at runtime.
FROM --platform=$BUILDPLATFORM node:24-alpine AS frontend
WORKDIR /app
RUN --mount=type=cache,id=aquadactyl-npm,target=/root/.npm \
    npm install --global pnpm@12.10.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY patches ./patches
RUN --mount=type=cache,id=aquadactyl-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store
# Backend and documentation edits do not invalidate the frontend build.
COPY vite.config.ts tsconfig.json ./
COPY resources ./resources
COPY public ./public
# Blueprint links addon components, styles and views into resources/.
COPY .blueprint/extensions ./.blueprint/extensions
RUN pnpm run build

# Stage 1:
# Build the Aquadactyl runtime image.
FROM --platform=$TARGETOS/$TARGETARCH php:8.5-fpm-alpine
WORKDIR /app
ENV TERM=xterm

RUN --mount=type=cache,id=aquadactyl-npm,target=/root/.npm \
    apk add --no-cache --update \
        bash \
        ca-certificates \
        certbot \
        certbot-nginx \
        coreutils \
        curl \
        dcron \
        git \
        libjpeg-turbo-dev \
        libpng-dev \
        libwebp-dev \
        libxml2-dev \
        libzip-dev \
        musl-locales \
        musl-locales-lang \
        mysql-client \
        ncurses \
        nginx \
        nodejs \
        npm \
        oniguruma-dev \
        php85-intl \
        php85-pecl-redis \
        supervisor \
        tar \
        unzip \
        zip \
    && npm install --global pnpm@12.10.1 \
    && cp /usr/lib/php85/modules/igbinary.so \
          /usr/lib/php85/modules/msgpack.so \
          /usr/lib/php85/modules/redis.so \
          /usr/lib/php85/modules/intl.so \
          $(php-config --extension-dir)/ \
    && docker-php-ext-enable igbinary msgpack redis intl \
    && docker-php-ext-configure zip \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) bcmath gd pdo_mysql zip \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

COPY composer.json composer.lock ./
RUN --mount=type=cache,id=aquadactyl-composer,target=/tmp/composer-cache \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install --no-dev --no-interaction --no-scripts --no-autoloader --prefer-dist --no-progress

COPY --chown=nginx:nginx . ./
COPY --from=frontend --chown=nginx:nginx /app/public/assets ./public/assets
COPY --from=frontend --chown=nginx:nginx /app/public/build ./public/build
COPY --from=frontend --chown=nginx:nginx /app/node_modules ./node_modules
COPY --from=frontend --chown=nginx:nginx /app/packages ./packages

# A stable identity for this image build, unaffected by addon rebuilds at runtime.
RUN find app routes config resources public/themes/pterodactyl -type f -exec sha256sum '{}' \; \
    | LC_ALL=C sort | sha256sum | cut -d ' ' -f 1 > .aquadactyl-build

RUN cp .env.example .env \
    && mkdir -p bootstrap/cache storage/logs storage/framework/sessions storage/framework/views storage/framework/cache \
    && chmod 777 -R bootstrap storage \
    && export CACHE_STORE=array CACHE_DRIVER=array SESSION_DRIVER=array QUEUE_CONNECTION=sync \
    && composer dump-autoload --no-dev --no-interaction --optimize \
    && composer run-script --no-dev --no-interaction post-install-cmd \
    && rm -rf .env bootstrap/cache/*.php \
    && chown nginx:nginx /app \
    && chown -R nginx:nginx vendor bootstrap/cache storage

RUN rm /usr/local/etc/php-fpm.conf \
    && cp scripts/helpers/blueprint /usr/local/bin/blueprint \
    && sed -i 's|BLUEPRINT_FOLDER_HERE|/app|g' /usr/local/bin/blueprint \
    && chmod 755 /usr/local/bin/blueprint \
    && echo "* * * * * /usr/local/bin/php /app/artisan schedule:run >> /dev/null 2>&1" >> /var/spool/cron/crontabs/root \
    && echo "0 23 * * * certbot renew --nginx --quiet" >> /var/spool/cron/crontabs/root \
    && sed -i s/ssl_session_cache/#ssl_session_cache/g /etc/nginx/nginx.conf \
    && mkdir -p /var/run/php /var/run/nginx

COPY .github/docker/default.conf /etc/nginx/http.d/default.conf
COPY .github/docker/www.conf /usr/local/etc/php-fpm.conf
COPY .github/docker/supervisord.conf /etc/supervisord.conf
COPY deploy/php/99-panel.ini /usr/local/etc/php/conf.d/99-panel.ini

EXPOSE 80 443
ENTRYPOINT ["/bin/ash", ".github/docker/entrypoint.sh"]
CMD ["supervisord", "-n", "-c", "/etc/supervisord.conf"]
