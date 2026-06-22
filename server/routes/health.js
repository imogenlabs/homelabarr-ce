import { Router } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

export default function healthRoutes({ requireAuth, requireRole, sendError, dockerManager, envConfig, networkConfig, EnvironmentManager, NetworkManager, DeploymentLogger, logger, isDevelopment, getProcessCounters }) {
  const router = Router();

  router.get('/health', (_req, res) => {
    const counters = getProcessCounters ? getProcessCounters() : {};
    return res.json({
      ok: true,
      ts: Math.floor(Date.now() / 1000),
      state: 'ready',
      process: {
        uptime_seconds: Math.floor(process.uptime()),
        ...counters,
      },
    });
  });

  router.get('/health/detail', requireAuth, requireRole('admin'), async (req, res) => {
    const connectionState = dockerManager.getConnectionState();
    const serviceStatus = dockerManager.getServiceStatus();

    try {
      let dockerStatus = 'connected';
      let dockerDetails = {};
      let dockerInfo = null;

      const dockerHost = process.env.DOCKER_HOST;
      if (dockerHost && dockerHost.startsWith('tcp://')) {
        try {
          const url = new URL(dockerHost.replace('tcp://', 'http://'));
          const pingRes = await fetch(`http://${url.hostname}:${url.port}/_ping`, { signal: AbortSignal.timeout(2000) });
          dockerStatus = pingRes.ok ? 'connected' : 'disconnected';
        } catch { dockerStatus = 'disconnected'; }
      } else {
        try {
          execSync('docker info --format "{{.ServerVersion}}"', { encoding: 'utf8', timeout: 5000 });
          dockerStatus = 'connected';
        } catch { dockerStatus = 'disconnected'; }
      }

      if (connectionState.isConnected) {
        try {
          await dockerManager.executeWithRetry(
            async (docker) => await docker.listContainers({ limit: 1 }),
            'Health check'
          );
          try {
            dockerInfo = await dockerManager.executeWithRetry(
              async (docker) => await docker.version(),
              'Docker version check',
              { allowDegraded: true, fallbackValue: null }
            );
          } catch (versionError) {
            logger.debug('Could not retrieve Docker version info:', versionError.message);
          }
          dockerStatus = 'connected';
        } catch (testError) {
          dockerStatus = 'error';
          dockerDetails.testError = {
            message: testError.message,
            code: testError.code,
            type: dockerManager.classifyError(testError).type
          };
        }
      } else {
        dockerStatus = serviceStatus.status === 'degraded' ? 'degraded' : 'disconnected';
        dockerDetails = {
          lastError: connectionState.lastError ? {
            type: connectionState.lastError.type,
            code: connectionState.lastError.code,
            message: connectionState.lastError.message,
            userMessage: connectionState.lastError.userMessage,
            severity: connectionState.lastError.severity,
            recoverable: connectionState.lastError.recoverable,
            occurredAt: connectionState.lastError.occurredAt || new Date().toISOString()
          } : null,
          retryCount: connectionState.retryCount,
          maxRetries: connectionState.config.retryAttempts,
          nextRetryAt: connectionState.nextRetryAt,
          isRetrying: connectionState.isRetrying,
          lastSuccessfulConnection: connectionState.lastSuccessfulConnection,
          connectionAttempts: connectionState.retryCount + 1,
          circuitBreaker: connectionState.circuitBreaker
        };
      }

      const envValidation = EnvironmentManager.validateConfiguration();
      const networkValidation = NetworkManager.validateNetworkConfiguration();
      const corsOptions = EnvironmentManager.getCorsOptions();

      let overallStatus = 'OK';
      let httpStatus = 200;
      if (!envValidation.isValid || !networkValidation.isValid) {
        overallStatus = 'ERROR';
        httpStatus = 503;
      } else if (dockerStatus !== 'connected') {
        overallStatus = 'DEGRADED';
      }

      const healthResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        platform: {
          detected: envConfig.platform,
          process: process.platform,
          architecture: process.arch,
          nodeVersion: process.version,
          isContainerized: EnvironmentManager.isContainerized(),
          memory: {
            total: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
            free: Math.round(os.freemem() / 1024 / 1024 / 1024) + 'GB',
            usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
          }
        },
        environment: {
          mode: envConfig.environment,
          nodeEnv: envConfig.nodeEnv,
          validation: { isValid: envValidation.isValid, errors: envValidation.errors, warnings: envValidation.warnings }
        },
        cors: {
          mode: envConfig.environment === 'development' ? 'development' : 'production',
          origin: corsOptions.origin === '*' ? 'wildcard' :
                  Array.isArray(corsOptions.origin) ? corsOptions.origin :
                  typeof corsOptions.origin === 'function' ? 'function-based' : corsOptions.origin,
          credentials: corsOptions.credentials
        },
        network: {
          bindAddress: networkConfig.bindAddress,
          port: networkConfig.port,
          dockerSocket: networkConfig.dockerSocket,
          validation: { isValid: networkValidation.isValid, errors: networkValidation.errors, warnings: networkValidation.warnings }
        },
        docker: {
          status: dockerStatus,
          socketPath: connectionState.config?.socketPath || 'unknown',
          serviceMessage: serviceStatus.message,
          ...dockerDetails
        }
      };

      if (dockerInfo) {
        healthResponse.docker.version = {
          version: dockerInfo.Version,
          apiVersion: dockerInfo.ApiVersion,
          platform: dockerInfo.Os,
          arch: dockerInfo.Arch
        };
      }

      if (connectionState.isRetrying || connectionState.retryCount > 0) {
        healthResponse.docker.retry = {
          isRetrying: connectionState.isRetrying,
          retryCount: connectionState.retryCount,
          maxRetries: connectionState.config.retryAttempts,
          nextRetryAt: connectionState.nextRetryAt
        };
      }

      if (connectionState.lastError && !connectionState.lastError.recoverable) {
        healthResponse.docker.resolution = dockerManager.getResolutionSuggestion(connectionState.lastError.type);
      }

      res.status(httpStatus).json(healthResponse);
    } catch (error) {
      // A failure of the health handler itself must surface as 500 — returning
      // 200 here made monitoring read a broken endpoint as healthy (HLCE-265).
      sendError(res, 500, 'Health check error', error);
    }
  });

  router.get('/health/secrets', requireAuth, requireRole('admin'), (req, res) => {
    const SECRET_ROOT = process.env.SECRET_ROOT || '/run/secrets';
    const thresholds = {
      jwt_key_current: 90,
      sqlcipher_key: 180,
      alert_webhook_secret: 365,
    };

    const results = { stale: [], missing: [], ok: [] };

    for (const [name, maxDays] of Object.entries(thresholds)) {
      const filePath = path.join(SECRET_ROOT, name);
      try {
        const stat = fs.statSync(filePath);
        const ageDays = Math.floor((Date.now() - stat.mtimeMs) / 86400000);
        const entry = { name, age_days: ageDays, max_days: maxDays };
        if (ageDays > maxDays) {
          results.stale.push(entry);
        } else {
          results.ok.push(entry);
        }
      } catch {
        results.missing.push({ name, max_days: maxDays });
      }
    }

    const status = results.stale.length > 0 || results.missing.length > 0 ? 503 : 200;
    res.status(status).json(results);
  });

  return router;
}
