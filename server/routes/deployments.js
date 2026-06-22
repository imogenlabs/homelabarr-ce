import { Router } from 'express';
import { randomUUID } from 'crypto';

export default function deploymentRoutes({ sendError, cliBridge, streamingCLIBridge, progressStream, authEnabled, requireAuth, optionalAuth }) {
  const router = Router();

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
      // Pass req so the stream can bind this client to the requesting session
      // and reflect a validated CORS origin (HLCE-284).
      progressStream.addClient(clientId, res, req);
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
      // Scope the subscription to the requesting session so a client can't
      // subscribe to a stream it doesn't own (HLCE-284). When auth is enabled the
      // session id is authoritative; with auth disabled it falls back to null,
      // which matches the null owner recorded for anonymous streams.
      const requestingSessionId = req.user?.id ?? req.sessionId ?? null;
      progressStream.subscribeToDeployment(clientId, deploymentId, requestingSessionId);
      res.json({ success: true, message: `Subscribed to deployment ${deploymentId}`, deploymentId, clientId });
    } catch (error) {
      if (error.code === 'SUBSCRIBE_FORBIDDEN') {
        return res.status(403).json({ error: 'Not authorized to subscribe to this deployment stream' });
      }
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
