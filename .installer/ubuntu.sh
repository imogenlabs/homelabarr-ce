#!/usr/bin/with-contenv bash
# shellcheck shell=bash
#####################################
# Docker owned by imogenlabs        #
# Docker Maintainer smashingtags    #
#####################################
# shellcheck disable=SC2086
# shellcheck disable=SC2006
appstartup() {
while true;do
     # Check if Docker is installed first
     if ! command -v docker &> /dev/null; then
        clear && LOCATION=preinstall && selection
        break
     fi

     # Docker is installed, show main menu
     clear && headinterface
done
}

updatebin() {
file=/opt/homelabarr/.installer/homelabber
store=/bin/homelabarr-cli
store2=/usr/bin/homelabarr-cli
if [[ -f "/bin/homelabarr-cli" ]];then
   $(command -v rm) $store && \
   $(command -v rsync) $file $store -aqhv
   $(command -v rsync) $file $store2 -aqhv
   $(command -v chown) -R 1000:1000 $store $store2
   $(command -v chmod) -R 755 $store $store2
fi
}

selection() {
LOCATION=${LOCATION}
   # Support both traditional /opt/homelabarr and current directory
   if [[ -d "/opt/homelabarr/${LOCATION}" ]]; then
      cd /opt/homelabarr/${LOCATION} && $(command -v bash) install.sh
   elif [[ -d "./${LOCATION}" ]]; then
      cd ./${LOCATION} && $(command -v bash) install.sh
   else
      echo "Error: Could not find ${LOCATION} directory"
      exit 1
   fi
}
headinterface() {

printf "
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    🚀 HomelabARR CLI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    [ 1 ] HomelabARR CLI - Traefik + Authelia
    [ 2 ] HomelabARR CLI - Applications

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    [ EXIT or Z ] - Exit
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
  read -erp "↘️  Type Number and Press [ENTER]: " headsection </dev/tty
  case $headsection in
    1) clear && LOCATION=traefik && selection ;;
    2) clear && LOCATION=apps && selection ;;
    Z|z|exit|EXIT|Exit|close) updatebin && exit ;;
    *) clear && appstartup ;;
  esac
}
appstartup
#E-o-F#
