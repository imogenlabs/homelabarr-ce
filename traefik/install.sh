#!/bin/bash
case $(. /etc/os-release && echo "$ID") in
   ubuntu) type="ubuntu" ;;
   debian) type="ubuntu" ;;
   rasbian) type="ubuntu" ;;
*) type='' ;;
esac

if [ -f ./installer/$type.sh ]; then bash ./installer/$type.sh; fi
#"
