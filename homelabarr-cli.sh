#!/bin/bash

# Comprehensive homelabarr-cli Local Mode Deployment
# Dynamically includes all 179+ available applications

set -e

# Enhanced 256-color ANSI codes for beautiful terminal display
BRIGHT_YELLOW='\033[38;5;226m'  # Bright yellow for header
BRIGHT_CYAN='\033[38;5;51m'     # Bright cyan for sections
BRIGHT_GREEN='\033[38;5;82m'    # Bright green for success
BRIGHT_BLUE='\033[38;5;33m'     # Bright blue for info
ORANGE='\033[38;5;208m'         # Orange for warnings
BRIGHT_RED='\033[38;5;196m'     # Bright red for errors
PURPLE='\033[38;5;141m'         # Purple for special items
PINK='\033[38;5;212m'           # Pink for highlights

# Standard colors (fallback)
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPS_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$SCRIPT_DIR"
BULK_APPS_DIR="$SCRIPT_DIR/apps"

# Curated templates (guaranteed working)
declare -A CURATED_TEMPLATES=(
    ["plex"]="32400:plex-local-template.yml:Media Server"
    ["jellyfin"]="8096:jellyfin-local-template.yml:Media Server"
    ["radarr"]="7878:radarr-local-template.yml:Movie Management"
    ["sonarr"]="8989:sonarr-local-template.yml:TV Management"
    ["qbittorrent"]="8082:qbittorrent-local-template.yml:Torrent Client"
    ["sabnzbd"]="8085:sabnzbd-local-template.yml:Usenet Client"
    ["overseerr"]="5055:overseerr-local-template.yml:Media Requests"
    ["tautulli"]="8181:tautulli-local-template.yml:Plex Analytics"
)

# Popular bulk converted apps with known ports
declare -A POPULAR_APPS=(
    ["heimdall"]="8089:Application Dashboard"
    ["organizr"]="9983:Application Dashboard"
    ["dashy"]="4000:Modern Dashboard"
    ["nextcloud"]="8080:Cloud Storage"
    ["pihole"]="8053:Ad Blocking"
    ["duplicati"]="8200:Backup Solution"
    ["code-server"]="8443:VS Code in Browser"
    ["netdata"]="19999:System Monitoring"
    ["uptime-kuma"]="3001:Service Monitoring"
    ["homeassistant"]="8123:Home Automation"
    ["bitwarden"]="8081:Password Manager"
    ["prowlarr"]="9696:Indexer Management"
    ["bazarr"]="6767:Subtitle Management"
    ["lidarr"]="8686:Music Management"
)

# Scan for all available apps
scan_available_apps() {
    local curated_apps=()
    local bulk_apps=()
    local popular_apps=()
    local other_apps=()
    
    # Add curated templates
    for app in "${!CURATED_TEMPLATES[@]}"; do
        if [[ -f "$TEMPLATES_DIR/${app}-local-template.yml" ]]; then
            curated_apps+=("$app")
        fi
    done
    
    # Scan bulk converted apps
    if [[ -d "$BULK_APPS_DIR" ]]; then
        while IFS= read -r -d '' app_file; do
            local app_name=$(basename "$app_file" .yml)
            if [[ -n "${POPULAR_APPS[$app_name]}" ]]; then
                popular_apps+=("$app_name")
            else
                other_apps+=("$app_name")
            fi
        done < <(find "$BULK_APPS_DIR" -name "*.yml" -not -name "*backup*" -print0 | sort -z)
    fi
    
    echo "curated:${curated_apps[*]}"
    echo "popular:${popular_apps[*]}"
    echo "other:${other_apps[*]}"
}

# Display main menu
show_main_menu() {
    clear
    echo -e "${BOLD}${BRIGHT_YELLOW}"
    cat << "EOF"
    __  __                     __      __    ___    ____  ____  
   / / / /___  ____ ___  ___  / /___ _/ /_  /   |  / __ \/ __ \ 
  / /_/ / __ \/ __ `__ \/ _ \/ / __ `/ __ \/ /| | / /_/ / /_/ / 
 / __  / /_/ / / / / / /  __/ / /_/ / /_/ / ___ |/ _, _/ _, _/  
/_/ /_/\____/_/ /_/ /_/\___/_/\__,_/_.___/_/  |_/_/ |_/_/ |_|   
                                                                 
EOF
    echo -e "${NC}${BOLD}${BRIGHT_CYAN}HomelabARR Ecosystem Management Console${NC}"
    echo -e "${BRIGHT_BLUE}179+ Applications Ready for Deployment${NC}"
    echo
    
    # Count available apps
    local app_count=0
    if [[ -d "$BULK_APPS_DIR" ]]; then
        app_count=$(find "$BULK_APPS_DIR" -name "*.yml" 2>/dev/null | wc -l)
    fi
    
    echo -e "${BOLD}${BRIGHT_GREEN}🎯 Quick Deploy Options${NC}"
    echo -e "${BRIGHT_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BOLD}1)${NC} ${BRIGHT_CYAN}Deploy Popular Stack${NC} ${PURPLE}(Plex + Radarr + Sonarr + qBittorrent)${NC}"
    echo -e "  ${BOLD}2)${NC} ${BRIGHT_CYAN}Deploy Media Server Stack${NC} ${PURPLE}(All media applications)${NC}"
    echo -e "  ${BOLD}3)${NC} ${BRIGHT_CYAN}Deploy Monitoring Stack${NC} ${PURPLE}(Grafana + Prometheus + Loki)${NC}"
    echo
    
    echo -e "${BOLD}${BRIGHT_BLUE}📁 Application Library${NC} ${PINK}(${app_count} apps)${NC}"
    echo -e "${BRIGHT_BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BOLD}50)${NC} ${BRIGHT_CYAN}Browse All Applications${NC}"
    echo -e "  ${BOLD}51)${NC} ${BRIGHT_CYAN}Search Applications${NC}"
    echo -e "  ${BOLD}52)${NC} ${BRIGHT_CYAN}Deploy by Category${NC}"
    echo
    
    echo -e "${BOLD}${ORANGE}🛠️ System Management${NC}"
    echo -e "${ORANGE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BOLD}90)${NC} ${BRIGHT_CYAN}View Running Containers${NC}"
    echo -e "  ${BOLD}91)${NC} ${BRIGHT_CYAN}Container Logs${NC}"
    echo -e "  ${BOLD}92)${NC} ${BRIGHT_CYAN}Bulk Operations${NC}"
    echo -e "  ${BOLD}99)${NC} ${BRIGHT_RED}Remove All Containers${NC}"
    echo -e "  ${BOLD}0)${NC}  ${BRIGHT_RED}Exit${NC}"
    echo
    echo -e "${BOLD}📊 Summary: ${app_count} Total Applications Available${NC}"
    echo
}

# Browse all applications
browse_all_apps() {
    local scan_result=$(scan_available_apps)
    local other_list=$(echo "$scan_result" | grep "^other:" | cut -d: -f2-)
    
    echo -e "\n${BOLD}${CYAN}📁 All Available Applications${NC}"
    echo -e "${CYAN}=============================${NC}"
    echo -e "${YELLOW}💡 These are auto-converted from homelabarr-cli - most will work out-of-the-box${NC}"
    echo
    
    local counter=1
    local apps_per_page=20
    local total_apps=($other_list)
    local total_count=${#total_apps[@]}
    local pages=$(((total_count + apps_per_page - 1) / apps_per_page))
    local current_page=1
    
    while true; do
        echo -e "${BOLD}Page $current_page of $pages${NC}"
        echo -e "${BLUE}===================${NC}"
        
        local start=$(((current_page - 1) * apps_per_page))
        local end=$((start + apps_per_page - 1))
        [[ $end -ge $total_count ]] && end=$((total_count - 1))
        
        for i in $(seq $start $end); do
            if [[ $i -lt $total_count ]]; then
                local app="${total_apps[$i]}"
                echo -e "$((i + 1))) ${CYAN}$app${NC}"
            fi
        done
        
        echo
        echo -e "${YELLOW}Options:${NC}"
        echo -e "n) Next page  p) Previous page  #) Deploy app number  b) Back to main"
        echo -n "Choice: "
        read -r choice
        
        case $choice in
            n|N)
                [[ $current_page -lt $pages ]] && ((current_page++))
                ;;
            p|P)
                [[ $current_page -gt 1 ]] && ((current_page--))
                ;;
            b|B)
                return
                ;;
            [0-9]*)
                if [[ $choice -gt 0 && $choice -le $total_count ]]; then
                    local selected_app="${total_apps[$((choice - 1))]}"
                    deploy_bulk_app "$selected_app"
                    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                    read -r
                fi
                ;;
        esac
        clear
        echo -e "${BOLD}${CYAN}📁 All Available Applications${NC}"
        echo -e "${CYAN}=============================${NC}"
    done
}

# Deploy curated template
deploy_curated_app() {
    local app="$1"
    local info="${CURATED_TEMPLATES[$app]}"
    local port=$(echo "$info" | cut -d: -f1)
    local template=$(echo "$info" | cut -d: -f2)
    local desc=$(echo "$info" | cut -d: -f3)
    
    echo -e "\n${BLUE}🚀 Deploying $app ($desc) on port $port...${NC}"
    
    if [[ -f "$TEMPLATES_DIR/$template" ]]; then
        if docker-compose -f "$TEMPLATES_DIR/$template" --env-file .env up -d; then
            echo -e "${GREEN}✅ $app deployed successfully!${NC}"
            echo -e "${CYAN}🌐 Access: http://localhost:$port${NC}"
        else
            echo -e "${RED}❌ $app deployment failed${NC}"
        fi
    else
        echo -e "${RED}❌ Template not found: $template${NC}"
    fi
}

# Deploy bulk converted app
deploy_bulk_app() {
    local app="$1"
    
    echo -e "\n${BLUE}🚀 Deploying $app (bulk converted)...${NC}"
    
    if [[ -f "$BULK_APPS_DIR/${app}.yml" ]]; then
        if docker-compose -f "$BULK_APPS_DIR/${app}.yml" --env-file .env up -d; then
            echo -e "${GREEN}✅ $app deployed successfully!${NC}"
            echo -e "${CYAN}💡 Check 'docker ps' to see the assigned port${NC}"
        else
            echo -e "${YELLOW}⚠️ $app deployment had issues - check logs${NC}"
        fi
    else
        echo -e "${RED}❌ App not found: ${app}.yml${NC}"
    fi
}

# Deploy popular stack
deploy_popular_stack() {
    echo -e "\n${BOLD}${GREEN}🚀 Deploying Popular Stack${NC}"
    echo -e "${BLUE}Deploying: Plex, Radarr, Sonarr, qBittorrent, Overseerr${NC}"
    
    local apps=("plex" "radarr" "sonarr" "qbittorrent" "overseerr")
    
    for app in "${apps[@]}"; do
        deploy_curated_app "$app"
        sleep 2
    done
    
    echo -e "\n${BOLD}${GREEN}🎉 Popular Stack Deployment Complete!${NC}"
    show_access_urls
}

# Show access URLs
show_access_urls() {
    echo -e "\n${BOLD}${CYAN}🌐 Access URLs for Running Services:${NC}"
    echo -e "${CYAN}=====================================${NC}"
    
    local containers=$(docker ps --format "table {{.Names}}\t{{.Ports}}" | tail -n +2)
    
    if [[ -n "$containers" ]]; then
        while IFS=$'\t' read -r name ports; do
            if [[ "$ports" =~ 0\.0\.0\.0:([0-9]+) ]]; then
                local port="${BASH_REMATCH[1]}"
                echo -e "${GREEN}✅ ${name}${NC}: http://localhost:${port}"
            fi
        done <<< "$containers"
    else
        echo -e "${YELLOW}⚠️ No containers currently running${NC}"
    fi
}

# Main execution loop
main() {
    # Check prerequisites
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not available${NC}"
        exit 1
    fi
    
    # Main loop
    while true; do
        show_main_menu
        echo -n "Enter your choice: "
        read -r choice
        
        case $choice in
            1)
                deploy_popular_stack
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            2)
                echo -e "\n${BLUE}🎬 Deploying Media Server Stack...${NC}"
                for app in plex jellyfin radarr sonarr lidarr bazarr qbittorrent overseerr tautulli; do
                    if [[ -n "${CURATED_TEMPLATES[$app]}" ]]; then
                        deploy_curated_app "$app"
                    elif [[ -f "$BULK_APPS_DIR/${app}.yml" ]]; then
                        deploy_bulk_app "$app"
                    fi
                    sleep 1
                done
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            1[0-9]|2[0-9]|3[0-9]|4[0-9])
                # Curated apps (10-49)
                local scan_result=$(scan_available_apps)
                local curated_list=$(echo "$scan_result" | grep "^curated:" | cut -d: -f2-)
                local popular_list=$(echo "$scan_result" | grep "^popular:" | cut -d: -f2-)
                
                local all_apps=($curated_list $popular_list)
                local index=$((choice - 10))
                
                if [[ $index -ge 0 && $index -lt ${#all_apps[@]} ]]; then
                    local selected_app="${all_apps[$index]}"
                    if [[ -n "${CURATED_TEMPLATES[$selected_app]}" ]]; then
                        deploy_curated_app "$selected_app"
                    elif [[ -n "${POPULAR_APPS[$selected_app]}" ]]; then
                        deploy_bulk_app "$selected_app"
                    fi
                    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                    read -r
                fi
                ;;
            50)
                browse_all_apps
                ;;
            51)
                echo -e "\n${BLUE}🔍 Search Applications${NC}"
                echo -n "Enter search term: "
                read -r search_term
                echo -e "\n${CYAN}Search results for '$search_term':${NC}"
                find "$BULK_APPS_DIR" -name "*${search_term}*.yml" -exec basename {} .yml \; | head -20
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            90)
                echo -e "\n${BLUE}🐳 Running homelabarr-cli Containers:${NC}"
                docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            91)
                echo -e "\n${BLUE}Available containers for log viewing:${NC}"
                docker ps --format "{{.Names}}"
                echo -n "Enter container name: "
                read -r container_name
                if [[ -n "$container_name" ]]; then
                    docker logs -f "$container_name"
                fi
                ;;
            92)
                echo -e "\n${BLUE}🔧 Bulk Operations${NC}"
                echo -e "1) Start all containers"
                echo -e "2) Stop all containers" 
                echo -e "3) Update all containers"
                echo -e "0) Back to main menu"
                echo -n "Choice: "
                read -r bulk_choice
                case $bulk_choice in
                    1) docker start $(docker ps -aq) ;;
                    2) docker stop $(docker ps -q) ;;
                    3) docker-compose pull && docker-compose up -d ;;
                    0) continue ;;
                    *) echo -e "${RED}Invalid choice${NC}" ;;
                esac
                echo -e "\n${YELLOW}Press Enter to continue...${NC}"
                read -r
                ;;
            99)
                echo -e "${RED}⚠️ This will remove all homelabarr-cli containers. Continue? (y/N)${NC}"
                read -r confirm
                if [[ "$confirm" =~ ^[Yy]$ ]]; then
                    docker ps -a --format "{{.Names}}" | xargs -r docker rm -f
                    echo -e "${GREEN}✅ All containers removed${NC}"
                fi
                sleep 2
                ;;
            0)
                echo -e "${GREEN}👋 Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ Invalid option${NC}"
                sleep 1
                ;;
        esac
    done
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi