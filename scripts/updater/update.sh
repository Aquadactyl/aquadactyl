#!/bin/bash

UpdaterInstall() {
  # Copy release files to Aquadactyl directory
  PRINT INFO "Copying release files to Aquadactyl directory.."
  cp -r .update/repo/* .
  cp .update/repo/.oxlintrc.json .
  cp .update/repo/.oxfmtrc.json .
  cp .update/repo/.shellcheckrc .

  # Check if nodejs version is sufficient
  nodeMajor=$(node -v | awk -F. '{print $1}' | sed 's/[^0-9]*//g')
  if [[ $nodeMajor -lt 22 ]]; then
    PRINT FATAL "Grace period for Node.js <22 is over. Please upgrade it to a new version then rerun the upgrade command."
  fi
}
