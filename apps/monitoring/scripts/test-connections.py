#!/usr/bin/env python3
"""
Simple connectivity test for monitoring stack
Windows-compatible version without emojis
"""

import requests
import sys
from datetime import datetime

def test_connection(name, url, endpoint=""):
    """Test basic connectivity to a service"""
    try:
        full_url = f"{url}{endpoint}"
        print(f"Testing {name} at {full_url}...")
        
        response = requests.get(full_url, timeout=5)
        
        if response.status_code == 200:
            print(f"  SUCCESS: {name} is accessible (HTTP {response.status_code})")
            return True
        else:
            print(f"  FAILED: {name} returned HTTP {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"  FAILED: {name} connection error - {str(e)}")
        return False

def test_prometheus_targets(prometheus_url):
    """Test Prometheus target discovery"""
    try:
        response = requests.get(f"{prometheus_url}/api/v1/targets", timeout=5)
        if response.status_code == 200:
            targets = response.json()
            active_targets = targets['data']['activeTargets']
            up_targets = [t for t in active_targets if t['health'] == 'up']
            
            print(f"\nPrometheus Target Discovery:")
            print(f"  Total targets: {len(active_targets)}")
            print(f"  Healthy targets: {len(up_targets)}")
            
            for target in up_targets[:10]:  # Show first 10
                job = target.get('labels', {}).get('job', 'unknown')
                instance = target.get('labels', {}).get('instance', 'unknown')
                print(f"    UP: {job} -> {instance}")
                
            return len(up_targets) > 0
        else:
            print(f"Prometheus targets failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"Prometheus targets error: {str(e)}")
        return False

def test_grafana_datasources(grafana_url, username="admin", password="admin"):
    """Test Grafana data source configuration"""
    try:
        auth = (username, password)
        response = requests.get(f"{grafana_url}/api/datasources", auth=auth, timeout=5)
        
        if response.status_code == 200:
            datasources = response.json()
            print(f"\nGrafana Data Sources:")
            print(f"  Total configured: {len(datasources)}")
            
            for ds in datasources:
                name = ds.get('name', 'Unknown')
                type_name = ds.get('type', 'Unknown')
                url = ds.get('url', 'Unknown')
                print(f"    {name} ({type_name}): {url}")
                
            # Check for required data sources
            prometheus_ds = any(ds['type'] == 'prometheus' for ds in datasources)
            loki_ds = any(ds['type'] == 'loki' for ds in datasources)
            
            if prometheus_ds and loki_ds:
                print("  STATUS: Both Prometheus and Loki data sources configured")
                return True
            else:
                missing = []
                if not prometheus_ds: missing.append("Prometheus")
                if not loki_ds: missing.append("Loki")
                print(f"  WARNING: Missing data sources: {', '.join(missing)}")
                return False
        else:
            print(f"Grafana API failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"Grafana API error: {str(e)}")
        return False

def main():
    """Main test function"""
    print("HomelabARR CLI Monitoring Stack Connectivity Test")
    print("=" * 50)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test basic connectivity
    print("1. BASIC CONNECTIVITY TESTS")
    print("-" * 30)
    
    prometheus_ok = test_connection("Prometheus", "http://localhost:9090", "/-/healthy")
    grafana_ok = test_connection("Grafana", "http://localhost:3000", "/api/health")
    loki_ok = test_connection("Loki", "http://localhost:31000", "/ready")
    cadvisor_ok = test_connection("cAdvisor", "http://localhost:8080", "/metrics")
    
    # Test Prometheus targets if accessible
    if prometheus_ok:
        print("\n2. PROMETHEUS TARGET DISCOVERY")
        print("-" * 30)
        targets_ok = test_prometheus_targets("http://localhost:9090")
    else:
        targets_ok = False
    
    # Test Grafana data sources if accessible
    if grafana_ok:
        print("\n3. GRAFANA DATA SOURCE CONFIGURATION")
        print("-" * 40)
        datasources_ok = test_grafana_datasources("http://localhost:3000")
    else:
        datasources_ok = False
    
    # Summary
    print("\n4. SUMMARY")
    print("-" * 10)
    
    services = [
        ("Prometheus", prometheus_ok),
        ("Grafana", grafana_ok), 
        ("Loki", loki_ok),
        ("cAdvisor", cadvisor_ok),
        ("Prometheus Targets", targets_ok),
        ("Grafana Data Sources", datasources_ok)
    ]
    
    healthy_count = sum(1 for _, status in services if status)
    total_count = len(services)
    
    for name, status in services:
        status_text = "OK" if status else "FAILED"
        print(f"  {name:<20}: {status_text}")
    
    print(f"\nOverall Health: {healthy_count}/{total_count} services operational")
    
    if healthy_count >= 4:
        print("STATUS: Monitoring stack is mostly operational")
        if not loki_ok:
            print("NOTE: Loki appears to be down - logs will not be available")
    elif healthy_count >= 2:
        print("STATUS: Partial monitoring stack functionality")
    else:
        print("STATUS: Monitoring stack has significant issues")
    
    return healthy_count >= 2

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
