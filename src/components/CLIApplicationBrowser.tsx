import React, { useState, useEffect } from 'react';
import { Search, Package, Layers, Server, Database, Monitor, Cog, Users, MessageSquare, Terminal, BookOpen } from 'lucide-react';
import { getApplicationCatalog, getDeploymentModes } from '../lib/api';
import { CLIApplication, ApplicationCatalog, DeploymentMode } from '../types';
import { DeployModal } from './DeployModal';
import { DeploymentProgressModal } from './DeploymentProgressModal';

interface CLIApplicationBrowserProps {
  onDeploy?: (appId: string, config: Record<string, string>, mode: DeploymentMode) => Promise<any>;
}

const categoryIcons: Record<string, React.ElementType> = {
  mediaserver: Server,
  mediamanager: Layers,
  downloadclients: Package,
  addons: Cog,
  backup: Database,
  monitoring: Monitor,
  selfhosted: Users,
  request: MessageSquare,
  system: Terminal,
  share: BookOpen,
  kasmworkspace: Server,
  encoder: Cog,
  coding: Terminal
};

const categoryDisplayNames: Record<string, string> = {
  mediaserver: 'Media Servers',
  mediamanager: 'Media Management',
  downloadclients: 'Download Clients',
  addons: 'Add-ons & Utilities',
  backup: 'Backup Solutions',
  monitoring: 'Monitoring & Analytics',
  selfhosted: 'Self-Hosted Services',
  request: 'Request Management',
  system: 'System Tools',
  share: 'File Sharing',
  kasmworkspace: 'Workspace & Desktop',
  encoder: 'Media Encoding',
  coding: 'Development Tools'
};

export function CLIApplicationBrowser({ onDeploy }: CLIApplicationBrowserProps) {
  const [catalog, setCatalog] = useState<ApplicationCatalog | null>(null);
  const [deploymentModes, setDeploymentModes] = useState<DeploymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<CLIApplication | null>(null);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState<{
    deploymentId: string;
    appId: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catalogData, modesData] = await Promise.all([
        getApplicationCatalog(),
        getDeploymentModes()
      ]);
      
      setCatalog(catalogData);
      setDeploymentModes(modesData.modes || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = () => {
    if (!catalog?.applications) return [];

    const allApps = Object.entries(catalog.applications).flatMap(([category, apps]) =>
      apps.map(app => ({ ...app, category }))
    );

    return allApps.filter(app => {
      const matchesSearch = searchTerm === '' || 
        app.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  };

  const handleDeploy = async (appId: string, config: Record<string, string>, mode: DeploymentMode) => {
    setShowDeployModal(false);
    setSelectedApp(null);
    
    if (onDeploy) {
      try {
        // Call the deployment function and handle streaming response
        const result = await onDeploy(appId, config, mode);
        
        // If we get a streaming deployment response, show progress modal
        if (result && typeof result === 'object' && 'source' in result && result.source === 'cli-streaming' && 'deploymentId' in result) {
          setDeploymentProgress({
            deploymentId: result.deploymentId as string,
            appId: result.appId as string
          });
        }
      } catch (error) {
        console.error('Deployment error:', error);
      }
    }
  };

  const handleDeploymentComplete = (success: boolean, summary?: any) => {
    console.log('Deployment completed:', { success, summary });
    // Optionally refresh data or show notification
  };

  const handleCloseProgress = () => {
    setDeploymentProgress(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading applications...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600 dark:text-red-400">
            <Package className="h-6 w-6" />
          </div>
          <div className="ml-3">
            <h3 className="text-red-800 dark:text-red-200 font-medium">Failed to load applications</h3>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-sm underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        No application catalog available
      </div>
    );
  }

  const applications = filteredApplications();
  const categories = catalog.applications ? Object.keys(catalog.applications) : [];

  return (
    <div className="space-y-6">
      {/* CLI Status Banner */}
      <div className={`p-4 rounded-lg border ${
        catalog.source === 'cli' 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      }`}>
        <div className="flex items-center">
          <Terminal className={`h-5 w-5 ${
            catalog.source === 'cli' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
          }`} />
          <div className="ml-3">
            <h3 className={`font-medium ${
              catalog.source === 'cli' ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              {catalog.source === 'cli' ? 'HomelabARR Connected' : 'Browse Mode Active'}
            </h3>
            <p className={`text-sm ${
              catalog.source === 'cli' ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {catalog.source === 'cli' 
                ? `${catalog.totalApps} proven applications available` 
                : catalog.message || 'Using browse mode'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {categoryDisplayNames[category] || category}
            </option>
          ))}
        </select>
      </div>

      {/* Application Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {applications.map((app) => {
          const IconComponent = categoryIcons[app.category] || Package;
          
          return (
            <div
              key={app.id}
              className="bg-card rounded-lg border border-border p-4 hover:shadow-md dark:hover:shadow-black/30 hover:border-muted-foreground/30 transition-all cursor-pointer"
              onClick={() => {
                setSelectedApp(app);
                setShowDeployModal(true);
              }}
            >
              <div className="flex items-center mb-3">
                <div className="p-2 bg-secondary rounded-lg">
                  <IconComponent className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {app.displayName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {categoryDisplayNames[app.category] || app.category}
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {app.description}
              </p>
              
              <div className="flex items-center justify-end text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  {app.requiresTraefik && (
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded">
                      Traefik
                    </span>
                  )}
                  {app.requiresAuthelia && (
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded">
                      Auth
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {applications.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No applications found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'No applications are available in the catalog'
            }
          </p>
        </div>
      )}

      {/* Deploy Modal */}
      {showDeployModal && selectedApp && (
        <DeployModal
          isOpen={showDeployModal}
          onClose={() => {
            setShowDeployModal(false);
            setSelectedApp(null);
          }}
          onDeploy={handleDeploy}
          app={{
            id: selectedApp.id,
            name: selectedApp.name,
            description: selectedApp.description,
            category: selectedApp.category as any,
            logo: (categoryIcons[selectedApp.category] || Package) as any,
            deploymentModes: ['local'],
            configFields: [
              {
                name: 'domain',
                label: 'Domain',
                type: 'text',
                required: true,
                placeholder: 'localhost',
                defaultValue: 'localhost'
              },
              ...Object.entries(selectedApp.environment).map(([key, value]) => ({
                name: key.toLowerCase(),
                label: key.replace(/_/g, ' '),
                type: 'text' as const,
                required: false,
                defaultValue: value,
                advanced: true
              }))
            ],
            defaultPorts: selectedApp.ports,
            requiredPorts: Object.keys(selectedApp.ports)
          }}
          deploymentModes={deploymentModes}
          cliIntegration={true}
        />
      )}

      {/* Deployment Progress Modal */}
      {deploymentProgress && (
        <DeploymentProgressModal
          isOpen={!!deploymentProgress}
          deploymentId={deploymentProgress.deploymentId}
          appId={deploymentProgress.appId}
          onComplete={handleDeploymentComplete}
          onClose={handleCloseProgress}
        />
      )}
    </div>
  );
}