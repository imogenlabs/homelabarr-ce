import React, { useState, useEffect, useCallback } from 'react';
import { AppTemplate, CLIApplication, DeployedApp, DeploymentMode } from './types';
import { DISPLAY_CATEGORIES, getDisplayCategoryId, getAppIcon, getDisplayCategory } from './data/app-metadata';
import { AppCard } from './components/AppCard';
import { Search, ArrowUpDown } from 'lucide-react';
import { DeployedAppCard } from './components/DeployedAppCard';
import { DeployModal } from './components/DeployModal';
import { DeploymentProgressModal } from './components/DeploymentProgressModal';
import { LogViewer } from './components/LogViewer';
import { ThemeToggle } from './components/ThemeToggle';
import { HelpModal } from './components/HelpModal';
import { PortManager } from './components/PortManager';
import { EnhancedMountManager } from './components/EnhancedMountManager';
import { EnhancedMountOnboarding } from './components/EnhancedMountOnboarding';
import { useNotifications } from './contexts/NotificationContext';
import { useLoading } from './hooks/useLoading';
import { useAuth } from './contexts/AuthContext';
import { LoginModal } from './components/LoginModal';
import { ApiKeysModal } from './components/ApiKeysModal';
import { UserMenu } from './components/UserMenu';
import { UserSettings } from './components/UserSettings';
import {
  Network,
  Box,
  HelpCircle,
  RefreshCw,
  Package,
  Search as SearchIcon,
  Star,
} from 'lucide-react';
import { deployApp, getContainers, getApplicationCatalog, getDeploymentModes, getStars, starApp, unstarApp } from './lib/api';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Tab type encompasses display categories + special views
type TabId = string; // display category ids, 'deployed', 'all-apps'

// Build category tabs from DISPLAY_CATEGORIES + special views
const baseCategoryTabs = [
  { id: 'deployed', name: 'Deployed Apps', icon: Box },
  ...DISPLAY_CATEGORIES.map(dc => ({
    id: dc.id,
    name: dc.name,
    icon: dc.icon,
  })),
  { id: 'all-apps', name: 'All Apps', icon: SearchIcon },
];

// Convert a CLIApplication to an AppTemplate for rendering in AppCard and DeployModal
function cliAppToTemplate(app: CLIApplication): AppTemplate {
  const icon = getAppIcon(app.name, app.category);
  const displayCatId = getDisplayCategoryId(app.category);

  const modes: ('traefik' | 'authelia' | 'local')[] = ['local'];
  if (app.requiresTraefik) modes.unshift('traefik');
  if (app.requiresAuthelia) modes.unshift('authelia');

  return {
    id: app.id, // "category-name" format from CLI
    name: app.displayName,
    description: app.description,
    category: displayCatId as any,
    logo: icon,
    deploymentModes: modes,
    defaultPorts: app.ports,
    requiredPorts: Object.keys(app.ports),
    // Store CLI data for deploy modal enrichment
    _cliApp: app,
  } as AppTemplate & { _cliApp: CLIApplication };
}

export default function App() {
  const [cliApps, setCliApps] = useState<CLIApplication[]>([]);
  const [cliDeploymentModes, setCliDeploymentModes] = useState<DeploymentMode[]>([]);
  const [catalogSource, setCatalogSource] = useState<'cli' | 'templates'>('templates');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [selectedApp, setSelectedApp] = useState<AppTemplate | null>(null);
  const [deployedApps, setDeployedApps] = useState<DeployedApp[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<TabId>('all-apps');
  const [sortField, setSortField] = useState<'name' | 'status' | 'deployedAt' | 'uptime'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [catalogSort, setCatalogSort] = useState<'asc' | 'desc'>('asc');
  const [selectedContainerLogs, setSelectedContainerLogs] = useState<string | null>(null);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [portManagerOpen, setPortManagerOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [apiKeysModalOpen, setApiKeysModalOpen] = useState(false);
  const [selectedEnhancedMount, setSelectedEnhancedMount] = useState<{ containerId: string; containerName: string } | null>(null);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [pendingDeployment, setPendingDeployment] = useState<{ app: AppTemplate; config: Record<string, string>; mode: DeploymentMode } | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState<{
    deploymentId: string;
    appId: string;
  } | null>(null);

  const [starredApps, setStarredApps] = useState<Set<string>>(new Set());

  const { success, error: showError, info } = useNotifications();
  const { loading: deploymentInProgress } = useLoading();
  const { isAuthenticated } = useAuth();

  // Fetch CLI application catalog on mount
  const loadCatalog = useCallback(async () => {
    try {
      setCatalogLoading(true);
      setCatalogError(null);
      const [catalogData, modesData] = await Promise.all([
        getApplicationCatalog(),
        getDeploymentModes(),
      ]);

      const allApps: CLIApplication[] = [];
      if (catalogData.applications) {
        Object.entries(catalogData.applications).forEach(([category, apps]) => {
          (apps as CLIApplication[]).forEach(app => {
            allApps.push({ ...app, category });
          });
        });
      }
      setCliApps(allApps);
      setCliDeploymentModes(modesData.modes || []);
      setCatalogSource(catalogData.source || 'templates');
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Fetch starred apps when authenticated
  useEffect(() => {
    if (!isAuthenticated) { setStarredApps(new Set()); return; }
    getStars().then(data => setStarredApps(new Set(data.stars))).catch(() => {});
  }, [isAuthenticated]);

  const handleToggleStar = useCallback(async (appId: string) => {
    const wasStarred = starredApps.has(appId);
    // Optimistic update
    setStarredApps(prev => {
      const next = new Set(prev);
      wasStarred ? next.delete(appId) : next.add(appId);
      return next;
    });
    try {
      const data = wasStarred ? await unstarApp(appId) : await starApp(appId);
      setStarredApps(new Set(data.stars));
    } catch {
      // Rollback
      setStarredApps(prev => {
        const next = new Set(prev);
        wasStarred ? next.add(appId) : next.delete(appId);
        return next;
      });
    }
  }, [starredApps]);

  // Convert all CLI apps to AppTemplates
  const allAppTemplates = React.useMemo(() => {
    return cliApps.map(cliAppToTemplate);
  }, [cliApps]);

  // Filter apps based on active category and search
  const filteredApps = React.useMemo(() => {
    let apps = allAppTemplates;

    // Category filter
    if (activeCategory === 'starred') {
      apps = apps.filter(app => {
        const cliApp = (app as any)._cliApp as CLIApplication;
        return starredApps.has(cliApp?.id || app.name);
      });
    } else if (activeCategory !== 'all-apps' && activeCategory !== 'deployed') {
      const displayCat = getDisplayCategory(activeCategory);
      if (displayCat) {
        apps = apps.filter(app => {
          const cliApp = (app as any)._cliApp as CLIApplication;
          return displayCat.cliCategories.includes(cliApp.category);
        });
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      apps = apps.filter(app => {
        const cliApp = (app as any)._cliApp as CLIApplication;
        return (
          app.name.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q) ||
          cliApp.category.toLowerCase().includes(q) ||
          cliApp.image.toLowerCase().includes(q)
        );
      });
    }

    return apps;
  }, [allAppTemplates, activeCategory, searchQuery, starredApps]);

  // Build tabs dynamically — include Starred only when user has stars
  const categoryTabs = React.useMemo(() => {
    if (starredApps.size === 0) return baseCategoryTabs;
    return [
      baseCategoryTabs[0], // Deployed
      { id: 'starred', name: 'Starred', icon: Star },
      ...baseCategoryTabs.slice(1),
    ];
  }, [starredApps.size]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchContainers(false);
    const basicInterval = setInterval(() => fetchContainers(false), 10000);
    const statsInterval = setInterval(() => {
      if (activeCategory === 'deployed') {
        fetchContainers(true);
      }
    }, 30000);
    return () => {
      clearInterval(basicInterval);
      clearInterval(statsInterval);
    };
  }, [activeCategory, isAuthenticated]);

  useEffect(() => {
    if (activeCategory === 'deployed' && deployedApps.length === 0) {
      info('No Deployed Apps', 'Deploy some applications to see them here. Browse the categories above to get started!');
    }
  }, [activeCategory, deployedApps.length]);

  const fetchContainers = async (includeStats = false) => {
    try {
      const response = await getContainers(includeStats);
      const containers = response.containers;
      const apps = containers.map((container: any) => {
        let deployedAt;
        try {
          const created = container.Created;
          deployedAt = typeof created === 'number'
            ? new Date(created * 1000).toISOString()
            : new Date(created).toISOString();
        } catch {
          deployedAt = new Date().toISOString();
        }
        const portStr = typeof container.Ports === 'string' ? container.Ports : '';
        const portMatch = portStr.match(/:(\d+)->/);
        return {
          id: container.Id,
          name: (container.Names?.[0] || container.Names || '').replace('/', ''),
          status: container.State,
          deployedAt,
          url: portMatch ? `http://localhost:${portMatch[1]}` : '',
          stats: container.stats
        };
      });
      setDeployedApps(apps);
    } catch (err) {
      console.warn('Container fetch failed:', err);
    }
  };

  const handleDeploy = async (appId: string, config: Record<string, string>, mode: DeploymentMode) => {
    info('Deployment Started', `Deploying ${appId} via HomelabARR CLI...`);

    try {
      const result = await deployApp(appId, config, mode);

      if (result.source === 'cli-streaming') {
        info('Real-time Deployment', `${appId} deployment started with live progress tracking`);
        if (result.deploymentId) {
          setDeploymentProgress({
            deploymentId: result.deploymentId as string,
            appId: result.appId as string,
          });
        }
        setSelectedApp(null);
        return result;
      } else {
        await fetchContainers();
        success('Deployment Successful', `${appId} has been deployed successfully!`);
        setSelectedApp(null);
        setActiveCategory('deployed');
        return result;
      }
    } catch (err: any) {
      let errorTitle = 'Deployment Failed';
      let errorMessage = 'Failed to deploy application';

      if (err.message.includes('CLI Bridge not available')) {
        errorTitle = 'CLI Integration Unavailable';
        errorMessage = 'HomelabARR CLI integration is not available. Please ensure the CLI is properly installed.';
      } else if (err.message.includes('Port conflict')) {
        errorTitle = 'Port Conflict';
        errorMessage = 'The required ports are already in use. Please stop conflicting containers or choose different ports.';
      } else if (err.message.includes('Application not found')) {
        errorTitle = 'Application Not Found';
        errorMessage = 'This application is not available in the CLI. Please try a different application.';
      } else if (err.message.includes('Docker not available') || err.message.includes('Docker daemon')) {
        errorTitle = 'Docker Unavailable';
        errorMessage = 'Docker is not running or accessible. Please ensure Docker is started and try again.';
      } else {
        errorMessage = err.message;
      }

      showError(errorTitle, errorMessage);
      throw err;
    }
  };

  const handleAppCardDeploy = (app: AppTemplate) => {
    // Enhanced mount onboarding check
    const cliApp = (app as any)._cliApp as CLIApplication | undefined;
    if (cliApp && cliApp.name === 'mount-enhanced') {
      setSelectedApp(app);
      return;
    }
    setSelectedApp(app);
  };

  const handleDeploySubmit = async (appId: string, config: Record<string, string>, mode: DeploymentMode) => {
    if (!selectedApp) return;

    // Enhanced mount onboarding
    if (appId.includes('mount-enhanced')) {
      setPendingDeployment({ app: selectedApp, config, mode });
      setOnboardingModalOpen(true);
      setSelectedApp(null);
      return;
    }

    setSelectedApp(null);
    await handleDeploy(appId, config, mode);
  };

  const handleOnboardingProceed = async () => {
    setOnboardingModalOpen(false);
    if (!pendingDeployment) return;
    const { app, config, mode } = pendingDeployment;
    setPendingDeployment(null);
    await handleDeploy(app.id, config, mode);
  };

  const handleOnboardingCancel = () => {
    setOnboardingModalOpen(false);
    setPendingDeployment(null);
  };

  const handleDeploymentComplete = async (completionSuccess: boolean, _summary?: any) => {
    setDeploymentProgress(null);
    if (completionSuccess) {
      await fetchContainers();
      success('Deployment Successful', 'Container is running. Check the Deployed Apps tab.');
      setActiveCategory('deployed');
    } else {
      showError('Deployment Failed', 'Check container logs for details.');
    }
  };

  const handleCloseProgress = () => {
    setDeploymentProgress(null);
  };

  const sortedDeployedApps = [...deployedApps].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name':
        return direction * a.name.localeCompare(b.name);
      case 'status':
        return direction * a.status.localeCompare(b.status);
      case 'deployedAt':
        return direction * (new Date(a.deployedAt).getTime() - new Date(b.deployedAt).getTime());
      case 'uptime':
        const aUptime = a.stats?.uptime || 0;
        const bUptime = b.stats?.uptime || 0;
        return direction * (aUptime - bUptime);
      default:
        return 0;
    }
  });

  // Build config fields for the deploy modal from CLI app data
  const buildConfigFields = (app: AppTemplate) => {
    const cliApp = (app as any)._cliApp as CLIApplication | undefined;
    const fields: any[] = [
      {
        name: 'containerName',
        label: 'Container Name',
        type: 'text' as const,
        required: false,
        placeholder: cliApp?.name || 'auto',
        defaultValue: '',
      },
      {
        name: 'domain',
        label: 'Domain',
        type: 'text' as const,
        required: false,
        placeholder: 'yourdomain.com — no https:// needed',
        defaultValue: '',
        trafikOnly: true,
        helpText: 'Just the domain (e.g. mjashley.com). Apps will be accessible at appname.yourdomain.com',
      },
    ];

    if (cliApp?.environment) {
      Object.entries(cliApp.environment).forEach(([key, value]) => {
        fields.push({
          name: key.toLowerCase(),
          label: key.replace(/_/g, ' '),
          type: 'text' as const,
          required: false,
          defaultValue: String(value),
          advanced: true,
        });
      });
    }

    if (cliApp?.ports) {
      Object.entries(cliApp.ports).forEach(([key, value]) => {
        fields.push({
          name: `port_${key}`,
          label: `Port: ${key}`,
          type: 'text' as const,
          required: false,
          defaultValue: String(value),
          advanced: true,
        });
      });
    }

    return fields;
  };

  const renderContent = () => {

    if (activeCategory === 'deployed') {
      const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
          setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
          setSortField(field);
          setSortDirection('asc');
        }
      };

      return (
        <div>
          <div className="mb-4 flex flex-wrap gap-2 justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sortField === 'name' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handleSort('name')}
                className={sortField === 'name' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' : ''}
              >
                Name
                {sortField === 'name' && (
                  <ArrowUpDown className={`w-4 h-4 ml-1 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                )}
              </Button>
              <Button
                variant={sortField === 'status' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handleSort('status')}
                className={sortField === 'status' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' : ''}
              >
                Status
                {sortField === 'status' && (
                  <ArrowUpDown className={`w-4 h-4 ml-1 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                )}
              </Button>
              <Button
                variant={sortField === 'deployedAt' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handleSort('deployedAt')}
                className={sortField === 'deployedAt' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' : ''}
              >
                Deployment Date
                {sortField === 'deployedAt' && (
                  <ArrowUpDown className={`w-4 h-4 ml-1 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                )}
              </Button>
              <Button
                variant={sortField === 'uptime' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handleSort('uptime')}
                className={sortField === 'uptime' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' : ''}
              >
                Uptime
                {sortField === 'uptime' && (
                  <ArrowUpDown className={`w-4 h-4 ml-1 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                )}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                info('Refreshing Statistics', 'Updating container statistics...');
                fetchContainers(true);
              }}
              className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-800"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh Stats
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedDeployedApps.map(app => {
              const isEnhancedMount = app.name.includes('homelabarr-mount-enhanced') ||
                                    app.name.includes('enhanced-mount') ||
                                    app.name.includes('mount-enhanced');
              return (
                <div key={app.id} className="space-y-2">
                  <DeployedAppCard
                    app={app}
                    onViewLogs={() => setSelectedContainerLogs(app.id)}
                    onRefresh={fetchContainers}
                  />
                  {isEnhancedMount && (
                    <Button
                      onClick={() => setSelectedEnhancedMount({
                        containerId: app.id,
                        containerName: app.name
                      })}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Enhanced Mount Dashboard
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Loading state for catalog
    if (catalogLoading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading applications...</span>
        </div>
      );
    }

    // Error state
    if (catalogError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center">
            <Package className="h-6 w-6 text-red-600 dark:text-red-400" />
            <div className="ml-3">
              <h3 className="text-red-800 dark:text-red-200 font-medium">Failed to load applications</h3>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{catalogError}</p>
              <Button variant="link" onClick={loadCatalog} className="mt-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 px-0">
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Category header
    const displayCat = getDisplayCategory(activeCategory);
    const currentCategoryInfo = activeCategory === 'all-apps'
      ? { name: 'All Apps', description: 'Complete list of all available applications', icon: SearchIcon }
      : displayCat
        ? { name: displayCat.name, description: displayCat.description, icon: displayCat.icon }
        : null;

    return (
      <div>
        {/* Category Header */}
        {!searchQuery && currentCategoryInfo && (
          <div className="mb-6 p-6 bg-white dark:bg-[hsl(222,28%,10%)] rounded-lg border border-gray-200 dark:border-white/[0.08] shadow-sm dark:shadow-black/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <currentCategoryInfo.icon className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {currentCategoryInfo.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {currentCategoryInfo.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600">{filteredApps.length}</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">applications</p>
              </div>
            </div>
          </div>
        )}

        {/* Search Results Header */}
        {searchQuery && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Search Results for "{searchQuery}"
                </h2>
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  Found {filteredApps.length} applications matching your search
                </p>
              </div>
              <Button
                variant="link"
                onClick={() => setSearchQuery('')}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 px-0"
              >
                Clear search
              </Button>
            </div>
          </div>
        )}

        {/* Sort Control */}
        {filteredApps.length > 1 && (
          <div className="flex items-center justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCatalogSort(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-white/[0.15] hover:bg-gray-100 dark:hover:bg-white/[0.05]"
            >
              <ArrowUpDown className="w-4 h-4 mr-1.5" />
              {catalogSort === 'asc' ? 'A → Z' : 'Z → A'}
            </Button>
          </div>
        )}

        {/* Apps Grid */}
        {filteredApps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...filteredApps].sort((a, b) => {
              const cmp = a.name.localeCompare(b.name);
              return catalogSort === 'asc' ? cmp : -cmp;
            }).map(app => (
              <AppCard
                key={app.id}
                app={app}
                onDeploy={() => handleAppCardDeploy(app)}
                starred={starredApps.has((app as any)._cliApp?.id || app.name)}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No results found' : 'No applications in this category'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'Try different keywords or browse categories above'
                : 'Select a different category to see available applications'
              }
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[hsl(222,30%,8%)]/80 backdrop-blur-xl shadow-sm dark:shadow-black/20 border-b border-gray-200/50 dark:border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-5 flex flex-wrap md:flex-nowrap justify-between items-center gap-2">
          <div className="flex items-center gap-2 md:gap-3 order-1 md:order-none">
            <img src="/octopus.png" alt="" className="h-20 w-20 md:h-24 md:w-24 object-contain flex-shrink-0" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Homelab<span className="bg-gradient-to-r from-indigo-500 to-blue-600 bg-clip-text text-transparent">ARR</span></h1>
            {/* Connection status indicator */}
            {!catalogLoading && (
              <span className={`inline-flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs font-medium px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full ${
                catalogSource === 'cli'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  catalogSource === 'cli' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                {catalogSource === 'cli' ? `Connected · ${cliApps.length} apps` : 'Browse Mode'}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 md:space-x-4 order-2 md:order-none">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPortManagerOpen(true)}
              aria-label="Port Manager"
              title="Manage Ports"
            >
              <Network className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHelpModalOpen(true)}
              aria-label="Help"
            >
              <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Button>
            <ThemeToggle />

            {isAuthenticated ? (
              <UserMenu onOpenSettings={() => setSettingsModalOpen(true)} onOpenApiKeys={() => setApiKeysModalOpen(true)} />
            ) : (
              <Button
                onClick={() => setLoginModalOpen(true)}
                className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-md shadow-indigo-500/20 text-sm md:text-base px-3 md:px-4 py-1.5 md:py-2"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[calc(100vh-80px)]">

        {/* Status banner removed — indicator now in header */}

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-indigo-400" />
          </div>
          <Input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-auto w-full pl-12 pr-24 py-4 bg-white dark:bg-[hsl(222,28%,10%)] rounded-2xl border-gray-200 dark:border-white/[0.08] shadow-sm hover:shadow-md focus-visible:shadow-lg focus-visible:shadow-indigo-500/10 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 dark:focus-visible:border-indigo-500 transition-all duration-200 text-base"
          />
          {searchQuery && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <span className="text-sm font-medium text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg">
                {filteredApps.length} results
              </span>
            </div>
          )}
        </div>

        {/* Category Navigation */}
        <div className="mb-10">
          <Tabs value={activeCategory} onValueChange={(val) => setActiveCategory(val as TabId)}>
            <TabsList className="flex flex-nowrap gap-2 h-auto bg-transparent px-4 py-2 w-full overflow-x-auto md:flex-wrap md:overflow-x-visible scrollbar-hide snap-x snap-mandatory md:snap-none justify-start">
              {categoryTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeCategory === tab.id;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "flex items-center whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border snap-start shrink-0",
                      isActive
                        ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25 border-transparent ring-0"
                        : "border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[hsl(222,28%,10%)] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[hsl(222,28%,13%)] hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2 shrink-0" />
                    {tab.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content Area */}
        {renderContent()}

        {/* Deploy Modal */}
        {selectedApp && (
          <DeployModal
            app={{
              ...selectedApp,
              configFields: buildConfigFields(selectedApp),
              deploymentModes: selectedApp.deploymentModes || ['local'],
            }}
            isOpen={true}
            onClose={() => setSelectedApp(null)}
            onDeploy={handleDeploySubmit}
            loading={deploymentInProgress}
            deploymentModes={cliDeploymentModes}
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

        {/* Logs Modal */}
        {selectedContainerLogs && (
          <LogViewer
            containerId={selectedContainerLogs}
            onClose={() => setSelectedContainerLogs(null)}
          />
        )}

        {/* Port Manager Modal */}
        <PortManager isOpen={portManagerOpen} onClose={() => setPortManagerOpen(false)} />

        {/* Login Modal */}
        <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
        <ApiKeysModal isOpen={apiKeysModalOpen} onClose={() => setApiKeysModalOpen(false)} />

        {/* User Settings Modal */}
        <UserSettings isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />

        {/* Enhanced Mount Onboarding Modal */}
        <EnhancedMountOnboarding
          isOpen={onboardingModalOpen}
          onClose={handleOnboardingCancel}
          onProceed={handleOnboardingProceed}
        />

        {/* Enhanced Mount Manager Modal */}
        <Dialog open={!!selectedEnhancedMount} onOpenChange={(open) => { if (!open) setSelectedEnhancedMount(null); }}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enhanced Mount Dashboard</DialogTitle>
            </DialogHeader>
            {selectedEnhancedMount && (
              <EnhancedMountManager
                containerId={selectedEnhancedMount.containerId}
                containerName={selectedEnhancedMount.containerName}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Help Modal */}
        <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 dark:border-white/[0.06] bg-background/80 dark:bg-transparent py-4 px-6 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span>Built with</span>
            <span className="text-red-500">♥</span>
            <span>by</span>
            <a href="https://imogenlabs.ai" target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400/50 hover:decoration-indigo-500 transition-colors">Imogen Labs AI</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://wiki.homelabarr.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Docs</a>
            <a href="https://discord.gg/Pc7mXX786x" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Discord</a>
            <a href="https://github.com/smashingtags/homelabarr-ce" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
            <span>© 2026 HomelabARR</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
