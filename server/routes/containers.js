import { Router } from 'express';
import { execSync } from 'child_process';

function calculateCPUPercentage(stats) {
  if (!stats || !stats.cpu_stats || !stats.precpu_stats) return 0;
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuCount = stats.cpu_stats.online_cpus || 1;
  if (systemDelta <= 0 || cpuDelta < 0) return 0;
  const percentage = (cpuDelta / systemDelta) * cpuCount * 100;
  if (isNaN(percentage) || !isFinite(percentage)) return 0;
  return Math.min(percentage, cpuCount * 100);
}

function calculateMemoryUsage(stats) {
  if (!stats || !stats.memory_stats) return { usage: 0, limit: 0, percentage: 0 };
  const usage = Math.max(0, stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0));
  const limit = stats.memory_stats.limit || 1;
  const percentage = (usage / limit) * 100;
  return {
    usage,
    limit,
    percentage: isNaN(percentage) || !isFinite(percentage) ? 0 : Math.min(percentage, 100)
  };
}

function calculateNetworkUsage(stats) {
  if (!stats || !stats.networks) return {};
  return Object.entries(stats.networks).reduce((acc, [networkInterface, data]) => {
    acc[networkInterface] = { rx_bytes: data.rx_bytes, tx_bytes: data.tx_bytes };
    return acc;
  }, {});
}

function calculateUptime(container) {
  if (!container.State || !container.State.StartedAt) return 0;
  const startTime = new Date(container.State.StartedAt).getTime();
  return Math.floor((Date.now() - startTime) / 1000);
}

function parseMemoryUsage(memoryString) {
  const parts = memoryString.split(' / ');
  if (parts.length !== 2) return { usage: 0, limit: 0, percentage: 0 };
  const usage = parseBytes(parts[0].trim());
  const limit = parseBytes(parts[1].trim());
  const percentage = limit > 0 ? (usage / limit) * 100 : 0;
  return { usage, limit, percentage };
}

function parseNetworkUsage(networkString) {
  const parts = networkString.split(' / ');
  if (parts.length !== 2) return { rx: 0, tx: 0 };
  return {
    rx: parseBytes(parts[0].trim()),
    tx: parseBytes(parts[1].trim())
  };
}

function parseBytes(bytesString) {
  const match = bytesString.match(/^([\d.]+)\s*([KMGTPE]?i?B?)$/i);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  const multipliers = {
    'B': 1,
    'KB': 1000, 'KIB': 1024,
    'MB': 1000000, 'MIB': 1048576,
    'GB': 1000000000, 'GIB': 1073741824,
    'TB': 1000000000000, 'TIB': 1099511627776,
    'PB': 1000000000000000, 'PIB': 1125899906842624,
    'EB': 1000000000000000000, 'EIB': 1152921504606846976
  };

  return value * (multipliers[unit] || 1);
}

// Route factory

export default function containerRoutes({ dockerManager, requireAuth, getRequestMeta, logger, logActivity }) {
  const router = Router();

  router.get('/containers', requireAuth, async (req, res) => {
    try {
      // E2E harness opt-in: skip the synchronous `docker ps` shell-out. It blocks
      // the Node event loop, and when the runner has no/stalled Docker daemon it
      // hangs the whole backend (the dashboard then never finishes loading). The
      // UI suite doesn't exercise container management. Off by default; never set
      // in production.
      if (process.env.E2E_DISABLE_DOCKER === 'true') {
        return res.json({
          success: true,
          containers: [],
          docker: { status: 'disabled', message: 'Docker disabled for E2E' },
        });
      }

      const serviceStatus = { status: 'connected', message: 'CLI-based Docker access' };

      let containers = [];
      try {
        const command = 'docker ps -a --format json';
        const result = execSync(command, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
          shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/sh'
        });

        if (result && result.trim()) {
          const lines = result.trim().split('\n');
          containers = lines.map(line => {
            try {
              const container = JSON.parse(line);
              return {
                Id: container.ID,
                Names: container.Names ? [`/${container.Names}`] : [],
                Image: container.Image,
                State: container.State,
                Status: container.Status,
                Ports: container.Ports || '',
                Created: container.CreatedAt,
                Labels: container.Labels ? container.Labels.split(',').reduce((acc, label) => {
                  const [key, value] = label.split('=');
                  if (key) acc[key] = value || '';
                  return acc;
                }, {}) : {}
              };
            } catch (e) {
              logger.error('Error parsing container:', e);
              return null;
            }
          }).filter(Boolean);
        }
      } catch (error) {
        logger.error('Error fetching containers via CLI:', error);
        containers = [];
      }

      if (!containers || containers.length === 0) {
        return res.json({
          success: true,
          containers: [],
          docker: { status: serviceStatus.status, message: serviceStatus.message }
        });
      }

      const includeStats = req.query.stats === 'true';

      if (!includeStats) {
        const containersWithBasicInfo = containers.map((container) => ({
          ...container,
          Ports: typeof container.Ports === 'string' ? [{PublicPort: container.Ports.match(/:(\d+)->/)?.[1] || ''}] : [],
          stats: {
            cpu: 0,
            memory: { usage: 0, limit: 0, percentage: 0 },
            network: {},
            uptime: 0
          }
        }));
        return res.json({
          success: true,
          containers: containersWithBasicInfo,
          docker: { status: serviceStatus.status, message: serviceStatus.message }
        });
      }

      const containersWithStats = await Promise.all(
        containers.map(async (container) => {
          try {
            const [statsCommand, inspectCommand] = [
              `docker stats ${container.Id} --no-stream --format "table {{.CPUPerc}},{{.MemUsage}},{{.NetIO}},{{.PIDs}}"`,
              `docker inspect ${container.Id}`
            ];

            const [statsResult, inspectResult] = await Promise.all([
              execSync(statsCommand, {
                encoding: 'utf8',
                shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/sh'
              }),
              execSync(inspectCommand, {
                encoding: 'utf8',
                shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/sh'
              })
            ]);

            const info = JSON.parse(inspectResult)[0];
            const statsLines = statsResult.trim().split('\n');
            const statsData = statsLines.length > 1 ? statsLines[1].split(',') : ['0%', '0B / 0B', '0B / 0B', '0'];

            return {
              ...container,
              stats: {
                cpu: parseFloat(statsData[0]?.replace('%', '') || '0'),
                memory: parseMemoryUsage(statsData[1] || '0B / 0B'),
                network: parseNetworkUsage(statsData[2] || '0B / 0B'),
                uptime: calculateUptime(info)
              },
              config: info.Config,
              mounts: info.Mounts
            };
          } catch (error) {
            logger.warn(`Error fetching stats for container ${container.Id}:`, error.message);
            return {
              ...container,
              stats: {
                cpu: 0,
                memory: { usage: 0, limit: 0, percentage: 0 },
                network: {},
                uptime: 0
              },
              error: 'Failed to fetch container statistics'
            };
          }
        })
      );

      res.json({
        success: true,
        containers: containersWithStats,
        docker: { status: serviceStatus.status, message: serviceStatus.message }
      });
    } catch (error) {
      logger.error('Error fetching containers:', error);
      const errorResponse = dockerManager.createErrorResponse('List containers', error);
      res.status(error.dockerStatus === 'degraded' ? 503 : 500).json(errorResponse);
    }
  });

  router.get('/containers/:id/stats', requireAuth, async (req, res) => {
    try {
      const serviceStatus = dockerManager.getServiceStatus();

      if (serviceStatus.status === 'unavailable') {
        return res.status(503).json(
          dockerManager.createErrorResponse('Get container statistics', new Error(serviceStatus.message), false)
        );
      }

      const result = await dockerManager.executeWithRetry(
        async (docker) => {
          const containerInfo = docker.getContainer(req.params.id);
          const [stats, info] = await Promise.all([
            containerInfo.stats({ stream: false }),
            containerInfo.inspect()
          ]);

          return {
            stats: {
              cpu: calculateCPUPercentage(stats),
              memory: calculateMemoryUsage(stats),
              network: calculateNetworkUsage(stats),
              uptime: calculateUptime(info)
            }
          };
        },
        `Get container statistics for ${req.params.id}`,
        {
          allowDegraded: true,
          fallbackValue: {
            stats: {
              cpu: 0,
              memory: { usage: 0, limit: 0, percentage: 0 },
              network: {},
              uptime: 0
            }
          }
        }
      );

      res.json({
        success: true,
        containerId: req.params.id,
        ...result,
        docker: { status: serviceStatus.status, message: serviceStatus.message }
      });
    } catch (error) {
      logger.error(`Error fetching stats for container ${req.params.id}:`, error);
      const errorResponse = dockerManager.createErrorResponse('Get container statistics', error);
      res.status(error.dockerStatus === 'degraded' ? 503 : 500).json(errorResponse);
    }
  });

  router.post('/containers/:id/start', requireAuth, async (req, res) => {
    try {
      const serviceStatus = dockerManager.getServiceStatus();

      if (serviceStatus.status === 'unavailable') {
        return res.status(503).json(
          dockerManager.createErrorResponse('Start container', new Error(serviceStatus.message))
        );
      }

      await dockerManager.executeWithRetry(
        async (docker) => {
          const container = docker.getContainer(req.params.id);
          await container.start();
        },
        `Start container ${req.params.id}`
      );

      res.json({
        success: true,
        message: 'Container started successfully',
        containerId: req.params.id
      });

      logActivity({
        userId: req.user?.id || 'anonymous',
        username: req.user?.username || 'Anonymous',
        action: 'container_started',
        targetType: 'container',
        targetId: req.params.id,
        targetName: req.params.id,
        ...getRequestMeta(req)
      });
    } catch (error) {
      logger.error(`Error starting container ${req.params.id}:`, error);
      const errorResponse = dockerManager.createErrorResponse('Start container', error);
      res.status(error.dockerStatus === 'degraded' ? 503 : 500).json(errorResponse);
    }
  });

  router.post('/containers/:id/stop', requireAuth, async (req, res) => {
    try {
      const serviceStatus = dockerManager.getServiceStatus();

      if (serviceStatus.status === 'unavailable') {
        return res.status(503).json(
          dockerManager.createErrorResponse('Stop container', new Error(serviceStatus.message))
        );
      }

      await dockerManager.executeWithRetry(
        async (docker) => {
          const container = docker.getContainer(req.params.id);
          await container.stop();
        },
        `Stop container ${req.params.id}`
      );

      res.json({
        success: true,
        message: 'Container stopped successfully',
        containerId: req.params.id
      });

      logActivity({
        userId: req.user?.id || 'anonymous',
        username: req.user?.username || 'Anonymous',
        action: 'container_stopped',
        targetType: 'container',
        targetId: req.params.id,
        targetName: req.params.id,
        ...getRequestMeta(req)
      });
    } catch (error) {
      logger.error(`Error stopping container ${req.params.id}:`, error);
      const errorResponse = dockerManager.createErrorResponse('Stop container', error);
      res.status(error.dockerStatus === 'degraded' ? 503 : 500).json(errorResponse);
    }
  });

  router.post('/containers/:id/restart', requireAuth, async (req, res) => {
    try {
      const serviceStatus = dockerManager.getServiceStatus();

      if (serviceStatus.status === 'unavailable') {
        return res.status(503).json(
          dockerManager.createErrorResponse('Restart container', new Error(serviceStatus.message))
        );
      }

      await dockerManager.executeWithRetry(
        async (docker) => {
          const container = docker.getContainer(req.params.id);
          await container.restart();
        },
        `Restart container ${req.params.id}`
      );

      res.json({
        success: true,
        message: 'Container restarted successfully',
        containerId: req.params.id
      });

      logActivity({
        userId: req.user?.id || 'anonymous',
        username: req.user?.username || 'Anonymous',
        action: 'container_restarted',
        targetType: 'container',
        targetId: req.params.id,
        targetName: req.params.id,
        ...getRequestMeta(req)
      });
    } catch (error) {
      logger.error(`Error restarting container ${req.params.id}:`, error);
      const errorResponse = dockerManager.createErrorResponse('Restart container', error);
      res.status(error.dockerStatus === 'degraded' ? 503 : 500).json(errorResponse);
    }
  });

  router.delete('/containers/:id', requireAuth, async (req, res) => {
    try {
      const serviceStatus = dockerManager.getServiceStatus();

      if (serviceStatus.status === 'unavailable') {
        return res.status(503).json(
          dockerManager.createErrorResponse('Remove container', new Error(serviceStatus.message))
        );
      }

      await dockerManager.executeWithRetry(
        async (docker) => {
          const container = docker.getContainer(req.params.id);

          try {
            const info = await container.inspect();
            if (info.State.Running) {
              logger.info(`Stopping container ${req.params.id} before removal`);
              await container.stop();
            }
          } catch (stopError) {
            logger.warn(`Container ${req.params.id} may already be stopped:`, stopError.message);
          }

          await container.remove();
        },
        `Remove container ${req.params.id}`
      );

      res.json({
        success: true,
        message: 'Container removed successfully',
        containerId: req.params.id
      });

      logActivity({
        userId: req.user?.id || 'anonymous',
        username: req.user?.username || 'Anonymous',
        action: 'container_deleted',
        targetType: 'container',
        targetId: req.params.id,
        targetName: req.params.id,
        ...getRequestMeta(req)
      });
    } catch (error) {
      logger.error(`Error removing container ${req.params.id}:`, error);
      const errorResponse = dockerManager.createErrorResponse('Remove container', error);
      res.status(error.dockerStatus === 'degraded' ? 503 : 500).json(errorResponse);
    }
  });

  router.get('/containers/:id/logs', requireAuth, async (req, res) => {
    try {
      const serviceStatus = dockerManager.getServiceStatus();

      if (serviceStatus.status === 'unavailable') {
        return res.status(503).json(
          dockerManager.createErrorResponse('Get container logs', new Error(serviceStatus.message), false)
        );
      }

      const tail = parseInt(req.query.tail) || 100;

      const logs = await dockerManager.executeWithRetry(
        async (docker) => {
          const container = docker.getContainer(req.params.id);
          return await container.logs({
            stdout: true,
            stderr: true,
            tail: tail,
            timestamps: true
          });
        },
        `Get container logs for ${req.params.id}`,
        {
          allowDegraded: true,
          fallbackValue: Buffer.from('Logs unavailable: Docker service is not accessible\n')
        }
      );

      const logString = logs.toString('utf8');
      const cleanLogs = logString
        .split('\n')
        .map(line => {
          if (line.length > 8) {
            return line.substring(8);
          }
          return line;
        })
        .filter(line => line.trim().length > 0)
        .join('\n');

      res.json({
        success: true,
        logs: cleanLogs,
        containerId: req.params.id,
        docker: { status: serviceStatus.status, message: serviceStatus.message }
      });
    } catch (error) {
      logger.error(`Error fetching container logs for ${req.params.id}:`, error);
      const errorResponse = dockerManager.createErrorResponse('Get container logs', error);
      res.status(error.dockerStatus === 'degraded' ? 503 : 500).json(errorResponse);
    }
  });

  return router;
}
