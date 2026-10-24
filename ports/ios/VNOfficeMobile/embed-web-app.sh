#!/bin/sh
set -eu

repo_root="${SRCROOT}/../../.."
web_root="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/WebApp"
mkdir -p "$web_root"
for item in index.html apps adapters platform branding; do
  ditto "$repo_root/$item" "$web_root/$item"
done
ditto "${SRCROOT}/MobileWebApp.css" "$web_root/MobileWebApp.css"
