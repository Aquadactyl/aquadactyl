#!/bin/ash -e
cd /app

mkdir -p /var/log/panel /var/log/supervisord /var/log/nginx /var/log/php7
chmod 777 /var/log/panel
ln -sfn /app/storage/logs /var/log/panel/logs

# Check for a persisted .env file and generate application secrets if missing.
if [ -f /app/var/.env ]; then
  echo "External vars exist."
  rm -rf /app/.env
  ln -s /app/var/.env /app/.env
else
  echo "External vars don't exist."
  rm -rf /app/.env
  mkdir -p /app/var
  touch /app/var/.env

  if [ -z "${APP_KEY:-}" ]; then
    echo "Generating application key."
    APP_KEY=$(php -r 'echo "base64:" . base64_encode(random_bytes(32));')
    printf 'APP_KEY=%s\n' "$APP_KEY" > /app/var/.env
  else
    echo "APP_KEY exists in environment, using that."
    printf 'APP_KEY=%s\n' "$APP_KEY" > /app/var/.env
  fi

  if [ -z "${HASHIDS_SALT:-}" ]; then
    echo "Generating Hashids salt."
    HASHIDS_SALT=$(php -r 'echo bin2hex(random_bytes(16));')
    printf 'HASHIDS_SALT=%s\n' "$HASHIDS_SALT" >> /app/var/.env
  else
    echo "HASHIDS_SALT exists in environment, using that."
    printf 'HASHIDS_SALT=%s\n' "$HASHIDS_SALT" >> /app/var/.env
  fi

  ln -s /app/var/.env /app/.env
fi

echo "Checking if HTTPS is required."
if [ -f /etc/nginx/http.d/panel.conf ]; then
  echo "Using nginx config already in place."
  if [ -n "${LE_EMAIL:-}" ]; then
    echo "Checking for certificate update."
    certbot certonly -d "$(echo "$APP_URL" | sed 's~http[s]*://~~g')" --standalone -m "$LE_EMAIL" --agree-tos -n
  else
    echo "No Let's Encrypt email is set."
  fi
else
  if [ -z "${LE_EMAIL:-}" ]; then
    echo "No Let's Encrypt email is set; using HTTP config."
    cp .github/docker/default.conf /etc/nginx/http.d/panel.conf
  else
    echo "Writing SSL config."
    cp .github/docker/default_ssl.conf /etc/nginx/http.d/panel.conf
    sed -i "s|<domain>|$(echo "$APP_URL" | sed 's~http[s]*://~~g')|g" /etc/nginx/http.d/panel.conf
    echo "Generating certificates."
    certbot certonly -d "$(echo "$APP_URL" | sed 's~http[s]*://~~g')" --standalone -m "$LE_EMAIL" --agree-tos -n
  fi

  rm -f /etc/nginx/http.d/default.conf
fi

DB_PORT=${DB_PORT:-3306}

echo "Checking log folder permissions."
if [ "$(stat -c %U:%G /app/storage/logs)" != "nginx:nginx" ]; then
  echo "Fixing log folder permissions."
  chown -R nginx:nginx /app/storage/logs
fi

echo "Checking database status."
until nc -z -w30 "$DB_HOST" "$DB_PORT"; do
  echo "Waiting for database connection..."
  sleep 1
done

echo "Running database migrations and Aquadactyl seeders."
php artisan migrate --force
php artisan db:seed --class=DatabaseSeeder --force

echo "Seeding Blueprint settings."
php artisan db:seed --class=BlueprintSeeder --force

BLUEPRINT_MARKER="/app/.blueprint/extensions/blueprint/private/db/is_installed"
if [ ! -f "$BLUEPRINT_MARKER" ]; then
  echo "Initialising bundled Blueprint framework."

  cat > /app/.blueprintrc <<'EOF'
OWNERSHIP="nginx:nginx"
WEBUSER="nginx"
USERSHELL="/bin/ash"
SHORTCUT_DIR="/usr/local/bin"
EOF

  BLUEPRINT_ENVIRONMENT=ci bash /app/blueprint.sh
else
  echo "Blueprint is already initialised."
fi

# CI-mode Blueprint installation intentionally skips the application cache steps.
# Refresh those here so the container is ready before nginx and the queue start.
php artisan bp:cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Starting cron jobs."
crond -L /var/log/crond -l 5

echo "Starting supervisord."
exec "$@"
