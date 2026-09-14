#!/usr/bin/env bash
# live.sh
# Deploy helper — rsync the matching repo to the server and restart the app.
#
#   live staging  -> PLE app (staging.handihomepage.com)
#   live senior   -> PLE app (senior.handihomepage.com)
#   live handi    -> WordPress theme + site-pack plugin (handihomepage.com)
#   live dazsolar -> WordPress site (dazsolar.com)
#
# Source this and call the function:
#     source scripts/live.sh && live staging
set -euo pipefail

live() {
  local site="$1"
  local src path

  if [ "$site" = "dazsolar" ]; then
    src="/home/daz/git/dazsolar/"
    path="domains/dazsolar.com/public_html/"
    rsync -avz -e 'ssh -p 65002' \
      --exclude='.git' \
      --exclude='.gitignore' \
      --exclude='wp-config.php' \
      --exclude='.htaccess' \
      "$src" \
      "u247564401@82.29.191.118:${path}"
  elif [ "$site" = "handi" ]; then
      src="/home/daz/git/handi/wp-content/themes/handipage/"
      path="domains/handihomepage.com/public_html/wp-content/themes/handipage/"
      rsync -avz -e 'ssh -p 65002' \
      --exclude='.git' \
      --exclude='.gitignore' \
      --exclude='assets/' \
      --exclude='images/' \
      --exclude='index1.html' \
      "$src" \
      "u247564401@82.29.191.118:${path}"

    # Site Pack plugin
    rsync -avz -e 'ssh -p 65002' \
      --exclude='.git' \
      --exclude='builds/' \
      "/home/daz/git/handi/wp-content/plugins/handi-site-pack/" \
      "u247564401@82.29.191.118:domains/handihomepage.com/public_html/wp-content/plugins/handi-site-pack/"

  else
    src="/home/daz/git/ple/"
    if [ "$site" = "senior" ]; then
    path="domains/senior.handihomepage.com/hbuilds/current/nodejs/"
  else
    path="domains/${site}.handihomepage.com/hbuilds/current/nodejs/"
  fi

    rsync -avz -e 'ssh -p 65002' \
      --exclude='node_modules' \
      --exclude='.git' \
      --exclude='.env' \
      --exclude='package-lock.json' \
      --exclude='log.txt' \
      --exclude='.gtfs-cache' \
      --exclude='data' \
      "$src" \
      "u247564401@82.29.191.118:${path}"
    ssh -p 65002 u247564401@82.29.191.118 "pkill -f 'lsnode:.*${site}' 2>/dev/null; sleep 3; echo Restarted
"
  fi
}
