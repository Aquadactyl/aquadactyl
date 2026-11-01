#!/usr/bin/env bash

Command() {
  if [[ -z ${1:-} ]]; then PRINT FATAL 'Usage: blueprint -check <addon>'; exit 2; fi
  lock_wait
  lock_create
  trap 'rm -rf -- "$FOLDER/.blueprint/tmp"; lock_remove' EXIT
  trap 'exit 130' SIGINT
  trap 'exit 143' SIGTERM
  depend
  extract_extension "$1"
  eval "$(parse_yaml .blueprint/tmp/conf.yml conf_)"
  local status=0
  node "$FOLDER/scripts/helpers/check-blueprint.mjs" "$FOLDER/.blueprint/tmp" "${conf_dashboard_components:-}" "${conf_info_identifier:-}" || status=$?
  exit "$status"
}
