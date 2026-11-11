import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { DeploymentLogger } from './deployment-logger.js';
import { APPARMOR_UPDATE_MESSAGE } from './deploy-readiness.js';

export function safeJoin(base, ...parts) {
  for (const p of parts) {
    if (typeof p !== 'string' || !/^[a-z0-9][a-z0-9_.-]{0,63}$/i.test(p)) {
      throw new Error(`Invalid path component: ${JSON.stringify(p)}`);
    }
  }
  const resolved = path.resolve(base, ...parts);
  const baseResolved = path.resolve(base) + path.sep;
  if (!resolved.startsWith(baseResolved) && resolved !== path.resolve(base)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

// The application directories under apps/. Several of these contain hyphens, so
// an app id `${category}-${appName}` cannot be split naively on '-'.
export const APP_CATEGORIES = [
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

/**
 * Split an app id (`${category}-${appName}`) back into its parts.
 *
 * Both the category (media-servers, self-hosted, …) and the app name
 * (nginx-proxy-manager, …) can contain hyphens, so a plain `appId.split('-')`
 * mis-parses them and silently drops segments. We disambiguate by matching the
 * longest known category prefix; the remainder is the app name. Unknown
 * categories fall back to a split on the first hyphen (which preserves a
 * hyphenated app name and still lets the path gate validate each component).
 */
export function parseAppId(appId) {
  if (typeof appId !== 'string') {
    return { category: appId, appName: undefined };
  }
  for (const category of [...APP_CATEGORIES].sort((a, b) => b.length - a.length)) {
    const prefix = `${category}-`;
    if (appId.startsWith(prefix) && appId.length > prefix.length) {
      return { category, appName: appId.slice(prefix.length) };
    }
  }
  const idx = appId.indexOf('-');
  if (idx === -1) {
    return { category: appId, appName: undefined };
  }
  return { category: appId.slice(0, idx), appName: appId.slice(idx + 1) };
}

/**
 * Where a deploy writes its rewritten compose file. It lives beside the
 * database because that folder is writable on every working install, while
 * homelabarr.yml runs the backend with a read-only root, /app/server/data
 * included (#641). The folder is still named "data", so compose derives the
 * same project name deploys have always had.
 */
export function composeWorkDir() {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * The compose project every deployed app belongs to. Compose names a project
 * after the folder of its file, so deploys (run from composeWorkDir) have always
 * landed in this one; stop, remove and logs run from the app's template folder
 * and must name it explicitly (HLCE-376). Normalised the way compose does it.
 */
export function appProjectName() {
  return path.basename(composeWorkDir()).toLowerCase().replace(/[^a-z0-9_-]/g, '');
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

  static ALLOWED_TEMPLATE_VARS = new Set([
    'PUID', 'PGID', 'TZ', 'DOMAIN', 'APPDATA', 'CONFIG', 'DOCKERNETWORK',
    'UMASK', 'HOST_IP', 'LOCAL_IP', 'CONTAINER_NAME',
    // Media paths
    'MEDIA', 'DOWNLOADS', 'TV', 'MOVIES', 'MUSIC', 'BOOKS', 'COMICS',
    // Service-specific
    'PLEX_CLAIM', 'VPN_PROVIDER', 'VPN_USERNAME', 'VPN_PASSWORD',
    'WIREGUARD_PRIVATE_KEY', 'WIREGUARD_ADDRESSES',
    // Port overrides (prefixed)
    ...Array.from({length: 20}, (_, i) => `PORT_${i}`),
  ]);

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
      for (const category of APP_CATEGORIES) {
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
        variables: [...CLIBridge.settableVariables(config)].map(([name, required]) => ({ name, required })),
        // The app uses the domain in its own settings, not only for Traefik (HLCE-378).
        usesDomain: CLIBridge.environmentRefs(config).some(r => r.name === 'DOMAIN'),
        // The names this app's containers run under, so the deploy dialog does
        // not call the app's own port busy on a redeploy (HLCE-384).
        containerNames: Object.entries(config.services).map(([key, svc]) =>
          CLIBridge.resolveTemplateVar(svc?.container_name) || `${appProjectName()}-${key}-1`),
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
    const { category, appName } = parseAppId(appId);
    const appPath = safeJoin(this.appsPath, category, appName + '.yml');

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
      // Build the per-deploy trusted-default env and thread it explicitly into
      // the deploy method (no global process.env mutation, no instance-state race).
      const deployEnv = await this.prepareEnvironmentConfig(config, deploymentMode);

      // Deploy based on mode
      let deploymentResult;
      switch (deploymentMode.type) {
        case 'traefik':
          deploymentResult = await this.deployWithTraefik(appPath, config, deployEnv);
          break;
        case 'local':
        case 'standard':
          deploymentResult = await this.deployStandard(appPath, config, deployEnv);
          break;
        case 'authelia':
          deploymentResult = await this.deployWithAuthelia(appPath, config, deployEnv);
          break;
        default:
          // Fallback to local/standard for unknown modes
          deploymentResult = await this.deployStandard(appPath, config, deployEnv);
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
  async deployWithTraefik(appPath, config, deployEnv = CLIBridge.trustedDefaults(config, { type: 'traefik' }), { onOutput } = {}) {
    // Ensure Traefik is installed and running
    await this.ensureTraefikRunning();

    // Parse compose so we can inject docker.sock GID for any service that needs it
    const content = fs.readFileSync(appPath, 'utf8');
    const doc = yaml.parse(content);
    const settable = CLIBridge.settableVariables(doc);
    CLIBridge.applyPortChoices(doc, config);
    this.injectDockerGid(doc);

    const tmpPath = path.join(composeWorkDir(), `${path.basename(appPath, '.yml')}-traefik.yml`);
    fs.writeFileSync(tmpPath, yaml.stringify(doc));

    try {
      return await this.executeDockerCompose(tmpPath, 'up -d', {
        ...config,
        DOCKERNETWORK: 'proxy'
      }, deployEnv, settable, { project: appProjectName(), onOutput });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  /**
   * Rewrite a parsed compose doc for standard (no Traefik) mode, in place.
   */
  static rewriteForStandard(doc) {
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

    // For each service: drop per-service networks, strip ONLY the
    // traefik.*/dockupdater.* labels (matched by key prefix, not substring, so a
    // benign label whose value happens to mention "traefik" survives), and
    // replace security_opt with the hardening default rather than dropping it —
    // standard mode must not silently un-harden a container.
    if (doc.services) {
      for (const svcName of Object.keys(doc.services)) {
        const svc = doc.services[svcName];
        delete svc.networks;
        svc.security_opt = ['no-new-privileges:true'];
        if (svc.labels && Array.isArray(svc.labels)) {
          svc.labels = svc.labels.filter(l => {
            if (typeof l !== 'string') return false;
            const key = l.split('=')[0].trim();
            return !key.startsWith('traefik.') && !key.startsWith('dockupdater.');
          });
          if (svc.labels.length === 0) delete svc.labels;
        }
      }
    }
  }

  /**
   * Every ${NAME} or $NAME a value refers to, and whether that use carries its
   * own fallback (${NAME:-x}, ${NAME-x}, ${NAME:+x}). $$ is a literal dollar.
   */
  static variableRefs(value) {
    const refs = [];
    const pattern = /\$\$|\$\{([A-Za-z_][A-Za-z0-9_]*)([^}]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g;
    const visit = (v) => {
      if (typeof v === 'string') {
        for (const m of v.matchAll(pattern)) {
          const name = m[1] || m[3];
          if (name) refs.push({ name, fallback: /^:?[-+]/.test(m[2] || '') });
        }
      } else if (Array.isArray(v)) {
        v.forEach(visit);
      } else if (v && typeof v === 'object') {
        Object.values(v).forEach(visit);
      }
    };
    visit(value);
    return refs;
  }

  /**
   * Names a compose doc uses that the given environment does not set.
   * Compose fills an unset ${NAME} with an empty string, so the app starts
   * with a blank value and usually crash-loops (#642).
   */
  static unresolvedVariables(doc, env) {
    const missing = new Set();
    for (const { name, fallback } of CLIBridge.variableRefs(doc)) {
      if (!fallback && env[name] === undefined) missing.add(name);
    }
    return [...missing].sort();
  }

  /**
   * Every variable the services' environment values refer to: the app's own
   * settings. List form "KEY=value" (only the value counts) or map form.
   */
  static environmentRefs(doc) {
    const refs = [];
    for (const svc of Object.values(doc?.services || {})) {
      if (!svc || typeof svc !== 'object') continue;
      const { environment } = svc;
      const values = Array.isArray(environment)
        ? environment.map(e => (typeof e === 'string' && e.includes('=') ? e.slice(e.indexOf('=') + 1) : ''))
        : Object.values(environment || {});
      refs.push(...CLIBridge.variableRefs(values));
    }
    return refs;
  }

  /**
   * The variables a user may set for this app from the deploy dialog, mapped to
   * whether the app needs one (no fallback anywhere). Only names the template
   * uses inside environment values qualify (HLCE-373). A name it also uses in
   * image, volumes, ports, security options, labels or anywhere else, any
   * default HomelabARR supplies, and names the host process depends on stay out
   * of a user's reach, so a value typed in the dialog can only ever become an
   * environment value of the app it was typed for.
   */
  static settableVariables(doc) {
    const reserved = new Set([
      ...Object.keys(CLIBridge.trustedDefaults()),
      ...Object.keys(CLIBridge.ENV_DEFAULTS),
      ...Object.keys(CLIBridge.IMAGE_DEFAULTS),
      'PATH', 'HOME', 'HOSTNAME', 'USER', 'SHELL', 'PWD',
    ]);
    const protectedPrefix = /^(DOCKER_|COMPOSE_|LD_|NODE_)/;
    const { services, ...top } = doc || {};
    const elsewhere = new Set(CLIBridge.variableRefs(top).map(r => r.name));
    for (const svc of Object.values(services || {})) {
      if (!svc || typeof svc !== 'object') continue;
      for (const [key, value] of Object.entries(svc)) {
        if (key !== 'environment') CLIBridge.variableRefs(value).forEach(r => elsewhere.add(r.name));
      }
    }
    const inEnvironment = CLIBridge.environmentRefs(doc);
    const settable = new Map();
    for (const { name, fallback } of inEnvironment) {
      if (elsewhere.has(name) || reserved.has(name) || protectedPrefix.test(name)) continue;
      if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) continue;
      settable.set(name, (settable.get(name) ?? true) && !fallback);
    }
    return settable;
  }

  /**
   * The user's values for the names they may set: the global allowlist plus the
   * app's own variables (settableVariables, HLCE-373). The keys come from those
   * trusted names, never from the request, so a request cannot pick which
   * property gets written (no __proto__ or constructor).
   */
  static pickUserValues(config, settable) {
    const picked = {};
    for (const name of [...CLIBridge.ALLOWED_TEMPLATE_VARS, ...settable.keys()]) {
      if (Object.hasOwn(config, name)) picked[name] = config[name];
    }
    return picked;
  }

  /**
   * The variables this deploy would leave empty, worked out the same way the
   * deploy builds its compose file and environment. Returns [] when the app
   * cannot be read; the deploy itself reports that.
   */
  findUnresolvedVariables(appId, config = {}, deploymentMode = {}) {
    let doc;
    try {
      const { category, appName } = parseAppId(appId);
      const appPath = safeJoin(this.appsPath, category, appName + '.yml');
      doc = yaml.parse(fs.readFileSync(appPath, 'utf8'));
    } catch {
      return [];
    }
    const type = deploymentMode.type || 'standard';
    const proxied = type === 'traefik' || type === 'authelia';
    // Same order as the deploy: what a user may set is decided on the app's own
    // file, before standard mode strips its labels and networks.
    const settable = CLIBridge.settableVariables(doc);
    if (!proxied) CLIBridge.rewriteForStandard(doc);

    // trustedDefaults, not prepareEnvironmentConfig: a check must not touch the
    // deploy state a concurrent deploy reads.
    const baseEnv = CLIBridge.trustedDefaults(config, { ...deploymentMode, type });
    const userVars = Object.fromEntries(
      Object.entries(CLIBridge.pickUserValues(config, settable))
        .filter(([, v]) => typeof v === 'string' && v !== ''),
    );
    const env = {
      ...process.env,
      ...baseEnv,
      ...userVars,
      DOCKERNETWORK: proxied ? 'proxy' : 'bridge',
    };
    return CLIBridge.unresolvedVariables(doc, env);
  }

  /**
   * Deploy application in standard mode (without Traefik)
   */
  async deployStandard(appPath, config, deployEnv = CLIBridge.trustedDefaults(config, { type: 'standard' }), { onOutput } = {}) {
    // For local/standard mode, rewrite compose to remove Traefik + external networks
    const content = fs.readFileSync(appPath, 'utf8');
    const doc = yaml.parse(content);
    const settable = CLIBridge.settableVariables(doc);

    CLIBridge.rewriteForStandard(doc);
    CLIBridge.applyPortChoices(doc, config);
    this.injectDockerGid(doc);

    const tmpPath = path.join(composeWorkDir(), `${path.basename(appPath, '.yml')}-local.yml`);
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
      }, deployEnv, settable, { project: appProjectName(), onOutput });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  /**
   * Deploy application with Authelia authentication
   */
  async deployWithAuthelia(appPath, config, deployEnv = CLIBridge.trustedDefaults(config, { type: 'authelia' }), { onOutput } = {}) {
    // Ensure both Traefik and Authelia are running
    await this.ensureTraefikRunning();
    await this.ensureAutheliaRunning();

    // Parse compose so we can inject docker.sock GID for any service that needs it
    const content = fs.readFileSync(appPath, 'utf8');
    const doc = yaml.parse(content);
    const settable = CLIBridge.settableVariables(doc);
    CLIBridge.applyPortChoices(doc, config);
    this.injectDockerGid(doc);

    const tmpPath = path.join(composeWorkDir(), `${path.basename(appPath, '.yml')}-authelia.yml`);
    fs.writeFileSync(tmpPath, yaml.stringify(doc));

    try {
      return await this.executeDockerCompose(tmpPath, 'up -d', {
        ...config,
        DOCKERNETWORK: 'proxy'
      }, deployEnv, settable, { project: appProjectName(), onOutput });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  /**
   * Execute docker-compose commands with proper environment.
   *
   * `envVars` is the USER-supplied config: every key must clear the
   * ALLOWED_TEMPLATE_VARS allowlist and the value character/length gate, or it
   * is dropped (non-allowlisted) / rejected (bad value). `baseEnv` is the set of
   * TRUSTED, code-controlled defaults (image tags, restart policy, …) built by
   * prepareEnvironmentConfig; it is merged ahead of the validated user vars so a
   * user value can override a default but never smuggle an unvalidated value in.
   * The host `process.env` is read for inherited basics (PATH, DOCKER_GID, …) but
   * is NEVER mutated — nothing here leaks across deploys.
   * `project` names the compose project; app commands pass appProjectName() so
   * stop, remove and logs find what deploy started (HLCE-376).
   * `onOutput(data, type)` receives this run's output only, so a progress
   * stream never shows another deploy's lines.
   */
  async executeDockerCompose(appPath, command, envVars = {}, baseEnv = {}, settable = new Set(), { project, onOutput } = {}) {
    return new Promise((resolve, reject) => {
      const filtered = CLIBridge.pickUserValues(envVars, settable);
      for (const [k, v] of Object.entries(filtered)) {
        if (typeof v !== 'string' || v.length > 256 || /[\r\n\0`$]/.test(v)) {
          throw new Error(`Invalid template variable value for ${k}`);
        }
      }
      const env = { ...process.env, ...baseEnv, ...filtered };

      const args = project ? ['-p', project, '-f', appPath] : ['-f', appPath];
      if (command === 'up -d') args.push('up', '-d');
      else if (command === 'down') args.push('down');
      else if (command === 'down -v') args.push('down', '-v');
      else if (command.startsWith('logs')) {
        const match = command.match(/--tail=(\d+)/);
        const parsed = match ? Number.parseInt(match[1], 10) : NaN;
        const tail = Number.isInteger(parsed) && parsed > 0 ? parsed : 100;
        args.push('logs', '--tail=' + tail);
      }
      else throw new Error(`Unsupported compose command: ${command}`);

      const dockerCompose = spawn('docker-compose', args, {
        env,
        cwd: path.dirname(appPath),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      dockerCompose.stdout.on('data', (data) => {
        stdout += data.toString();
        this.streamProgress(data.toString());
        onOutput?.(data.toString(), 'info');
      });

      dockerCompose.stderr.on('data', (data) => {
        stderr += data.toString();
        this.streamProgress(data.toString(), 'error');
        onOutput?.(data.toString(), 'error');
      });

      dockerCompose.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code });
        } else {
          reject(new Error(`Docker Compose failed with exit code ${code}: ${stderr}`));
        }
      });

      dockerCompose.on('error', (error) => {
        // v2.6.2 added docker-compose to the AppArmor profile. A host still on the
        // older profile refuses to run it, and the raw EACCES says nothing useful.
        if (error.code === 'EACCES') {
          const explained = new Error(APPARMOR_UPDATE_MESSAGE);
          explained.code = 'EACCES';
          explained.cause = error;
          return reject(explained);
        }
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
   * Run a compose command against an app the way deploy runs it: the same
   * project, the same standard-mode rewrite and the same defaults. The raw
   * template refers to settings such as ${DOCKERNETWORK}, which compose cannot
   * resolve on its own ("refers to undefined network"), so stop, remove and
   * logs failed for apps like n8n (HLCE-391).
   */
  async runAppCompose(appId, command) {
    const { category, appName } = parseAppId(appId);
    const appPath = safeJoin(this.appsPath, category, appName + '.yml');
    const doc = yaml.parse(fs.readFileSync(appPath, 'utf8'));
    CLIBridge.rewriteForStandard(doc);

    const tmpPath = path.join(composeWorkDir(), `${appName}-manage.yml`);
    fs.writeFileSync(tmpPath, yaml.stringify(doc));
    try {
      const defaults = CLIBridge.trustedDefaults({}, { type: 'standard' });
      return await this.executeDockerCompose(tmpPath, command, {}, defaults, new Set(), { project: appProjectName() });
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  /**
   * Stop application using CLI
   */
  async stopApplication(appId) {
    return this.runAppCompose(appId, 'down');
  }

  /**
   * Remove application and cleanup
   */
  async removeApplication(appId, removeVolumes = false) {
    return this.runAppCompose(appId, removeVolumes ? 'down -v' : 'down');
  }

  /**
   * Get application logs
   */
  async getApplicationLogs(appId, lines = 100) {
    // Coerce `lines` to a positive integer; anything non-numeric, zero, or
    // negative falls back to the 100-line default.
    const parsed = Number.parseInt(lines, 10);
    const tail = Number.isInteger(parsed) && parsed > 0 ? parsed : 100;
    return this.runAppCompose(appId, `logs --tail=${tail}`);
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
    return Object.fromEntries(CLIBridge.publishedPorts(service).map(p => [p.key, p.host]));
  }

  /**
   * The fixed host ports a service publishes, keyed the way the deploy dialog
   * names them: the container port, plus "/udp" when it is not TCP. Reads
   * "8080:80", "${PORTBLOCK}:8080:80/udp" and the long form
   * {published, target, protocol}. Entries without one fixed host port (ranges,
   * container-only ports) are left out.
   */
  static publishedPorts(service) {
    const found = [];
    (service?.ports || []).forEach((entry, index) => {
      let host;
      let container;
      let protocol;
      if (typeof entry === 'string') {
        const [spec, proto] = entry.split('/');
        const parts = spec.split(':');
        if (parts.length < 2) return;
        host = parts[parts.length - 2];
        container = parts[parts.length - 1];
        protocol = proto || 'tcp';
      } else if (entry && typeof entry === 'object') {
        host = entry.published;
        container = entry.target;
        protocol = entry.protocol || 'tcp';
      } else {
        return;
      }
      if (!/^\d+$/.test(String(host)) || !/^\d+$/.test(String(container))) return;
      const key = protocol === 'tcp' ? String(container) : `${container}/${protocol}`;
      found.push({ key, host: Number(host), index });
    });
    return found;
  }

  /**
   * The host ports the user chose in the deploy dialog (port_<key>, HLCE-375)
   * for the app's first service, the one whose ports the dialog offers. Field
   * names come from the template, never from the request. An empty value keeps
   * the template's port.
   */
  static portChoices(doc, config = {}) {
    const service = doc?.services ? Object.values(doc.services)[0] : undefined;
    const invalid = [];
    const changes = [];
    for (const port of CLIBridge.publishedPorts(service)) {
      const field = `port_${port.key}`;
      if (!Object.hasOwn(config, field)) continue;
      const value = String(config[field] ?? '').trim();
      if (value === '') continue;
      const chosen = Number(value);
      if (!/^\d+$/.test(value) || chosen < 1 || chosen > 65535) {
        invalid.push(field);
      } else {
        changes.push({ index: port.index, host: chosen });
      }
    }
    return { service, invalid, changes };
  }

  /**
   * Publish the app on the host ports chosen in the dialog, in place. Throws
   * when a chosen port is not a port number; the route refuses those first.
   */
  static applyPortChoices(doc, config) {
    const { service, invalid, changes } = CLIBridge.portChoices(doc, config);
    if (invalid.length > 0) {
      throw new Error(`Invalid port for ${invalid.join(', ')}`);
    }
    for (const { index, host } of changes) {
      const entry = service.ports[index];
      if (typeof entry === 'string') {
        const [spec, proto] = entry.split('/');
        const parts = spec.split(':');
        parts[parts.length - 2] = String(host);
        service.ports[index] = parts.join(':') + (proto ? `/${proto}` : '');
      } else {
        entry.published = host;
      }
    }
    return doc;
  }

  /**
   * The dialog port fields of this deploy that are not a port number.
   * Returns [] when the app cannot be read; the deploy itself reports that.
   */
  findInvalidPorts(appId, config = {}) {
    try {
      const { category, appName } = parseAppId(appId);
      const appPath = safeJoin(this.appsPath, category, appName + '.yml');
      return CLIBridge.portChoices(yaml.parse(fs.readFileSync(appPath, 'utf8')), config).invalid;
    } catch {
      return [];
    }
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
   * Prepare environment configuration for deployment.
   *
   * Builds the trusted-default env for this deploy (image tags, restart policy,
   * theme defaults, …) and returns it for the caller to pass to the deploy
   * method. Nothing is kept on the instance, which every deploy shares
   * (HLCE-380). It deliberately does
   * NOT touch the global `process.env`: the user-supplied `config` must flow
   * only through executeDockerCompose's allowlist + character gate, never get
   * spread wholesale into a shared, persistent environment (which both bypassed
   * the gate and leaked one deploy's values into the next).
   */
  async prepareEnvironmentConfig(config, deploymentMode) {
    // The user `config` is NOT merged in here: it travels separately through
    // the validated path in executeDockerCompose.
    return CLIBridge.trustedDefaults(config, deploymentMode);
  }

  /**
   * The trusted defaults every deploy starts from. Pure, so the catalog can
   * see which names are reserved without touching deploy state.
   */
  static trustedDefaults(config = {}, deploymentMode = {}) {
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
    };

    return defaultEnv;
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