import { Router } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

export default function deploymentRoutes({ sendError, cliBridge, streamingCLIBridge, progressStream, authEnabled, requireAuth, optionalAuth }) {

  router.get('/deployment-modes', (req, res) => {
    res.json({
      success: true,
      modes: [
        {
          type: 'standard',
          name: 'Standard',
          description: 'Basic Docker deployment without reverse proxy',
          features: ['Direct port access', 'Basic networking', 'Suitable for development']
        },
        {
          type: 'traefik',
          name: 'Traefik',
          description: 'Deployment with Traefik reverse proxy and SSL',
          features: ['Automatic SSL certificates', 'Domain routing', 'Load balancing', 'Production ready']
        },
        {
          type: 'authelia',
          name: 'Traefik + Authelia',
          description: 'Full production deployment with authentication',
          features: ['All Traefik features', 'Multi-factor authentication', 'User management', 'Maximum security']
        }
      ],
      cliAvailable: !!cliBridge
    });
  });

  router.get('/stream/progress', requireAuth, (req, res) => {
    const clientId = randomUUID();
    try {
      progressStream.addClient(clientId, res);
      const stats = progressStream.getStatistics();
      progressStream.sendToClient(clientId, 'statistics', stats);
    } catch (error) {
      sendError(res, 500, 'Failed to setup progress stream', error);
    }
  });

  router.post('/stream/deployments/:deploymentId/subscribe', authEnabled ? requireAuth : optionalAuth, (req, res) => {
    try {
      const { deploymentId } = req.params;
      const { clientId } = req.body;
      if (!clientId) {
        return res.status(400).json({ error: 'Client ID is required' });
      }
      progressStream.subscribeToDeployment(clientId, deploymentId);
      res.json({ success: true, message: `Subscribed to deployment ${deploymentId}`, deploymentId, clientId });
    } catch (error) {
      sendError(res, 500, 'Failed to subscribe to deployment', error);
    }
  });

  router.get('/deployments/:deploymentId/status', authEnabled ? requireAuth : optionalAuth, (req, res) => {
    try {
      const { deploymentId } = req.params;
      if (streamingCLIBridge) {
        const status = streamingCLIBridge.getDeploymentStatus(deploymentId);
        if (status) {
          res.json({ success: true, deployment: status });
        } else {
          res.status(404).json({ error: 'Deployment not found', deploymentId });
        }
      } else {
        res.status(503).json({ error: 'Streaming CLI Bridge not available' });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to get deployment status', error);
    }
  });

  router.get('/deployments/active', authEnabled ? requireAuth : optionalAuth, (req, res) => {
    try {
      if (streamingCLIBridge) {
        const deployments = streamingCLIBridge.getActiveDeployments();
        res.json({ success: true, deployments, count: deployments.length });
      } else {
        res.json({ success: true, deployments: [], count: 0, message: 'Streaming CLI Bridge not available' });
      }
    } catch (error) {
      sendError(res, 500, 'Failed to get active deployments', error);
    }
  });

  return router;
}
