#!/bin/bash

Command() {
  PRINT FATAL "This panel bundles a reviewed Blueprint release. Use bash scripts/panel-update.sh with a release of this fork."
  PRINT INFO "Direct framework upgrades overwrite this panel's dependency and security changes."
  exit 1
}
