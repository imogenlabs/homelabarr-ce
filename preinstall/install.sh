#!/bin/bash
#
# Title:      headinstaller based of matched OS
# Author(s):  HomelabARR CLI Team
# GNU:        General Public License v3.0
################################################
# Idea from poppabear8883 from UNIT3D
###########################№####################
case $(. /etc/os-release && echo "$ID") in
ubuntu) type="ubuntu" ;;
debian) type="ubuntu" ;;
rasbian) type="ubuntu" ;;
*) type='' ;;
esac
if [ -f ./installer/$type.sh ]; then bash ./installer/$type.sh; fi
#"
