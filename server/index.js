import express from 'express';
import cors from 'cors';
import yaml from 'yaml';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { initializeAuth, requireAuth, requireRole, optionalAuth } from './auth.js';
import { initializeActivityLog, logActivity } from './activity-logger.js';
import { initAudit, audit, verifyChain } from './audit.js';
import { maybeAlert, setAuditHook } from './alert.js';
import { logger as structuredLogger, requestContext } from './log.js';
import { SqliteStore, createLoginLimiter, createLockoutGuard } from './ratelimit.js';
import { attackTag } from './middleware/attackTag.js';
import { mountHoney } from './routes/honey.js';
import { EnvironmentManager } from './environment-manager.js';
import { NetworkManager } from './network-manager.js';
import { DeploymentLogger } from './deployment-logger.js';
import { CLIBridge } from './cli-bridge.js';
import { progressStream, StreamingCLIBridge } from './progress-stream.js';
import { DockerConnectionManager, createDockerManager } from './docker-manager.js';

import authRoutes from './routes/auth.js';
import authAdminRoutes from './routes/auth-admin.js';
import healthRoutes from './routes/health.js';
import applicationRoutes from './routes/applications.js';
import deploymentRoutes from './routes/deployments.js';
import portRoutes from './routes/ports.js';
import containerRoutes from './routes/containers.js';
import deployRoutes from './routes/deploy.js';
import enhancedMountRoutes from './routes/enhanced-mount.js';

function getRequestMeta(req) {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '',
    userAgent: req.headers['user-agent'] || ''
  };
}

const envConfig = EnvironmentManager.getConfiguration();
const isDevelopment = envConfig.environment === 'development';
const authEnabled = envConfig.authEnabled;
const networkConfig = NetworkManager.getConfiguration();

const logger = {
  info: (message, ...args) => console.log(`ℹ️  ${message}`, ...args),
  warn: (message, ...args) => console.warn(`⚠️  ${message}`, ...args),
  error: (message, ...args) => console.error(`❌ ${message}`, ...args),
  debug: (message, ...args) => {
    if (isDevelopment || envConfig.logLevel === 'debug') console.log(`🐛 ${message}`, ...args);
  }
};

let cliBridge;
let streamingCLIBridge;
try {
  cliBridge = new CLIBridge();
  streamingCLIBridge = new StreamingCLIBridge(cliBridge, progressStream);
  logger.info('CLI Bridge initialized successfully');
} catch (error) {
  logger.error('Failed to initialize CLI Bridge:', error.message);
  cliBridge = null;
  streamingCLIBridge = null;
}

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => { res.removeHeader('Server'); next(); });

initAudit();
setAuditHook(audit);

const chain = verifyChain();
if (!chain.ok) {
  audit({ event: 'audit.chain.broken', actor: 'system', result: 'fail', meta: chain });
  maybeAlert({ event: 'audit.chain.broken', actor: 'system', meta: chain });
  if (process.env.AUDIT_STRICT === '1') { console.error('Audit chain broken — refusing to start'); process.exit(1); }
} else {
  audit({ event: 'audit.chain.verified', actor: 'system', result: 'ok', meta: { rows: chain.rows } });
}

const lockout = createLockoutGuard();
const corsOptions = EnvironmentManager.getCorsOptions();

app.use(express.json());
app.use(DeploymentLogger.createCorsLoggingMiddleware());
app.use(cors(corsOptions));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
  next();
});
app.use(cookieParser());
app.use(requestContext);
app.use(attackTag);
mountHoney(app);

app.post('/csp-report', express.json({ type: ['application/csp-report', 'application/reports+json', 'application/json'] }), (req, res) => {
  logger.warn('CSP violation', { ip: req.ip, report: req.body });
  res.status(204).end();
});

const globalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalRateLimit);

app.use((req, res, next) => {
  const csrfExempt = ['/auth/login', '/auth/login/mfa', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password', '/auth/cli-mint', '/csp-report', '/internal/audit'];
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !csrfExempt.includes(req.path)) {
    const cookieTok = req.cookies?.hl_csrf;
    const hdrTok = req.headers['x-csrf-token'];
    if (cookieTok && hdrTok) {
      try {
        const a = Buffer.from(String(cookieTok));
        const b = Buffer.from(String(hdrTok));
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return res.status(403).json({ error: 'CSRF validation failed' });
        }
      } catch {
        return res.status(403).json({ error: 'CSRF validation failed' });
      }
    }
    if (req.headers['x-requested-with'] !== 'XMLHttpRequest' && !req.headers.authorization?.startsWith('hlr_')) {
      return res.status(403).json({ error: 'XHR required' });
    }
  }
  next();
});

const loginLimiter = createLoginLimiter();

function sendError(res, status, message, internalError) {
  if (internalError) {
    logger.error(message, { error: internalError.message || internalError, stack: internalError.stack });
  }
  const body = { error: message };
  if (isDevelopment && internalError) {
    body.details = internalError.message || String(internalError);
  }
  res.status(status).json(body);
}

if (isDevelopment) {
  app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    res.header('Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, Origin, X-Requested-With, Access-Control-Allow-Origin, ' +
      'Access-Control-Allow-Headers, Access-Control-Allow-Methods, Cache-Control, Pragma, Expires'
    );
    res.header('Access-Control-Max-Age', '86400');
    res.status(200).end();
  });
}

const dockerManager = createDockerManager(networkConfig);

const deps = {
  sendError, getRequestMeta, loginLimiter, lockout, authEnabled, isDevelopment,
  requireAuth, requireRole, optionalAuth,
  dockerManager, cliBridge, streamingCLIBridge, progressStream,
  audit, maybeAlert, logActivity, logger, yaml,
  envConfig, networkConfig, EnvironmentManager, NetworkManager, DeploymentLogger,
};

app.use(authRoutes(deps));
app.use(authAdminRoutes(deps));
app.use(healthRoutes(deps));
app.use(applicationRoutes(deps));
app.use(deploymentRoutes(deps));
app.use(portRoutes(deps));
app.use(containerRoutes(deps));
app.use(deployRoutes(deps));
app.use('/enhanced-mount', enhancedMountRoutes(deps));

app.get('/_routes', requireAuth, (req, res) => {
  if (req.user.role !== 'scanner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'scanner or admin role required' });
  }
  const routes = [];
  app._router.stack.forEach(layer => {
    if (layer.route) {
      routes.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods).filter(m => layer.route.methods[m]).map(m => m.toUpperCase()),
      });
    }
  });
  routes.sort((a, b) => a.path.localeCompare(b.path));
  res.json({ count: routes.length, routes });
});

app.use((err, req, res, next) => {
  sendError(res, 500, 'Internal Server Error', err);
});

process.on('SIGTERM', () => { logger.info('SIGTERM received'); dockerManager.destroy(); process.exit(0); });
process.on('SIGINT', () => { logger.info('SIGINT received'); dockerManager.destroy(); process.exit(0); });

const PORT = networkConfig.port;
const BIND_ADDRESS = networkConfig.bindAddress;

EnvironmentManager.logEnvironmentInfo();
NetworkManager.logNetworkInfo();
DeploymentLogger.initialize();

try {
  const envValidation = EnvironmentManager.validateConfiguration();
  const networkValidation = NetworkManager.validateNetworkConfiguration();
  if (!envValidation.isValid) {
    logger.error('Environment configuration validation failed');
    envValidation.errors.forEach(error => logger.error(`  ${error}`));
    process.exit(1);
  }
  if (!networkValidation.isValid) {
    logger.warn('Network validation failed — running in catalog-only mode');
  }
} catch (configError) {
  logger.error('Critical error during configuration validation:', configError);
  process.exit(1);
}

(async () => {
  await initializeAuth();
  initializeActivityLog();

  try {
    const server = app.listen(PORT, BIND_ADDRESS, () => {
      DeploymentLogger.logStartupInfo();
      DeploymentLogger.logConfigurationSummary();
      logger.info(`HomelabARR backend running on ${BIND_ADDRESS}:${PORT}`);
      logger.info(`Auth: ${authEnabled ? 'enabled' : 'disabled'} | Docker: ${networkConfig.dockerSocket}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else if (error.code === 'EACCES') {
        logger.error(`Permission denied for ${BIND_ADDRESS}:${PORT}`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();
