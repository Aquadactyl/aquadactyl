#!/usr/bin/env bash

# Complete an extension transaction so callers do not need separate deployment commands.
blueprint_extension_artisan() {
  local command
  printf -v command '%q ' php "$FOLDER/artisan" "$@"
  su "$WEBUSER" -s /bin/bash -c "umask 027; $command"
}

blueprint_extension_permissions() {
  PRINT INFO "Restoring panel and runtime permissions.."
  if [[ $OWNERSHIP == root:* ]]; then
    # Keep the permissions established by the managed Linux installer.
    WEB_USER="$WEBUSER" WEB_GROUP="${OWNERSHIP#*:}" \
      bash -c 'source "$1/scripts/deploy/common.sh"; cd "$PANEL_ROOT"; permissions' bash "$FOLDER" \
      &>> "$BLUEPRINT__DEBUG" || return 1
  else
    # Avoid copying unchanged files into Docker's writable layer just to chown them.
    if [[ $OWNERSHIP == *:* ]]; then
      find "$FOLDER/" -path "$FOLDER/node_modules" -prune \
        -o \( ! -user "${OWNERSHIP%%:*}" -o ! -group "${OWNERSHIP#*:}" \) \
        -exec chown "$OWNERSHIP" {} + &>> "$BLUEPRINT__DEBUG" || return 1
    else
      find "$FOLDER/" -path "$FOLDER/node_modules" -prune \
        -o ! -user "$OWNERSHIP" -exec chown "$OWNERSHIP" {} + \
        &>> "$BLUEPRINT__DEBUG" || return 1
    fi
    find "$FOLDER/storage" "$FOLDER/bootstrap/cache" ! -user "$WEBUSER" -exec chown "$WEBUSER" {} + \
      &>> "$BLUEPRINT__DEBUG" || return 1
    find "$FOLDER/storage" "$FOLDER/bootstrap/cache" -type d ! -perm 0750 -exec chmod 0750 {} + \
      &>> "$BLUEPRINT__DEBUG" || return 1
    find "$FOLDER/storage" "$FOLDER/bootstrap/cache" -type f ! -perm 0640 -exec chmod 0640 {} + \
      &>> "$BLUEPRINT__DEBUG" || return 1
    chmod 0640 "$FOLDER/.env" &>> "$BLUEPRINT__DEBUG" || return 1
  fi
}

blueprint_extension_reload_php() {
  if [[ $DOCKER == y ]]; then
    if [[ -S /tmp/supervisor.sock ]]; then
      PRINT INFO "Reloading PHP.."
      supervisorctl -c /etc/supervisord.conf signal USR2 php-fpm \
        &>> "$BLUEPRINT__DEBUG" || return 1
    fi
  elif command -v systemctl >/dev/null; then
    local service=${PHP_FPM_SERVICE:-php$(php -r 'echo PHP_MAJOR_VERSION . "." . PHP_MINOR_VERSION;')-fpm}
    if systemctl is-active --quiet "$service"; then
      PRINT INFO "Reloading PHP.."
      systemctl reload "$service" &>> "$BLUEPRINT__DEBUG" || return 1
    fi
  fi
}

blueprint_extension_finish() {
  if [[ $YARN == y && $IgnoreRebuild != true ]]; then
    PRINT INFO "Rebuilding panel assets with pnpm.."
    hide_progress
    pnpm run build || {
      PRINT FATAL "The frontend build failed. Fix the reported error before continuing."
      return 1
    }
  fi

  # Addon migrations must run in Docker as well as on a Linux host.
  if [[ $dbmigrations == true ]]; then
    PRINT INFO "Running extension database migrations.."
    php artisan migrate --force || return 1
  fi

  PRINT INFO "Linking filesystems.."
  php artisan storage:link &>> "$BLUEPRINT__DEBUG" || return 1

  if [[ ${DeveloperWatch:-false} == false ]]; then
    blueprint_extension_permissions || {
      PRINT FATAL "Could not restore panel permissions. See 'blueprint -debug' for details."
      return 1
    }

    PRINT INFO "Refreshing application caches and queue workers.."
    if [[ $KeepApplicationCache != true ]]; then
      blueprint_extension_artisan cache:clear &>> "$BLUEPRINT__DEBUG" || {
        PRINT FATAL "Could not clear application caches. See 'blueprint -debug' for details."
        return 1
      }
    fi
    local command
    for command in bp:cache config:cache route:cache view:cache queue:restart; do
      blueprint_extension_artisan "$command" &>> "$BLUEPRINT__DEBUG" || {
        PRINT FATAL "Could not run '$command'. See 'blueprint -debug' for details."
        return 1
      }
    done

    blueprint_extension_reload_php || {
      PRINT FATAL "Could not reload PHP. See 'blueprint -debug' for details."
      return 1
    }
  fi
}
