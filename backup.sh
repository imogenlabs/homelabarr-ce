#!/usr/bin/with-contenv bash
# shellcheck shell=bash
# shellcheck disable=SC2086
# shellcheck disable=SC2006

$(command -v docker) system prune -af 1>/dev/null 2>&1
$(command -v docker) pull ghcr.io/smashingtags/homelabarr-backup:latest 1>/dev/null 2>&1
dock=$(docker ps -a --format '{{.Names}}' | grep -v 'trae' | grep -v 'auth' | grep -v 'cf')
for i in ${dock}; do
    $(command -v docker) run --rm -v /opt/appdata:/backup/$i -v /mnt:/mnt ghcr.io/smashingtags/homelabarr-backup:latest backup $i local
    $(command -v chown) -cR 1000:1000 /mnt/downloads/appbackups/local/$i.tar.gz 1>/dev/null 2>&1
done
$(command -v docker) system prune -af 1>/dev/null 2>&1
exit
#EOF
