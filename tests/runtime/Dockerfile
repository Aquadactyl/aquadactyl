ARG PHP_VERSION=8.5
FROM composer:2 AS composer
FROM node:22-bookworm-slim AS node
FROM php:${PHP_VERSION}-cli-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    git zip unzip rsync shellcheck mariadb-client libonig-dev libzip-dev libpng-dev libsqlite3-dev \
    && docker-php-ext-install mbstring bcmath zip gd pdo_mysql pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && npm install --global pnpm@12.10.1
WORKDIR /app
