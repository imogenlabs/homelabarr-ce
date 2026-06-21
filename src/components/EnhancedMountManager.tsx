import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  DollarSign, 
  Activity, 
  Settings, 
  BarChart3,
  Gauge,
  HardDrive,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  // Plus,
  Shield
} from 'lucide-react';
import { RcloneAuthWizard } from './RcloneAuthWizard';

interface EnhancedMountStats {
  providers: Record<string, { enabled: boolean; status: string; quota?: string }>;
  costs: {
    monthly: number;
    budget: number;
    current_provider: string;
  };
  performance: {
    upload_speed: string;
    download_speed: string;
    cache_usage: string;
    active_transfers: number;
  };
  mounts: {
    unionfs: boolean;
    rclone: boolean;
  };
}

interface Props {
  containerId: string;
  containerName: string;
}

export const EnhancedMountManager: React.FC<Props> = ({ containerId, containerName }) => {
  const [stats, setStats] = useState<EnhancedMountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'costs' | 'performance'>('overview');
  const [authWizardOpen, setAuthWizardOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const fetchEnhancedMountStats = async () => {
    try {
      // Call the backend API which proxies to the container
      const response = await fetch(`/api/enhanced-mount/${containerId}/status`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        } else {
          throw new Error(result.error || 'Failed to fetch status');
        }
      } else {
        throw new Error(`API returned ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch enhanced mount stats:', error);
      // Fallback to mock data for development
      setStats({
        providers: {
          gdrive: { enabled: true, status: 'connected', quota: '750GB/day' },
          backblaze: { enabled: false, status: 'disabled' },
          onedrive: { enabled: false, status: 'disabled' },
          pcloud: { enabled: false, status: 'disabled' }
        },
        costs: {
          monthly: 12.50,
          budget: 50,
          current_provider: 'gdrive'
        },
        performance: {
          upload_speed: '45 MB/s',
          download_speed: '120 MB/s',
          cache_usage: '85.2GB / 100GB',
          active_transfers: 3
        },
        mounts: {
          unionfs: true,
          rclone: true
        }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount; setState runs after await, not synchronously
    fetchEnhancedMountStats();
    const interval = setInterval(fetchEnhancedMountStats, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [containerId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'disabled':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Mount Status */}
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Mount Status</h4>
          <HardDrive className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs">UnionFS</span>
            {stats?.mounts.unionfs ? 
              <CheckCircle className="w-3 h-3 text-green-500" /> : 
              <XCircle className="w-3 h-3 text-red-500" />
            }
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Rclone</span>
            {stats?.mounts.rclone ? 
              <CheckCircle className="w-3 h-3 text-green-500" /> : 
              <XCircle className="w-3 h-3 text-red-500" />
            }
          </div>
        </div>
      </div>

      {/* Cost Tracking */}
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Cost</h4>
          <DollarSign className="w-4 h-4 text-green-500" />
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          ${stats?.costs.monthly.toFixed(2)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          of ${stats?.costs.budget} budget
        </div>
        <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
          <div 
            className="bg-green-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((stats?.costs.monthly || 0) / (stats?.costs.budget || 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Active Transfers */}
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Transfers</h4>
          <Activity className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {stats?.performance.active_transfers || 0}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          ↑ {stats?.performance.upload_speed} ↓ {stats?.performance.download_speed}
        </div>
      </div>

      {/* Cache Usage */}
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Cache Usage</h4>
          <Gauge className="w-4 h-4 text-orange-500" />
        </div>
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {stats?.performance.cache_usage}
        </div>
        <div className="w-full bg-secondary rounded-full h-1.5 mt-2">
          <div className="bg-orange-500 h-1.5 rounded-full w-4/5 transition-all" />
        </div>
      </div>
    </div>
  );

  const handleSetupProvider = (providerId: string) => {
    setSelectedProvider(providerId);
    setAuthWizardOpen(true);
  };

  const handleAuthComplete = (credentials: unknown) => {
    console.log('Auth completed:', credentials);
    // Refresh stats to show updated provider status
    fetchEnhancedMountStats();
  };

  const getProviderDisplayName = (key: string) => {
    const names: Record<string, string> = {
      gdrive: 'Google Drive',
      onedrive: 'Microsoft OneDrive',
      dropbox: 'Dropbox',
      box: 'Box',
      pcloud: 'pCloud',
      amazon_s3: 'Amazon S3',
      google_cloud: 'Google Cloud Storage',
      azure_blob: 'Azure Blob Storage',
      azure_files: 'Azure Files',
      backblaze: 'Backblaze B2',
      mega: 'MEGA',
      yandex: 'Yandex Disk',
      jottacloud: 'JottaCloud',
      koofr: 'Koofr',
      seafile: 'Seafile',
      webdav: 'WebDAV',
      sftp: 'SFTP',
      ftp: 'FTP'
    };
    return names[key] || key.replace('_', ' ').toUpperCase();
  };

  const getProviderIcon = (key: string) => {
    const icons: Record<string, string> = {
      gdrive: '🔵',
      onedrive: '🔵',
      dropbox: '🔵',
      box: '🔵',
      pcloud: '🟢',
      amazon_s3: '🟠',
      google_cloud: '🔵',
      azure_blob: '🔵',
      azure_files: '🔵',
      backblaze: '🔴',
      mega: '🔴',
      yandex: '🟡',
      jottacloud: '🟢',
      koofr: '🟢',
      seafile: '🔵',
      webdav: '🌐',
      sftp: '🔒',
      ftp: '📁'
    };
    return icons[key] || '☁️';
  };

  const renderProviders = () => (
    <div className="space-y-4">
      {Object.entries(stats?.providers || {}).map(([key, provider]) => (
        <div key={key} className="bg-card p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{getProviderIcon(key)}</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {getProviderDisplayName(key)}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {provider.quota || 'No quota limit'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(provider.status)}
                <span className="text-sm capitalize">{provider.status}</span>
              </div>
              {provider.status === 'disabled' || provider.status === 'error' ? (
                <button
                  onClick={() => handleSetupProvider(key)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  <Shield className="w-4 h-4" />
                  <span>Setup</span>
                </button>
              ) : (
                <button
                  onClick={() => handleSetupProvider(key)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-accent"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configure</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCosts = () => (
    <div className="space-y-6">
      {/* Cost Overview */}
      <div className="bg-card p-6 rounded-lg border">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Cost Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${stats?.costs.monthly.toFixed(2)}</div>
            <div className="text-sm text-gray-500">This Month</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">${stats?.costs.budget.toFixed(2)}</div>
            <div className="text-sm text-gray-500">Monthly Budget</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              ${((stats?.costs.budget || 0) - (stats?.costs.monthly || 0)).toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Remaining</div>
          </div>
        </div>
      </div>

      {/* Provider Costs */}
      <div className="bg-card p-6 rounded-lg border">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Provider Breakdown</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span>Google Drive</span>
            <span className="font-medium">${(stats?.costs?.monthly ? stats.costs.monthly * 0.8 : 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Backblaze B2</span>
            <span className="font-medium">${(stats?.costs?.monthly ? stats.costs.monthly * 0.2 : 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transfer Speeds */}
        <div className="bg-card p-6 rounded-lg border">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Transfer Speeds</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-green-500" />
                <span>Upload</span>
              </div>
              <span className="font-medium">{stats?.performance.upload_speed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4 text-muted-foreground" />
                <span>Download</span>
              </div>
              <span className="font-medium">{stats?.performance.download_speed}</span>
            </div>
          </div>
        </div>

        {/* Cache Performance */}
        <div className="bg-card p-6 rounded-lg border">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Cache Performance</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span>Usage</span>
                <span className="font-medium">{stats?.performance.cache_usage}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full w-4/5 transition-all" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-card p-6 rounded-lg border">
        <div className="flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Loading enhanced mount statistics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Enhanced Cloud Mount - {containerName}
        </h3>
        <button
          onClick={fetchEnhancedMountStats}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'providers', label: 'Providers', icon: Cloud },
            { id: 'costs', label: 'Costs', icon: DollarSign },
            { id: 'performance', label: 'Performance', icon: Activity }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'providers' && renderProviders()}
        {activeTab === 'costs' && renderCosts()}
        {activeTab === 'performance' && renderPerformance()}
      </div>

      {/* Rclone Auth Wizard */}
      <RcloneAuthWizard
        isOpen={authWizardOpen}
        onClose={() => setAuthWizardOpen(false)}
        containerId={containerId}
        provider={selectedProvider}
        onComplete={handleAuthComplete}
      />
    </div>
  );
};