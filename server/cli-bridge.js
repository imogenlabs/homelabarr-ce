import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { DeploymentLogger } from './deployment-logger.js';

/**
 * Sanitize a path component to prevent directory traversal attacks.
 * Strips .., /, \, and null bytes from user-supplied path segments.
 */
function sanitizePathComponent(input) {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/[\/\\\.]{2,}/g, '').replace(/[\/\\\0]/g, '').replace(/^\.+/, '');
}

/**
 * CLI Bridge - Connects React frontend to HomelabARR CLI system
 * Provides seamless integration with 100+ proven Docker applications
 */
export class CLIBridge {
  // Default Docker image map for template variable resolution
  static IMAGE_DEFAULTS = {
    PLEXIMAGE: 'lscr.io/linuxserver/plex:latest',
    RADARRIMAGE: 'lscr.io/linuxserver/radarr:latest',
    RADARR4KIMAGE: 'lscr.io/linuxserver/radarr:latest',
    RADARRHDRIMAGE: 'lscr.io/linuxserver/radarr:latest',
    SONARRIMAGE: 'lscr.io/linuxserver/sonarr:latest',
    SONARR4KIMAGE: 'lscr.io/linuxserver/sonarr:latest',
    SONARRHDRIMAGE: 'lscr.io/linuxserver/sonarr:latest',
    BAZARRIMAGE: 'lscr.io/linuxserver/bazarr:latest',
    BAZARR4KIMAGE: 'lscr.io/linuxserver/bazarr:latest',
    OVERSEERRIMAGE: 'lscr.io/linuxserver/overseerr:latest',
    QBITORRENTIMAGE: 'lscr.io/linuxserver/qbittorrent:latest',
    CALIBREIMAGE: 'lscr.io/linuxserver/calibre:latest',
    LIDARRIMAGE: 'lscr.io/linuxserver/lidarr:latest',
    JELLYFINIMAGE: 'lscr.io/linuxserver/jellyfin:latest',
    PROWLARRIMAGE: 'lscr.io/linuxserver/prowlarr:latest',
    PROWLARR4KIMAGE: 'lscr.io/linuxserver/prowlarr:latest',
    PROWLARRHDRIMAGE: 'lscr.io/linuxserver/prowlarr:latest',
    KOMGAIMAGE: 'lscr.io/linuxserver/komga:latest',
    SABNZBDIMAGE: 'lscr.io/linuxserver/sabnzbd:latest',
    DELUGEIMAGE: 'lscr.io/linuxserver/deluge:latest',
    PIHOLEIMAGE: 'pihole/pihole:latest',
    LAZYLIBRARIANIMAGE: 'lscr.io/linuxserver/lazylibrarian:latest',
    NZBGETIMAGE: 'lscr.io/linuxserver/nzbget:latest',
    TAUTULLIIMAGE: 'lscr.io/linuxserver/tautulli:latest',
    JACKETTIMAGE: 'lscr.io/linuxserver/jackett:latest',
    FENRUSIMAGE: 'lscr.io/linuxserver/fenrus:latest',
    EMBYIMAGE: 'lscr.io/linuxserver/emby:latest',
    READARRIMAGE: 'lscr.io/linuxserver/readarr:latest',
    PORTAINERIMAGE: 'portainer/portainer-ce:latest',
    WEBTOP_IMAGE: 'lscr.io/linuxserver/webtop:latest',
    MOUNT_ENHANCED_IMAGE: 'rclone/rclone:latest',
    RESTARTAPP: 'unless-stopped',
  };

  static resolveTemplateVar(value) {
    if (!value || typeof value !== 'string') return value;
    return value.replace(/\${([^}]+)}/g, (match, varName) => {
      return CLIBridge.IMAGE_DEFAULTS[varName] || match;
    });
  }


  constructor() {
    // Path to the main HomelabARR CLI repository
    // CLI_BRIDGE_HOST_PATH env var allows override for Docker deployments
    // where the CLI repo is mounted at a different path than the app working directory
    this.cliPath = process.env.CLI_BRIDGE_HOST_PATH || process.cwd();
    this.appsPath = path.join(this.cliPath, 'apps');
    this.scriptsPath = path.join(this.cliPath, 'scripts');
    this.traefik = path.join(this.cliPath, 'traefik');

    // Verify CLI installation
    this.verifyCLIInstallation();

    DeploymentLogger.logNetworkActivity('CLI Bridge initialized', {
      level: 'info',
      cliPath: this.cliPath,
      component: 'CLIBridge'
    });
  }

  /**
   * Verify that the HomelabARR CLI is properly installed
   */
  verifyCLIInstallation() {
    // apps/ directory is required — contains all application templates
    if (!fs.existsSync(this.appsPath)) {
      throw new Error(`HomelabARR apps directory not found at ${this.appsPath}. Set CLI_BRIDGE_HOST_PATH env var to the CLI repo root.`);
    }

    // Optional paths — warn but don't block startup
    const optionalPaths = [
      this.scriptsPath,
      path.join(this.cliPath, 'install.sh'),
      path.join(this.cliPath, 'traefik', 'install.sh')
    ];

    for (const optionalPath of optionalPaths) {
      if (!fs.existsSync(optionalPath)) {
        console.warn(`Optional CLI path not found: ${optionalPath}`);
      }
    }
  }

  /**
   * Get all available applications from the CLI
   * Scans the apps/ directory for .yml files and categorizes them
   */
  async getAvailableApplications() {
    const applications = {};
    
    try {
      // Only scan specific HomelabARR application directories
      // This prevents duplicates from local-mode-apps and other test directories
      const allowedCategories = [
        'ai',
        'backup',
        'downloads',
        'media-management',
        'media-servers',
        'monitoring',
        'myapps',
        'self-hosted',
        'system',
        'transcoding',
        'virtual-desktops'
      ];

      for (const category of allowedCategories) {
        const categoryPath = path.join(this.appsPath, category);
        
        // Skip if category doesn't exist
        if (!fs.existsSync(categoryPath)) {
          continue;
        }
        
        applications[category] = [];

        const files = fs.readdirSync(categoryPath)
          .filter(file => file.endsWith('.yml') && file !== 'install.sh');

        for (const file of files) {
          const appPath = path.join(categoryPath, file);
          const appConfig = await this.parseApplicationConfig(appPath, category);
          if (appConfig) {
            applications[category].push(appConfig);
          }
        }
      }

      DeploymentLogger.logNetworkActivity('Application catalog loaded', {
        level: 'info',
        totalApps: Object.values(applications).flat().length,
        categories: Object.keys(applications).length,
        component: 'CLIBridge'
      });

      return applications;
    } catch (error) {
      DeploymentLogger.logDockerOperationFailed('getAvailableApplications', error, {
        suggestion: 'Verify CLI installation and file permissions'
      });
      throw error;
    }
  }

  /**
   * Parse individual application configuration from YAML
   */
  /**
   * Resolve ${VAR} template variables in a string using default environment values.
   * This prevents raw template variables from appearing on the dashboard.
   */
  resolveTemplateVar(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return CLIBridge.ENV_DEFAULTS[varName] || match;
    });
  }

  async parseApplicationConfig(filePath, category) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const config = yaml.parse(fileContent);
      
      if (!config.services) {
        return null;
      }

      const serviceName = Object.keys(config.services)[0];
      const service = config.services[serviceName];
      
      const appName = path.basename(filePath, '.yml');
      
      return {
        id: `${category}-${appName}`,
        name: appName,
        displayName: this.formatDisplayName(appName),
        category: category,
        description: this.extractDescription(service),
        image: CLIBridge.resolveTemplateVar(service.image) || 'Unknown',
        ports: this.extractPorts(service),
        environment: this.extractEnvironmentVars(service),
        volumes: this.extractVolumes(service),
        networks: this.extractNetworks(service),
        labels: this.extractLabels(service),
        filePath: filePath,
        healthcheck: service.healthcheck || null,
        restart: this.resolveTemplateVar(service.restart || '${RESTARTAPP}'),
        requiresTraefik: this.requiresTraefik(service),
        requiresAuthelia: this.requiresAuthelia(service)
      };
    } catch (error) {
      DeploymentLogger.logDockerOperationFailed('parseApplicationConfig', error, {
        filePath,
        suggestion: 'Check YAML syntax and file permissions'
      });
      return null;
    }
  }

  /**
   * Deploy application using CLI infrastructure
   */
  async deployApplication(appId, config, deploymentMode) {
    const [category, appName] = appId.split('-');
    const appPath = path.join(this.appsPath, sanitizePathComponent(category), `${sanitizePathComponent(appName)}.yml`);
    
    if (!fs.existsSync(appPath)) {
      throw new Error(`Application ${appId} not found at ${appPath}`);
    }

    DeploymentLogger.logNetworkActivity('Starting application deployment', {
      level: 'info',
      appId,
      category,
      appName,
      deploymentMode,
      component: 'CLIBridge'
    });

    try {
      // Prepare environment configuration
      await this.prepareEnvironmentConfig(config, deploymentMode);
      
      // Deploy based on mode
      let deploymentResult;
      switch (deploymentMode.type) {
        case 'traefik':
          deploymentResult = await this.deployWithTraefik(appPath, config);
          break;
        case 'local':
        case 'standard':
          deploymentResult = await this.deployStandard(appPath, config);
          break;
        case 'authelia':
          deploymentResult = await this.deployWithAuthelia(appPath, config);
          break;
        default:
          // Fallback to local/standard for unknown modes
          deploymentResult = await this.deployStandard(appPath, config);
          break;
      }

      DeploymentLogger.logNetworkActivity('Application deployed successfully', {
        level: 'info',
        appId,
        deploymentMode: deploymentMode.type,
        result: deploymentResult,
        component: 'CLIBridge'
      });

      return deploymentResult;
    } catch (error) {
      DeploymentLogger.logDockerOperationFailed('deployApplication', error, {
        appId,
        suggestion: 'Check Docker daemon and network connectivity'
      });
      throw error;
    }
  }

  /**
   * Deploy application with Traefik integration
   */
  async deployWithTraefik(appPath, config) {
    // Ensure Traefik is installed and running
    await this.ensureTraefikRunning();

    // Parse compose so we can inject docker.sock GID for any service that needs it
    const content = fs.readFileSync(appPath, 'utf8');
    const doc = yaml.parse(content);
    this.injectDockerGid(doc);

    const tmpDir = path.join(process.cwd(), 'server', 'data');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, `${path.basename(appPath, '.yml')}-traefik.yml`);
    fs.writeFileSync(tmpPath, yaml.stringify(doc));

    try {
      return await this.executeDockerCompose(tmpPath, 'up -d', {
        ...config,
        DOCKERNETWORK: 'proxy'
      });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  /**
   * Deploy application in standard mode (without Traefik)
   */
  async deployStandard(appPath, config) {
    // For local/standard mode, rewrite compose to remove Traefik + external networks
    const content = fs.readFileSync(appPath, 'utf8');
    const doc = yaml.parse(content);

    // Remove top-level external network declarations
    if (doc.networks) {
      for (const netName of Object.keys(doc.networks)) {
        const netConfig = doc.networks[netName];
        if (netConfig && typeof netConfig === 'object' && netConfig.external) {
          delete doc.networks[netName];
        }
      }
      if (Object.keys(doc.networks).length === 0) delete doc.networks;
    }

    // For each service: remove networks, strip traefik/dockupdater labels, remove security_opt
    if (doc.services) {
      for (const svcName of Object.keys(doc.services)) {
        const svc = doc.services[svcName];
        delete svc.networks;
        delete svc.security_opt;
        if (svc.labels && Array.isArray(svc.labels)) {
          svc.labels = svc.labels.filter(l =>
            typeof l === 'string' && !l.includes('traefik') && !l.includes('dockupdater')
          );
          if (svc.labels.length === 0) delete svc.labels;
        }
      }
    }

    this.injectDockerGid(doc);

    const tmpDir = path.join(process.cwd(), 'server', 'data');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, `${path.basename(appPath, '.yml')}-local.yml`);
    fs.writeFileSync(tmpPath, yaml.stringify(doc));

    DeploymentLogger.logNetworkActivity('Local mode: rewrote compose file', {
      level: 'info',
      originalPath: appPath,
      tmpPath,
      component: 'CLIBridge'
    });

    try {
      return await this.executeDockerCompose(tmpPath, 'up -d', {
        ...config,
        DOCKERNETWORK: 'bridge'
      });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  /**
   * Deploy application with Authelia authentication
   */
  async deployWithAuthelia(appPath, config) {
    // Ensure both Traefik and Authelia are running
    await this.ensureTraefikRunning();
    await this.ensureAutheliaRunning();

    // Parse compose so we can inject docker.sock GID for any service that needs it
    const content = fs.readFileSync(appPath, 'utf8');
    const doc = yaml.parse(content);
    this.injectDockerGid(doc);

    const tmpDir = path.join(process.cwd(), 'server', 'data');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpPath = path.join(tmpDir, `${path.basename(appPath, '.yml')}-authelia.yml`);
    fs.writeFileSync(tmpPath, yaml.stringify(doc));

    try {
      return await this.executeDockerCompose(tmpPath, 'up -d', {
        ...config,
        DOCKERNETWORK: 'proxy'
      });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  /**
   * Execute docker-compose commands with proper environment
   */
  async executeDockerCompose(appPath, command, envVars = {}) {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        ...envVars
      };

      const dockerCompose = spawn('docker-compose', ['-f', appPath, ...command.split(' ')], {
        env,
        cwd: path.dirname(appPath),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      dockerCompose.stdout.on('data', (data) => {
        stdout += data.toString();
        // Stream real-time output for progress tracking
        this.streamProgress(data.toString());
      });

      dockerCompose.stderr.on('data', (data) => {
        stderr += data.toString();
        this.streamProgress(data.toString(), 'error');
      });

      dockerCompose.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code });
        } else {
          reject(new Error(`Docker Compose failed with exit code ${code}: ${stderr}`));
        }
      });

      dockerCompose.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Inject the host docker group ID into any service that mounts docker.sock,
   * so the container has permission to read/write the socket.
   */
  injectDockerGid(doc) {
    if (!doc.services) return doc;
    const gid = process.env.DOCKER_GID || '999';
    for (const svcName of Object.keys(doc.services)) {
      const svc = doc.services[svcName];
      const volumes = svc.volumes || [];
      const mountsSocket = volumes.some(v =>
        typeof v === 'string' && v.includes('docker.sock')
      );
      if (mountsSocket) {
        if (!svc.group_add) svc.group_add = [];
        if (!svc.group_add.includes(gid)) {
          svc.group_add.push(gid);
        }
      }
    }
    return doc;
  }

  /**
   * Ensure Traefik is running
   */
  async ensureTraefikRunning() {
    const traefikPath = path.join(this.traefik, 'docker-compose.yml');
    
    if (!fs.existsSync(traefikPath)) {
      // Install Traefik if not present
      await this.installTraefik();
    }

    // Check if Traefik is running
    try {
      execSync('docker ps | grep traefik', { stdio: 'pipe' });
    } catch (error) {
      // Start Traefik
      await this.executeDockerCompose(traefikPath, 'up -d');
    }
  }

  /**
   * Ensure Authelia is running
   */
  async ensureAutheliaRunning() {
    try {
      execSync('docker ps | grep authelia', { stdio: 'pipe' });
    } catch (error) {
      // Start Authelia if not running
      const autheliaPath = path.join(this.traefik, 'authelia', 'docker-compose.yml');
      if (fs.existsSync(autheliaPath)) {
        await this.executeDockerCompose(autheliaPath, 'up -d');
      }
    }
  }

  /**
   * Install Traefik using CLI installer
   */
  async installTraefik() {
    return new Promise((resolve, reject) => {
      const installer = spawn('bash', [path.join(this.traefik, 'install.sh')], {
        cwd: this.cliPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      installer.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Traefik installation failed with exit code ${code}`));
        }
      });
    });
  }

  /**
   * Stream deployment progress for real-time updates
   */
  streamProgress(data, type = 'info') {
    // This will be connected to WebSocket or Server-Sent Events
    DeploymentLogger.logNetworkActivity('Deployment progress', {
      level: type,
      output: data.trim(),
      component: 'CLIBridge'
    });
  }

  /**
   * Stop application using CLI
   */
  async stopApplication(appId) {
    const [category, appName] = appId.split('-');
    const appPath = path.join(this.appsPath, sanitizePathComponent(category), `${sanitizePathComponent(appName)}.yml`);
    
    return await this.executeDockerCompose(appPath, 'down');
  }

  /**
   * Remove application and cleanup
   */
  async removeApplication(appId, removeVolumes = false) {
    const [category, appName] = appId.split('-');
    const appPath = path.join(this.appsPath, sanitizePathComponent(category), `${sanitizePathComponent(appName)}.yml`);
    
    const command = removeVolumes ? 'down -v' : 'down';
    return await this.executeDockerCompose(appPath, command);
  }

  /**
   * Get application logs
   */
  async getApplicationLogs(appId, lines = 100) {
    const [category, appName] = appId.split('-');
    const appPath = path.join(this.appsPath, sanitizePathComponent(category), `${sanitizePathComponent(appName)}.yml`);
    
    return await this.executeDockerCompose(appPath, `logs --tail=${lines}`);
  }

  // Helper methods for parsing application configurations

  formatDisplayName(name) {
    return name.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  extractDescription(service) {
    // Try to extract description from labels or image name
    if (service.labels) {
      const descLabel = service.labels.find(label => 
        label.includes('description') || label.includes('summary')
      );
      if (descLabel) {
        return descLabel.split('=')[1];
      }
    }
    return `${CLIBridge.resolveTemplateVar(service.image)} container`;
  }

  extractPorts(service) {
    if (!service.ports) return {};
    
    const ports = {};
    service.ports.forEach(port => {
      if (typeof port === 'string' && port.includes(':')) {
        const [hostPort, containerPort] = port.split(':');
        ports[containerPort.replace('/tcp', '')] = parseInt(hostPort);
      }
    });
    return ports;
  }

  extractEnvironmentVars(service) {
    if (!service.environment) return {};
    
    const env = {};
    service.environment.forEach(envVar => {
      if (typeof envVar === 'string' && envVar.includes('=')) {
        const [key, value] = envVar.split('=');
        env[key] = value;
      }
    });
    return env;
  }

  extractVolumes(service) {
    return service.volumes || [];
  }

  extractNetworks(service) {
    return service.networks || [];
  }

  extractLabels(service) {
    return service.labels || [];
  }

  requiresTraefik(service) {
    if (!service.labels) return false;
    return service.labels.some(label => label.includes('traefik.enable=true'));
  }

  requiresAuthelia(service) {
    if (!service.labels) return false;
    return service.labels.some(label => label.includes('authelia') || label.includes('chain-authelia'));
  }

  /**
   * Prepare environment configuration for deployment
   */
  async prepareEnvironmentConfig(config, deploymentMode) {
    // Set default environment variables based on CLI standards
    const defaultEnv = {
      // Core system defaults
      ID: '1000',
      TZ: 'UTC',
      UMASK: '002',
      RESTARTAPP: 'unless-stopped',
      DOCKERNETWORK: deploymentMode.type === 'traefik' ? 'proxy' : 'bridge',
      DOMAIN: config.domain || 'localhost',
      APPFOLDER: '/opt/appdata',
      SECURITYOPS: 'no-new-privileges',
      SECURITYOPSSET: 'true',
      PORTBLOCK: '',

      // Docker images — LinuxServer.io defaults
      PLEXIMAGE: 'lscr.io/linuxserver/plex:latest',
      RADARRIMAGE: 'lscr.io/linuxserver/radarr:latest',
      RADARR4KIMAGE: 'lscr.io/linuxserver/radarr:latest',
      RADARRHDRIMAGE: 'lscr.io/linuxserver/radarr:latest',
      SONARRIMAGE: 'lscr.io/linuxserver/sonarr:latest',
      SONARR4KIMAGE: 'lscr.io/linuxserver/sonarr:latest',
      SONARRHDRIMAGE: 'lscr.io/linuxserver/sonarr:latest',
      BAZARRIMAGE: 'lscr.io/linuxserver/bazarr:latest',
      BAZARR4KIMAGE: 'lscr.io/linuxserver/bazarr:latest',
      OVERSEERRIMAGE: 'lscr.io/linuxserver/overseerr:latest',
      QBITORRENTIMAGE: 'lscr.io/linuxserver/qbittorrent:latest',
      CALIBREIMAGE: 'lscr.io/linuxserver/calibre:latest',
      LIDARRIMAGE: 'lscr.io/linuxserver/lidarr:latest',
      JELLYFINIMAGE: 'lscr.io/linuxserver/jellyfin:latest',
      PROWLARRIMAGE: 'lscr.io/linuxserver/prowlarr:latest',
      PROWLARR4KIMAGE: 'lscr.io/linuxserver/prowlarr:latest',
      PROWLARRHDRIMAGE: 'lscr.io/linuxserver/prowlarr:latest',
      KOMGAIMAGE: 'lscr.io/linuxserver/komga:latest',
      SABNZBDIMAGE: 'lscr.io/linuxserver/sabnzbd:latest',
      DELUGEIMAGE: 'lscr.io/linuxserver/deluge:latest',
      PIHOLEIMAGE: 'pihole/pihole:latest',
      LAZYLIBRARIANIMAGE: 'lscr.io/linuxserver/lazylibrarian:latest',
      NZBGETIMAGE: 'lscr.io/linuxserver/nzbget:latest',
      TAUTULLIIMAGE: 'lscr.io/linuxserver/tautulli:latest',
      JACKETTIMAGE: 'lscr.io/linuxserver/jackett:latest',
      FENRUSIMAGE: 'lscr.io/linuxserver/fenrus:latest',
      EMBYIMAGE: 'lscr.io/linuxserver/emby:latest',
      READARRIMAGE: 'lscr.io/linuxserver/readarr:latest',
      PORTAINERIMAGE: 'portainer/portainer-ce:latest',
      WEBTOP_IMAGE: 'lscr.io/linuxserver/webtop:latest',

      // Theme defaults
      PLEXTHEME: 'dark',
      RADARRTHEME: 'dark',
      SONARRTHEME: 'dark',
      BAZARRTHEME: 'dark',
      OVERSEERRTHEME: 'dark',
      QBITORRENTTHEME: 'dark',
      JELLYFINTHEME: 'dark',
      PROWLARRTHEME: 'dark',
      PROWLARRHDRTHEME: 'dark',
      DELUGETHEME: 'dark',
      SABNZBDTHEME: 'dark',
      EMBYTHEME: 'dark',
      NZBGETTHEME: 'dark',
      CALIBRETHEME: 'dark',
      RADARRHDRTHEME: 'dark',
      SONARRHDRTHEME: 'dark',
      LAZYLIBRARIANTHEME: 'dark',
      TAUTULLITHEME: 'dark',
      LIDARRTHEME: 'dark',
      READARRTHEME: 'dark',
      JACKETTTHEME: 'dark',

      // Misc defaults
      PLEXVERSION: 'docker',
      PLEXADDON: '',
      ARIA_RPC_SECRET: 'homelabarr',
    };

    // Merge with user configuration
    Object.assign(process.env, defaultEnv, config);
  }
}

/**
 * Static default environment values used to resolve ${VAR} template variables
 * for dashboard display. Keeps YAML files intact for Docker Compose while
 * preventing raw template strings from showing in the UI.
 */
CLIBridge.ENV_DEFAULTS = {
  // Docker images — LinuxServer.io defaults
  PLEXIMAGE: 'lscr.io/linuxserver/plex:latest',
  RADARRIMAGE: 'lscr.io/linuxserver/radarr:latest',
  RADARR4KIMAGE: 'lscr.io/linuxserver/radarr:latest',
  RADARRHDRIMAGE: 'lscr.io/linuxserver/radarr:latest',
  SONARRIMAGE: 'lscr.io/linuxserver/sonarr:latest',
  SONARR4KIMAGE: 'lscr.io/linuxserver/sonarr:latest',
  SONARRHDRIMAGE: 'lscr.io/linuxserver/sonarr:latest',
  BAZARRIMAGE: 'lscr.io/linuxserver/bazarr:latest',
  BAZARR4KIMAGE: 'lscr.io/linuxserver/bazarr:latest',
  OVERSEERRIMAGE: 'lscr.io/linuxserver/overseerr:latest',
  QBITORRENTIMAGE: 'lscr.io/linuxserver/qbittorrent:latest',
  CALIBREIMAGE: 'lscr.io/linuxserver/calibre:latest',
  LIDARRIMAGE: 'lscr.io/linuxserver/lidarr:latest',
  JELLYFINIMAGE: 'lscr.io/linuxserver/jellyfin:latest',
  PROWLARRIMAGE: 'lscr.io/linuxserver/prowlarr:latest',
  PROWLARR4KIMAGE: 'lscr.io/linuxserver/prowlarr:latest',
  PROWLARRHDRIMAGE: 'lscr.io/linuxserver/prowlarr:latest',
  KOMGAIMAGE: 'lscr.io/linuxserver/komga:latest',
  SABNZBDIMAGE: 'lscr.io/linuxserver/sabnzbd:latest',
  DELUGEIMAGE: 'lscr.io/linuxserver/deluge:latest',
  PIHOLEIMAGE: 'pihole/pihole:latest',
  LAZYLIBRARIANIMAGE: 'lscr.io/linuxserver/lazylibrarian:latest',
  NZBGETIMAGE: 'lscr.io/linuxserver/nzbget:latest',
  TAUTULLIIMAGE: 'lscr.io/linuxserver/tautulli:latest',
  JACKETTIMAGE: 'lscr.io/linuxserver/jackett:latest',
  FENRUSIMAGE: 'lscr.io/linuxserver/fenrus:latest',
  EMBYIMAGE: 'lscr.io/linuxserver/emby:latest',
  READARRIMAGE: 'lscr.io/linuxserver/readarr:latest',
  PORTAINERIMAGE: 'portainer/portainer-ce:latest',
  WEBTOP_IMAGE: 'lscr.io/linuxserver/webtop:latest',
  MOUNT_ENHANCED_IMAGE: 'rclone/rclone:latest',

  // Core system defaults
  RESTARTAPP: 'unless-stopped',
  DOCKERNETWORK: 'bridge',
  APPFOLDER: '/opt/appdata',
};