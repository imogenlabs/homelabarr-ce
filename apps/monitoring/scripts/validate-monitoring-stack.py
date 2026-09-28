#!/usr/bin/env python3
"""
HomelabARR CLI Monitoring Stack Validation
Validates end-to-end connectivity between Prometheus, Loki, and Grafana
"""

import requests
import time
import sys
from datetime import datetime

class MonitoringStackValidator:
    def __init__(self, 
                 prometheus_url: str = "http://localhost:9090",
                 grafana_url: str = "http://localhost:3000", 
                 loki_url: str = "http://localhost:3100"):
        self.prometheus_url = prometheus_url.rstrip('/')
        self.grafana_url = grafana_url.rstrip('/')
        self.loki_url = loki_url.rstrip('/')
        
        # Test credentials (should be configured via environment)
        self.grafana_user = "admin"
        self.grafana_password = "admin"  # Change this to your actual password
        
        self.results = {
            'prometheus': {'status': 'unknown', 'tests': []},
            'loki': {'status': 'unknown', 'tests': []},
            'grafana': {'status': 'unknown', 'tests': []},
            'integration': {'status': 'unknown', 'tests': []}
        }
    
    def print_header(self, title: str):
        """Print formatted section header"""
        print(f"\n{'='*60}")
        print(f"🔍 {title}")
        print('='*60)
    
    def print_test(self, test_name: str, status: str, details: str = ""):
        """Print test result with status indicator"""
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name:<40} [{status}]")
        if details:
            print(f"   📋 {details}")
    
    def test_service_health(self, service_name: str, url: str, endpoint: str = "/") -> bool:
        """Test if a service is responding"""
        try:
            full_url = f"{url}{endpoint}"
            response = requests.get(full_url, timeout=5)
            
            if response.status_code == 200:
                self.print_test(f"{service_name} Health Check", "PASS", f"Response: {response.status_code}")
                return True
            else:
                self.print_test(f"{service_name} Health Check", "FAIL", f"HTTP {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.print_test(f"{service_name} Health Check", "FAIL", f"Connection error: {str(e)}")
            return False
    
    def test_prometheus(self) -> bool:
        """Test Prometheus functionality"""
        self.print_header("PROMETHEUS VALIDATION")
        
        success_count = 0
        total_tests = 4
        
        # Test 1: Basic health check
        if self.test_service_health("Prometheus", self.prometheus_url, "/-/healthy"):
            success_count += 1
        
        # Test 2: Configuration check
        try:
            response = requests.get(f"{self.prometheus_url}/api/v1/status/config", timeout=5)
            if response.status_code == 200:
                config = response.json()
                if config.get('status') == 'success' and config.get('data', {}).get('yaml') is not None:
                    self.print_test("Configuration Access", "PASS", "Config loaded successfully")
                    success_count += 1
                else:
                    self.print_test("Configuration Access", "FAIL", config.get('error', 'Invalid config response'))
            else:
                self.print_test("Configuration Access", "FAIL", f"HTTP {response.status_code}")
        except Exception as e:
            self.print_test("Configuration Access", "FAIL", str(e))
        
        # Test 3: Targets check
        try:
            response = requests.get(f"{self.prometheus_url}/api/v1/targets", timeout=5)
            if response.status_code == 200:
                targets = response.json()
                active_targets = targets['data']['activeTargets']
                up_targets = [t for t in active_targets if t['health'] == 'up']
                
                self.print_test("Target Discovery", "PASS", f"{len(up_targets)}/{len(active_targets)} targets UP")
                
                # List UP targets
                for target in up_targets[:5]:  # Show first 5
                    job = target.get('labels', {}).get('job', 'unknown')
                    instance = target.get('labels', {}).get('instance', 'unknown')
                    print(f"     ✅ {job}: {instance}")
                
                if len(up_targets) > 0:
                    success_count += 1
            else:
                self.print_test("Target Discovery", "FAIL", f"HTTP {response.status_code}")
        except Exception as e:
            self.print_test("Target Discovery", "FAIL", str(e))
        
        # Test 4: Metrics query
        try:
            query = "up"
            response = requests.get(f"{self.prometheus_url}/api/v1/query", 
                                  params={'query': query}, timeout=5)
            if response.status_code == 200:
                result = response.json()
                if result['status'] == 'success' and len(result['data']['result']) > 0:
                    metrics_count = len(result['data']['result'])
                    self.print_test("Metrics Query", "PASS", f"{metrics_count} metrics available")
                    success_count += 1
                else:
                    self.print_test("Metrics Query", "FAIL", "No metrics returned")
            else:
                self.print_test("Metrics Query", "FAIL", f"HTTP {response.status_code}")
        except Exception as e:
            self.print_test("Metrics Query", "FAIL", str(e))
        
        success_rate = success_count / total_tests
        self.results['prometheus']['status'] = 'healthy' if success_rate >= 0.75 else 'unhealthy'
        self.results['prometheus']['tests'] = success_count
        
        return success_rate >= 0.75
    
    def test_loki(self) -> bool:
        """Test Loki functionality"""
        self.print_header("LOKI VALIDATION")
        
        success_count = 0
        total_tests = 3
        
        # Test 1: Basic health check
        if self.test_service_health("Loki", self.loki_url, "/ready"):
            success_count += 1
        
        # Test 2: Labels query
        try:
            response = requests.get(f"{self.loki_url}/loki/api/v1/labels", timeout=5)
            if response.status_code == 200:
                labels = response.json()
                if 'data' in labels and len(labels['data']) > 0:
                    label_count = len(labels['data'])
                    self.print_test("Labels Discovery", "PASS", f"{label_count} labels found")
                    
                    # Show some labels
                    for label in labels['data'][:5]:
                        print(f"     🏷️  {label}")
                    
                    success_count += 1
                else:
                    self.print_test("Labels Discovery", "WARN", "No labels found")
            else:
                self.print_test("Labels Discovery", "FAIL", f"HTTP {response.status_code}")
        except Exception as e:
            self.print_test("Labels Discovery", "FAIL", str(e))
        
        # Test 3: Log query
        try:
            # Query for logs from the last hour
            now = int(time.time() * 1000000000)  # nanoseconds
            hour_ago = now - (3600 * 1000000000)
            
            query = '{job="containers"}'
            params = {
                'query': query,
                'start': hour_ago,
                'end': now,
                'limit': 10
            }
            
            response = requests.get(f"{self.loki_url}/loki/api/v1/query_range", 
                                  params=params, timeout=10)
            if response.status_code == 200:
                result = response.json()
                if 'data' in result and 'result' in result['data']:
                    streams = result['data']['result']
                    log_count = sum(len(stream.get('values', [])) for stream in streams)
                    self.print_test("Log Query", "PASS", f"{log_count} log entries found")
                    success_count += 1
                else:
                    self.print_test("Log Query", "WARN", "No logs found (may be normal for new setup)")
            else:
                self.print_test("Log Query", "FAIL", f"HTTP {response.status_code}")
        except Exception as e:
            self.print_test("Log Query", "FAIL", str(e))
        
        success_rate = success_count / total_tests
        self.results['loki']['status'] = 'healthy' if success_rate >= 0.67 else 'unhealthy'
        self.results['loki']['tests'] = success_count
        
        return success_rate >= 0.67
    
    def test_grafana(self) -> bool:
        """Test Grafana functionality and data sources"""
        self.print_header("GRAFANA VALIDATION")
        
        success_count = 0
        total_tests = 4
        
        # Test 1: Basic health check
        if self.test_service_health("Grafana", self.grafana_url, "/api/health"):
            success_count += 1
        
        # Test 2: Authentication and API access
        try:
            auth = (self.grafana_user, self.grafana_password)
            response = requests.get(f"{self.grafana_url}/api/user", auth=auth, timeout=5)
            
            if response.status_code == 200:
                user_info = response.json()
                self.print_test("API Authentication", "PASS", f"User: {user_info.get('login', 'unknown')}")
                success_count += 1
            else:
                self.print_test("API Authentication", "FAIL", f"HTTP {response.status_code}")
        except Exception as e:
            self.print_test("API Authentication", "FAIL", str(e))
        
        # Test 3: Data sources check
        try:
            auth = (self.grafana_user, self.grafana_password)
            response = requests.get(f"{self.grafana_url}/api/datasources", auth=auth, timeout=5)
            
            if response.status_code == 200:
                datasources = response.json()
                prometheus_ds = next((ds for ds in datasources if ds['type'] == 'prometheus'), None)
                loki_ds = next((ds for ds in datasources if ds['type'] == 'loki'), None)
                
                if prometheus_ds and loki_ds:
                    self.print_test("Data Sources", "PASS", "Prometheus and Loki configured")
                    print(f"     📊 Prometheus: {prometheus_ds['url']}")
                    print(f"     📋 Loki: {loki_ds['url']}")
                    success_count += 1
                else:
                    missing = []
                    if not prometheus_ds: missing.append("Prometheus")
                    if not loki_ds: missing.append("Loki")
                    self.print_test("Data Sources", "FAIL", f"Missing: {', '.join(missing)}")
            else:
                self.print_test("Data Sources", "FAIL", f"HTTP {response.status_code}")
        except Exception as e:
            self.print_test("Data Sources", "FAIL", str(e))
        
        # Test 4: Dashboard count
        try:
            auth = (self.grafana_user, self.grafana_password)
            response = requests.get(f"{self.grafana_url}/api/search?type=dash-db", auth=auth, timeout=5)
            
            if response.status_code == 200:
                dashboards = response.json()
                dashboard_count = len(dashboards)
                self.print_test("Dashboards", "PASS", f"{dashboard_count} dashboards installed")
                
                # List some dashboards
                for dash in dashboards[:3]:
                    print(f"     📊 {dash.get('title', 'Unknown')}")
                
                success_count += 1
            else:
                self.print_test("Dashboards", "FAIL", f"HTTP {response.status_code}")
        except Exception as e:
            self.print_test("Dashboards", "FAIL", str(e))
        
        success_rate = success_count / total_tests
        self.results['grafana']['status'] = 'healthy' if success_rate >= 0.75 else 'unhealthy'
        self.results['grafana']['tests'] = success_count
        
        return success_rate >= 0.75
    
    def test_data_source_connectivity(self) -> bool:
        """Test Grafana -> Prometheus and Grafana -> Loki connectivity"""
        self.print_header("DATA SOURCE INTEGRATION")
        
        success_count = 0
        total_tests = 2
        
        auth = (self.grafana_user, self.grafana_password)
        
        # Test 1: Grafana -> Prometheus connectivity
        try:
            # Get Prometheus data source ID
            response = requests.get(f"{self.grafana_url}/api/datasources", auth=auth, timeout=5)
            if response.status_code == 200:
                datasources = response.json()
                prometheus_ds = next((ds for ds in datasources if ds['type'] == 'prometheus'), None)
                
                if prometheus_ds:
                    # Test data source connectivity
                    ds_id = prometheus_ds['id']
                    test_response = requests.get(f"{self.grafana_url}/api/datasources/{ds_id}/health", 
                                               auth=auth, timeout=10)
                    
                    if test_response.status_code == 200:
                        health = test_response.json()
                        if health.get('status') == 'OK':
                            self.print_test("Grafana -> Prometheus", "PASS", "Data source healthy")
                            success_count += 1
                        else:
                            self.print_test("Grafana -> Prometheus", "FAIL", 
                                          health.get('message', 'Unknown error'))
                    else:
                        self.print_test("Grafana -> Prometheus", "FAIL", 
                                      f"Health check failed: HTTP {test_response.status_code}")
                else:
                    self.print_test("Grafana -> Prometheus", "FAIL", "Prometheus data source not found")
        except Exception as e:
            self.print_test("Grafana -> Prometheus", "FAIL", str(e))
        
        # Test 2: Grafana -> Loki connectivity
        try:
            # Get Loki data source ID
            response = requests.get(f"{self.grafana_url}/api/datasources", auth=auth, timeout=5)
            if response.status_code == 200:
                datasources = response.json()
                loki_ds = next((ds for ds in datasources if ds['type'] == 'loki'), None)
                
                if loki_ds:
                    # Test data source connectivity
                    ds_id = loki_ds['id']
                    test_response = requests.get(f"{self.grafana_url}/api/datasources/{ds_id}/health", 
                                               auth=auth, timeout=10)
                    
                    if test_response.status_code == 200:
                        health = test_response.json()
                        if health.get('status') == 'OK':
                            self.print_test("Grafana -> Loki", "PASS", "Data source healthy")
                            success_count += 1
                        else:
                            self.print_test("Grafana -> Loki", "FAIL", 
                                          health.get('message', 'Unknown error'))
                    else:
                        self.print_test("Grafana -> Loki", "FAIL", 
                                      f"Health check failed: HTTP {test_response.status_code}")
                else:
                    self.print_test("Grafana -> Loki", "FAIL", "Loki data source not found")
        except Exception as e:
            self.print_test("Grafana -> Loki", "FAIL", str(e))
        
        success_rate = success_count / total_tests
        self.results['integration']['status'] = 'healthy' if success_rate >= 0.5 else 'unhealthy'
        self.results['integration']['tests'] = success_count
        
        return success_rate >= 0.5
    
    def test_container_metrics(self) -> bool:
        """Test if container metrics are being collected"""
        self.print_header("CONTAINER METRICS VALIDATION")
        
        try:
            # Query for container metrics
            query = "container_memory_usage_bytes"
            response = requests.get(f"{self.prometheus_url}/api/v1/query", 
                                  params={'query': query}, timeout=5)
            
            if response.status_code == 200:
                result = response.json()
                if result['status'] == 'success':
                    metrics = result['data']['result']
                    container_count = len(metrics)
                    
                    if container_count > 0:
                        self.print_test("Container Metrics Collection", "PASS", 
                                      f"{container_count} containers monitored")
                        
                        # Show some containers
                        for metric in metrics[:5]:
                            container_name = metric['metric'].get('name', 'unknown')
                            value = metric['value'][1]
                            memory_mb = int(float(value)) / 1024 / 1024
                            print(f"     🐳 {container_name}: {memory_mb:.1f} MB")
                        
                        return True
                    else:
                        self.print_test("Container Metrics Collection", "FAIL", "No container metrics found")
                        return False
                else:
                    self.print_test("Container Metrics Collection", "FAIL", f"Query failed: {result.get('error', 'Unknown')}")
                    return False
            else:
                self.print_test("Container Metrics Collection", "FAIL", f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.print_test("Container Metrics Collection", "FAIL", str(e))
            return False
    
    def generate_summary_report(self, container_metrics_ok: bool):
        """Generate and display summary report"""
        self.print_header("MONITORING STACK SUMMARY")
        
        # Overall health assessment
        healthy_core_services = sum(1 for service in self.results.values() if service['status'] == 'healthy')
        healthy_services = healthy_core_services + int(container_metrics_ok)
        total_services = len(self.results) + 1
        overall_health = "HEALTHY" if healthy_core_services >= 3 and container_metrics_ok else "DEGRADED" if healthy_core_services >= 2 else "UNHEALTHY"
        
        health_icon = "✅" if overall_health == "HEALTHY" else "⚠️" if overall_health == "DEGRADED" else "❌"
        print(f"{health_icon} Overall Status: {overall_health} ({healthy_services}/{total_services} services healthy)")
        
        # Service breakdown
        print(f"\n📋 Service Status Breakdown:")
        for service_name, service_data in self.results.items():
            status = service_data['status']
            tests = service_data.get('tests', 0)
            status_icon = "✅" if status == "healthy" else "❌"
            print(f"   {status_icon} {service_name.title():<15} {status.upper():<10} ({tests} tests)")
        metrics_status = "HEALTHY" if container_metrics_ok else "UNHEALTHY"
        metrics_icon = "✅" if container_metrics_ok else "❌"
        print(f"   {metrics_icon} {'Container Metrics':<15} {metrics_status:<10} (1 test)")
        
        # Recommendations
        print(f"\n💡 Recommendations:")
        
        if self.results['prometheus']['status'] != 'healthy':
            print("   🔧 Fix Prometheus configuration and target discovery")
        
        if self.results['loki']['status'] != 'healthy':
            print("   🔧 Check Loki log ingestion and Promtail configuration")
        
        if self.results['grafana']['status'] != 'healthy':
            print("   🔧 Verify Grafana setup and data source configuration")
        
        if self.results['integration']['status'] != 'healthy':
            print("   🔧 Test data source connectivity from Grafana admin panel")

        if not container_metrics_ok:
            print("   🔧 Check container metrics collection")
        
        if overall_health == "HEALTHY":
            print("   🎉 Monitoring stack is fully operational!")
            print("   📊 Ready for dashboard deployment and monitoring")
        
        return overall_health == "HEALTHY"
    
    def run_full_validation(self) -> bool:
        """Run complete monitoring stack validation"""
        print("🚀 Starting HomelabARR CLI Monitoring Stack Validation")
        print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Run all tests
        self.test_prometheus()
        self.test_loki()
        self.test_grafana()
        self.test_data_source_connectivity()
        
        # Additional tests
        container_metrics_ok = self.test_container_metrics()
        
        # Generate summary
        stack_healthy = self.generate_summary_report(container_metrics_ok)
        
        print(f"\n🏁 Validation Complete")
        return stack_healthy

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Validate HomelabARR CLI monitoring stack')
    parser.add_argument('--prometheus-url', default='http://localhost:9090',
                      help='Prometheus URL (default: http://localhost:9090)')
    parser.add_argument('--grafana-url', default='http://localhost:3000',
                      help='Grafana URL (default: http://localhost:3000)')
    parser.add_argument('--loki-url', default='http://localhost:3100',
                      help='Loki URL (default: http://localhost:3100)')
    parser.add_argument('--grafana-user', default='admin',
                      help='Grafana username (default: admin)')
    parser.add_argument('--grafana-password', default='admin',
                      help='Grafana password (default: admin)')
    
    args = parser.parse_args()
    
    # Create validator
    validator = MonitoringStackValidator(
        prometheus_url=args.prometheus_url,
        grafana_url=args.grafana_url,
        loki_url=args.loki_url
    )
    
    # Set credentials
    validator.grafana_user = args.grafana_user
    validator.grafana_password = args.grafana_password
    
    # Run validation
    success = validator.run_full_validation()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
