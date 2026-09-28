#!/usr/bin/env python3
"""
HomelabARR CLI Auto-Dashboard Generator
Automatically creates Grafana dashboards for installed applications
"""

import json
import os
import subprocess
import requests
from datetime import datetime
from typing import Dict, List, Optional

class HomelabARRDashboardGenerator:
    def __init__(self, grafana_url: str = "http://localhost:3000", 
                 grafana_token: Optional[str] = None):
        self.grafana_url = grafana_url.rstrip('/')
        self.grafana_token = grafana_token
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {grafana_token}' if grafana_token else ''
        }
        
        # Application type mappings
        self.app_types = {
            'mediaserver': ['plex', 'jellyfin', 'emby', 'mstream', 'dim'],
            'mediamanager': ['sonarr', 'radarr', 'lidarr', 'bazarr', 'prowlarr', 'tautulli'],
            'downloadclients': ['qbittorrent', 'sabnzbd', 'nzbget', 'deluge', 'jackett'],
            'request': ['overseerr', 'petio', 'conreq'],
            'addons': ['dashy', 'heimdall', 'cloudcmd', 'netdata', 'yacht'],
            'backup': ['duplicati', 'restic', 'rsnapshot'],
            'monitoring': ['grafana', 'prometheus', 'loki', 'portainer', 'dozzle']
        }
        
    def get_running_containers(self) -> List[Dict]:
        """Get list of running Docker containers with labels"""
        try:
            cmd = ['docker', 'ps', '--format', '{{.Names}}\\t{{.Image}}\\t{{.Labels}}']
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            containers = []
            for line in result.stdout.strip().split('\\n'):
                if line:
                    parts = line.split('\\t')
                    if len(parts) >= 3:
                        name, image, labels = parts[0], parts[1], parts[2] if len(parts) > 2 else ''
                        containers.append({
                            'name': name,
                            'image': image,
                            'labels': self.parse_labels(labels),
                            'type': self.detect_app_type(name)
                        })
            return containers
        except subprocess.CalledProcessError as e:
            print(f"Error getting containers: {e}")
            return []
    
    def parse_labels(self, labels_str: str) -> Dict[str, str]:
        """Parse Docker labels string into dictionary"""
        labels = {}
        if labels_str:
            for label in labels_str.split(','):
                if '=' in label:
                    key, value = label.split('=', 1)
                    labels[key] = value
        return labels
    
    def detect_app_type(self, container_name: str) -> str:
        """Detect application type based on container name"""
        for app_type, apps in self.app_types.items():
            if any(app in container_name.lower() for app in apps):
                return app_type
        return 'unknown'
    
    def generate_dashboard_template(self, container: Dict) -> Dict:
        """Generate Grafana dashboard template for a container"""
        name = container['name']
        app_type = container['type']
        
        dashboard = {
            "annotations": {
                "list": [
                    {
                        "builtIn": 1,
                        "datasource": "-- Grafana --",
                        "enable": True,
                        "hide": True,
                        "iconColor": "rgba(0, 211, 255, 1)",
                        "name": "Annotations & Alerts",
                        "type": "dashboard"
                    }
                ]
            },
            "description": f"Auto-generated dashboard for {name} ({app_type})",
            "editable": True,
            "gnetId": None,
            "graphTooltip": 0,
            "id": None,
            "iteration": int(datetime.now().timestamp() * 1000),
            "links": [],
            "panels": self.generate_panels(name, app_type),
            "refresh": "30s",
            "schemaVersion": 27,
            "style": "dark",
            "tags": ["homelabarr", "auto-generated", app_type, name],
            "templating": {"list": []},
            "time": {"from": "now-1h", "to": "now"},
            "timepicker": {},
            "timezone": "",
            "title": f"HomelabARR CLI - {name.title()}",
            "uid": f"homelabarr-{name}",
            "version": 1
        }
        
        return dashboard
    
    def generate_panels(self, container_name: str, app_type: str) -> List[Dict]:
        """Generate panels based on application type"""
        panels = []
        
        # Panel 1: Container Status
        panels.append({
            "datasource": "Prometheus",
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "thresholds"},
                    "mappings": [
                        {"options": {"0": {"color": "red", "text": "Down"}}, "type": "value"},
                        {"options": {"1": {"color": "green", "text": "Up"}}, "type": "value"}
                    ],
                    "thresholds": {
                        "mode": "absolute",
                        "steps": [
                            {"color": "red", "value": None},
                            {"color": "green", "value": 1}
                        ]
                    }
                }
            },
            "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
            "id": 1,
            "options": {
                "colorMode": "background",
                "graphMode": "none",
                "justifyMode": "center",
                "reduceOptions": {"calcs": ["lastNotNull"]},
                "textMode": "auto"
            },
            "targets": [{"expr": f'up{{job="{container_name}"}}', "refId": "A"}],
            "title": f"{container_name.title()} Status",
            "type": "stat"
        })
        
        # Panel 2: CPU Usage
        panels.append({
            "datasource": "Prometheus",
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "palette-classic"},
                    "custom": {
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "drawStyle": "line",
                        "fillOpacity": 10,
                        "lineWidth": 1,
                        "pointSize": 5,
                        "showPoints": "never",
                        "spanNulls": True
                    },
                    "unit": "percent"
                }
            },
            "gridPos": {"h": 8, "w": 9, "x": 6, "y": 0},
            "id": 2,
            "options": {
                "legend": {"calcs": [], "displayMode": "list", "placement": "bottom"},
                "tooltip": {"mode": "single"}
            },
            "targets": [
                {
                    "expr": f'rate(container_cpu_usage_seconds_total{{name="{container_name}"}}[5m]) * 100',
                    "legendFormat": "CPU Usage",
                    "refId": "A"
                }
            ],
            "title": f"{container_name.title()} CPU Usage",
            "type": "timeseries"
        })
        
        # Panel 3: Memory Usage
        panels.append({
            "datasource": "Prometheus",
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "palette-classic"},
                    "custom": {
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "drawStyle": "line",
                        "fillOpacity": 10,
                        "lineWidth": 1,
                        "pointSize": 5,
                        "showPoints": "never",
                        "spanNulls": True
                    },
                    "unit": "bytes"
                }
            },
            "gridPos": {"h": 8, "w": 9, "x": 15, "y": 0},
            "id": 3,
            "options": {
                "legend": {"calcs": [], "displayMode": "list", "placement": "bottom"},
                "tooltip": {"mode": "single"}
            },
            "targets": [
                {
                    "expr": f'container_memory_usage_bytes{{name="{container_name}"}}',
                    "legendFormat": "Memory Usage",
                    "refId": "A"
                }
            ],
            "title": f"{container_name.title()} Memory Usage",
            "type": "timeseries"
        })
        
        # Panel 4: Network I/O
        panels.append({
            "datasource": "Prometheus",
            "fieldConfig": {
                "defaults": {
                    "color": {"mode": "palette-classic"},
                    "custom": {
                        "axisLabel": "",
                        "axisPlacement": "auto",
                        "drawStyle": "line",
                        "fillOpacity": 10,
                        "lineWidth": 1,
                        "pointSize": 5,
                        "showPoints": "never",
                        "spanNulls": True
                    },
                    "unit": "binBps"
                }
            },
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
            "id": 4,
            "options": {
                "legend": {"calcs": [], "displayMode": "list", "placement": "bottom"},
                "tooltip": {"mode": "single"}
            },
            "targets": [
                {
                    "expr": f'rate(container_network_receive_bytes_total{{name="{container_name}"}}[5m])',
                    "legendFormat": "Network RX",
                    "refId": "A"
                },
                {
                    "expr": f'rate(container_network_transmit_bytes_total{{name="{container_name}"}}[5m])',
                    "legendFormat": "Network TX",
                    "refId": "B"
                }
            ],
            "title": f"{container_name.title()} Network I/O",
            "type": "timeseries"
        })
        
        # Panel 5: Container Logs
        panels.append({
            "datasource": "Loki",
            "fieldConfig": {"defaults": {"color": {"mode": "palette-classic"}}},
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
            "id": 5,
            "options": {
                "dedupStrategy": "none",
                "enableLogDetails": True,
                "prettifyLogMessage": False,
                "showCommonLabels": False,
                "showLabels": True,
                "showTime": True,
                "sortOrder": "Descending",
                "wrapLogMessage": False
            },
            "targets": [
                {
                    "expr": f'{{container_name="{container_name}"}}',
                    "refId": "A"
                }
            ],
            "title": f"{container_name.title()} Logs",
            "type": "logs"
        })
        
        # Add app-specific panels based on type
        if app_type == 'mediaserver':
            panels.extend(self.get_mediaserver_panels(container_name))
        elif app_type == 'downloadclients':
            panels.extend(self.get_downloadclient_panels(container_name))
        elif app_type == 'mediamanager':
            panels.extend(self.get_mediamanager_panels(container_name))
        
        return panels
    
    def get_mediaserver_panels(self, container_name: str) -> List[Dict]:
        """Generate media server specific panels"""
        return [
            {
                "datasource": "Prometheus",
                "fieldConfig": {
                    "defaults": {
                        "color": {"mode": "thresholds"},
                        "thresholds": {
                            "steps": [
                                {"color": "green", "value": None},
                                {"color": "yellow", "value": 1},
                                {"color": "red", "value": 5}
                            ]
                        }
                    }
                },
                "gridPos": {"h": 4, "w": 6, "x": 0, "y": 16},
                "id": 6,
                "options": {
                    "colorMode": "value",
                    "reduceOptions": {"calcs": ["lastNotNull"]}
                },
                "targets": [
                    {
                        "expr": f'container_fs_usage_bytes{{name="{container_name}"}} / container_fs_limit_bytes{{name="{container_name}"}} * 100',
                        "refId": "A"
                    }
                ],
                "title": "Storage Usage %",
                "type": "stat"
            }
        ]
    
    def get_downloadclient_panels(self, container_name: str) -> List[Dict]:
        """Generate download client specific panels"""
        return [
            {
                "datasource": "Prometheus",
                "fieldConfig": {
                    "defaults": {
                        "color": {"mode": "palette-classic"},
                        "unit": "binBps"
                    }
                },
                "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16},
                "id": 6,
                "targets": [
                    {
                        "expr": f'rate(container_network_receive_bytes_total{{name="{container_name}"}}[5m])',
                        "legendFormat": "Download Rate",
                        "refId": "A"
                    }
                ],
                "title": "Download Activity",
                "type": "timeseries"
            }
        ]
    
    def get_mediamanager_panels(self, container_name: str) -> List[Dict]:
        """Generate media manager specific panels"""
        return [
            {
                "datasource": "Loki",
                "gridPos": {"h": 6, "w": 24, "x": 0, "y": 16},
                "id": 6,
                "options": {
                    "dedupStrategy": "none",
                    "enableLogDetails": True,
                    "showCommonLabels": False
                },
                "targets": [
                    {
                        "expr": f'{{container_name="{container_name}"}} |~ "(?i)download|import|process"',
                        "refId": "A"
                    }
                ],
                "title": f"{container_name.title()} Activity Logs",
                "type": "logs"
            }
        ]
    
    def create_dashboard(self, dashboard: Dict) -> bool:
        """Create dashboard in Grafana"""
        if not self.grafana_token:
            # Save to file instead
            filename = f"auto-generated-{dashboard['uid']}.json"
            filepath = os.path.join(os.path.dirname(__file__), '..', 'dashboards', filename)
            
            try:
                with open(filepath, 'w') as f:
                    json.dump(dashboard, f, indent=2)
                print(f"✅ Dashboard saved to: {filepath}")
                return True
            except Exception as e:
                print(f"❌ Error saving dashboard: {e}")
                return False
        
        # Create via API
        try:
            payload = {"dashboard": dashboard, "overwrite": True}
            response = requests.post(
                f"{self.grafana_url}/api/dashboards/db",
                headers=self.headers,
                data=json.dumps(payload)
            )
            
            if response.status_code == 200:
                print(f"✅ Dashboard created: {dashboard['title']}")
                return True
            else:
                print(f"❌ Error creating dashboard: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error connecting to Grafana: {e}")
            return False
    
    def generate_all_dashboards(self) -> None:
        """Generate dashboards for all running containers"""
        print("🔍 Scanning for HomelabARR CLI containers...")
        containers = self.get_running_containers()
        
        # Filter for HomelabARR containers (exclude system containers)
        homelabarr_containers = [
            c for c in containers 
            if c['type'] != 'unknown' and 
            not any(sys_name in c['name'].lower() for sys_name in ['traefik', 'authelia', 'cf-companion'])
        ]
        
        print(f"📊 Found {len(homelabarr_containers)} HomelabARR CLI applications")
        
        created_count = 0
        for container in homelabarr_containers:
            print(f"⚙️  Generating dashboard for {container['name']} ({container['type']})")
            dashboard = self.generate_dashboard_template(container)
            
            if self.create_dashboard(dashboard):
                created_count += 1
        
        print(f"\\n🎉 Successfully generated {created_count} dashboards!")
        print("📁 Dashboards saved to: apps/monitoring/dashboards/")
        if not self.grafana_token:
            print("💡 To upload to Grafana, set GRAFANA_TOKEN environment variable")

def main():
    """Main function"""
    grafana_url = os.getenv('GRAFANA_URL', 'http://grafana:3000')
    grafana_token = os.getenv('GRAFANA_TOKEN')
    
    generator = HomelabARRDashboardGenerator(grafana_url, grafana_token)
    generator.generate_all_dashboards()

if __name__ == "__main__":
    main()
