import { Router } from 'express';
import { execSync } from 'child_process';

export default function portRoutes({ sendError, requireAuth, dockerManager, logger }) {
  const router = Router();

  router.get('/ports/check', requireAuth, async (req, res) => {
    try {
      try {
        const command = 'docker ps -a --format json';
        const result = execSync(command, {
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
          shell: '/bin/sh'
        });

        const usedPorts = new Set();
        const lines = result.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const container = JSON.parse(line);
            if (container.Ports) {
              const portMatches = container.Ports.match(/(\d+)->/g);
              if (portMatches) {
                portMatches.forEach(match => {
                  const port = parseInt(match.replace('->', ''));
                  if (port) usedPorts.add(port);
                });
              }
            }
          } catch {}
        }

        return res.json({
          success: true,
          usedPorts: Array.from(usedPorts),
          docker: { status: 'connected', message: 'Docker CLI integration active' },
          source: 'cli'
        });
      } catch (dockerError) {
        logger.warn('Docker CLI not available, using fallback:', dockerError.message);
        return res.json({
          success: true,
          usedPorts: [30002, 8083],
          docker: { status: 'template-mode', message: 'Docker unavailable - using template mode' },
          source: 'template-fallback'
        });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to check ports', error);
    }
  });

  router.get('/ports/available', requireAuth, async (req, res) => {
    try {
      const serviceStatus = dockerManager.getServiceStatus();
      if (serviceStatus.status === 'unavailable') {
        return res.status(503).json(
          dockerManager.createErrorResponse('Find available port', new Error(serviceStatus.message), false)
        );
      }

      const startPort = parseInt(req.query.start) || 8000;
      const endPort = parseInt(req.query.end) || 9000;

      const containers = await dockerManager.executeWithRetry(
        async (docker) => await docker.listContainers({ all: true }),
        'Find available port',
        { allowDegraded: true, fallbackValue: [] }
      );

      const usedPorts = new Set();
      containers.forEach(container => {
        if (container.Ports) {
          container.Ports.forEach(port => {
            if (port.PublicPort) usedPorts.add(port.PublicPort);
          });
        }
      });

      for (let port = startPort; port <= endPort; port++) {
        if (!usedPorts.has(port)) {
          return res.json({
            success: true,
            availablePort: port,
            docker: { status: serviceStatus.status, message: serviceStatus.message }
          });
        }
      }

      res.status(404).json({
        error: 'No available ports found in range',
        details: `Checked ports ${startPort}-${endPort}`,
        searchRange: { start: startPort, end: endPort },
        usedPorts: Array.from(usedPorts).sort((a, b) => a - b)
      });
    } catch (error) {
      logger.error('Error finding available port:', error);
      const errorResponse = dockerManager.createErrorResponse('Find available port', error);
      res.status(error.dockerStatus === 'degraded' ? 503 : 500).json(errorResponse);
    }
  });

  return router;
}
