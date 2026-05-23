import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

export default function applicationRoutes({ sendError, cliBridge, authEnabled, requireAuth, optionalAuth }) {

  router.get('/applications', async (req, res) => {
    try {
      if (cliBridge) {
        const applications = await cliBridge.getAvailableApplications();
        res.json({
          success: true,
          source: 'cli',
          applications,
          totalApps: Object.values(applications).flat().length,
          categories: Object.keys(applications)
        });
      } else {
        const templateDir = path.join(process.cwd(), 'server', 'templates');
        const templateFiles = fs.readdirSync(templateDir)
          .filter(file => file.endsWith('.yml'))
          .map(file => file.replace('.yml', ''));

        const templateApps = templateFiles.map(name => ({
          id: name,
          name,
          displayName: name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          description: `Docker application: ${name}`,
          image: `${name}:latest`,
          category: 'template',
          ports: { "80": "8080" },
          environment: {},
          requiresTraefik: false,
          requiresAuthelia: false
        }));

        res.json({
          success: true,
          source: 'templates',
          applications: { 'templates': templateApps },
          totalApps: templateFiles.length,
          categories: ['templates'],
          message: 'Using template mode - CLI integration unavailable'
        });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to load applications', error);
    }
  });

  router.post('/applications/:appId/stop', authEnabled ? requireAuth : optionalAuth, async (req, res) => {
    try {
      const { appId } = req.params;
      if (cliBridge) {
        const result = await cliBridge.stopApplication(appId);
        res.json({ success: true, message: `Application ${appId} stopped successfully`, result, source: 'cli' });
      } else {
        res.status(503).json({ error: 'CLI Bridge not available', details: 'Cannot manage applications without CLI integration' });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to stop application', error);
    }
  });

  router.delete('/applications/:appId', authEnabled ? requireAuth : optionalAuth, async (req, res) => {
    try {
      const { appId } = req.params;
      const { removeVolumes } = req.query;
      if (cliBridge) {
        const result = await cliBridge.removeApplication(appId, removeVolumes === 'true');
        res.json({ success: true, message: `Application ${appId} removed successfully`, result, source: 'cli' });
      } else {
        res.status(503).json({ error: 'CLI Bridge not available', details: 'Cannot manage applications without CLI integration' });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to remove application', error);
    }
  });

  router.get('/applications/:appId/logs', authEnabled ? requireAuth : optionalAuth, async (req, res) => {
    try {
      const { appId } = req.params;
      const { lines = 100 } = req.query;
      if (cliBridge) {
        const result = await cliBridge.getApplicationLogs(appId, parseInt(lines));
        res.json({ success: true, logs: result.stdout || result, source: 'cli', appId });
      } else {
        res.status(503).json({ error: 'CLI Bridge not available', details: 'Cannot retrieve logs without CLI integration' });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to get application logs', error);
    }
  });

  return router;
}
