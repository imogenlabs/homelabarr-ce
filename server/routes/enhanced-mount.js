import { Router } from 'express';

const ALLOWED_PROVIDERS = ['local', 'google', 'dropbox', 'onedrive', 'sftp', 'webdav', 's3', 'b2', 'mega', 'box', 'ftp', 'smb', 'nfs'];

export default function enhancedMountRoutes({ sendError, dockerManager, requireAuth }) {
  const router = Router();

  // Validate the container-reported web port before any localhost fetch. The
  // enable/disable handlers already did this inline; the GET + auth handlers
  // didn't, leaving an inconsistent localhost-fetch surface (HLCE-267). Throws
  // (→ caught by each handler's try/catch → sendError) on a bad/out-of-range port.
  const safeWebPort = (webPort) => {
    const p = parseInt(webPort, 10);
    if (isNaN(p) || p < 1 || p > 65535) throw new Error('Invalid container web port');
    return p;
  };

  router.get('/:containerId/status', requireAuth, async (req, res) => {
    try {
      const { containerId } = req.params;

      // Get container info to find its web port
      const container = dockerManager.getDocker().getContainer(containerId);
      const containerInfo = await container.inspect();

      // Find the web interface port (default 8080)
      let webPort = 8080;
      if (containerInfo.NetworkSettings?.Ports) {
        const portMapping = containerInfo.NetworkSettings.Ports['8080/tcp'];
        if (portMapping && portMapping[0]) {
          webPort = portMapping[0].HostPort;
        }
      }

      // Proxy request to container's API
      const response = await fetch(`http://localhost:${safeWebPort(webPort)}/api/v2/status`);
      if (!response.ok) {
        throw new Error(`Container API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        containerId: containerId,
        data: data
      });
    } catch (error) {
      sendError(res, 500, 'Failed to fetch enhanced mount status', error);
    }
  });

  router.get('/:containerId/providers', requireAuth, async (req, res) => {
    try {
      const { containerId } = req.params;

      // Get container info to find its web port
      const container = dockerManager.getDocker().getContainer(containerId);
      const containerInfo = await container.inspect();

      let webPort = 8080;
      if (containerInfo.NetworkSettings?.Ports) {
        const portMapping = containerInfo.NetworkSettings.Ports['8080/tcp'];
        if (portMapping && portMapping[0]) {
          webPort = portMapping[0].HostPort;
        }
      }

      // Proxy request to container's API
      const response = await fetch(`http://localhost:${safeWebPort(webPort)}/api/v2/providers`);
      if (!response.ok) {
        throw new Error(`Container API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        containerId: containerId,
        data: data
      });
    } catch (error) {
      sendError(res, 500, 'Failed to fetch enhanced mount providers', error);
    }
  });

  router.get('/:containerId/costs', requireAuth, async (req, res) => {
    try {
      const { containerId } = req.params;

      // Get container info to find its web port
      const container = dockerManager.getDocker().getContainer(containerId);
      const containerInfo = await container.inspect();

      let webPort = 8080;
      if (containerInfo.NetworkSettings?.Ports) {
        const portMapping = containerInfo.NetworkSettings.Ports['8080/tcp'];
        if (portMapping && portMapping[0]) {
          webPort = portMapping[0].HostPort;
        }
      }

      // Proxy request to container's API
      const response = await fetch(`http://localhost:${safeWebPort(webPort)}/api/v2/costs`);
      if (!response.ok) {
        throw new Error(`Container API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        containerId: containerId,
        data: data
      });
    } catch (error) {
      sendError(res, 500, 'Failed to fetch enhanced mount costs', error);
    }
  });

  router.get('/:containerId/performance', requireAuth, async (req, res) => {
    try {
      const { containerId } = req.params;

      // Get container info to find its web port
      const container = dockerManager.getDocker().getContainer(containerId);
      const containerInfo = await container.inspect();

      let webPort = 8080;
      if (containerInfo.NetworkSettings?.Ports) {
        const portMapping = containerInfo.NetworkSettings.Ports['8080/tcp'];
        if (portMapping && portMapping[0]) {
          webPort = portMapping[0].HostPort;
        }
      }

      // Proxy request to container's API
      const response = await fetch(`http://localhost:${safeWebPort(webPort)}/api/v2/performance`);
      if (!response.ok) {
        throw new Error(`Container API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        containerId: containerId,
        data: data
      });
    } catch (error) {
      sendError(res, 500, 'Failed to fetch enhanced mount performance', error);
    }
  });

  router.post('/:containerId/providers/:provider/enable', requireAuth, async (req, res) => {
    try {
      const { containerId, provider } = req.params;
      const config = req.body;

      if (!ALLOWED_PROVIDERS.includes(provider)) {
        return res.status(400).json({ success: false, error: 'Invalid provider' });
      }

      // Get container info to find its web port
      const container = dockerManager.getDocker().getContainer(containerId);
      const containerInfo = await container.inspect();

      let webPort = 8080;
      if (containerInfo.NetworkSettings?.Ports) {
        const portMapping = containerInfo.NetworkSettings.Ports['8080/tcp'];
        if (portMapping && portMapping[0]) {
          webPort = portMapping[0].HostPort;
        }
      }

      const safePort = parseInt(webPort, 10);
      if (isNaN(safePort) || safePort < 1 || safePort > 65535) throw new Error('Invalid port');

      // Proxy request to container's API — provider is from allowlist
      const response = await fetch(`http://localhost:${safePort}/api/v2/providers/${provider}/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`Container API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        containerId: containerId,
        provider: provider,
        data: data
      });
    } catch (error) {
      sendError(res, 500, `Failed to enable provider ${req.params.provider}`, error);
    }
  });

  router.post('/:containerId/providers/:provider/disable', requireAuth, async (req, res) => {
    try {
      const { containerId, provider } = req.params;

      if (!ALLOWED_PROVIDERS.includes(provider)) {
        return res.status(400).json({ success: false, error: 'Invalid provider' });
      }

      // Get container info to find its web port
      const container = dockerManager.getDocker().getContainer(containerId);
      const containerInfo = await container.inspect();

      let webPort = 8080;
      if (containerInfo.NetworkSettings?.Ports) {
        const portMapping = containerInfo.NetworkSettings.Ports['8080/tcp'];
        if (portMapping && portMapping[0]) {
          webPort = portMapping[0].HostPort;
        }
      }

      const safePort = parseInt(webPort, 10);
      if (isNaN(safePort) || safePort < 1 || safePort > 65535) throw new Error('Invalid port');

      // Proxy request to container's API — provider is from allowlist
      const response = await fetch(`http://localhost:${safePort}/api/v2/providers/${provider}/disable`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Container API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        containerId: containerId,
        provider: provider,
        data: data
      });
    } catch (error) {
      sendError(res, 500, `Failed to disable provider ${req.params.provider}`, error);
    }
  });

  // Rclone Authentication endpoints
  router.post('/:containerId/auth/start', requireAuth, async (req, res) => {
    try {
      const { containerId } = req.params;
      const { provider } = req.body;

      // Get container info to find its web port
      const container = dockerManager.getDocker().getContainer(containerId);
      const containerInfo = await container.inspect();

      let webPort = 8080;
      if (containerInfo.NetworkSettings?.Ports) {
        const portMapping = containerInfo.NetworkSettings.Ports['8080/tcp'];
        if (portMapping && portMapping[0]) {
          webPort = portMapping[0].HostPort;
        }
      }

      // Proxy request to container's auth API
      const response = await fetch(`http://localhost:${safeWebPort(webPort)}/api/v2/auth/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider })
      });

      if (!response.ok) {
        throw new Error(`Container API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        containerId: containerId,
        data: data
      });
    } catch (error) {
      sendError(res, 500, 'Failed to start authentication', error);
    }
  });

  router.post('/:containerId/auth/complete', requireAuth, async (req, res) => {
    try {
      const { containerId } = req.params;
      const { provider, auth_code } = req.body;

      // Get container info to find its web port
      const container = dockerManager.getDocker().getContainer(containerId);
      const containerInfo = await container.inspect();

      let webPort = 8080;
      if (containerInfo.NetworkSettings?.Ports) {
        const portMapping = containerInfo.NetworkSettings.Ports['8080/tcp'];
        if (portMapping && portMapping[0]) {
          webPort = portMapping[0].HostPort;
        }
      }

      // Proxy request to container's auth API
      const response = await fetch(`http://localhost:${safeWebPort(webPort)}/api/v2/auth/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, auth_code })
      });

      if (!response.ok) {
        throw new Error(`Container API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        containerId: containerId,
        data: data
      });
    } catch (error) {
      sendError(res, 500, 'Failed to complete authentication', error);
    }
  });

  router.post('/:containerId/auth/api-key', requireAuth, async (req, res) => {
    try {
      const { containerId } = req.params;
      const { provider, credentials } = req.body;

      // Get container info to find its web port
      const container = dockerManager.getDocker().getContainer(containerId);
      const containerInfo = await container.inspect();

      let webPort = 8080;
      if (containerInfo.NetworkSettings?.Ports) {
        const portMapping = containerInfo.NetworkSettings.Ports['8080/tcp'];
        if (portMapping && portMapping[0]) {
          webPort = portMapping[0].HostPort;
        }
      }

      // Proxy request to container's auth API
      const response = await fetch(`http://localhost:${safeWebPort(webPort)}/api/v2/auth/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, credentials })
      });

      if (!response.ok) {
        throw new Error(`Container API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        containerId: containerId,
        data: data
      });
    } catch (error) {
      sendError(res, 500, 'Failed to configure API credentials', error);
    }
  });

  // Test rclone connection
  router.post('/:containerId/auth/test', requireAuth, async (req, res) => {
    try {
      const { containerId } = req.params;
      const { provider } = req.body;

      // Get container info to find its web port
      const container = dockerManager.getDocker().getContainer(containerId);
      const containerInfo = await container.inspect();

      let webPort = 8080;
      if (containerInfo.NetworkSettings?.Ports) {
        const portMapping = containerInfo.NetworkSettings.Ports['8080/tcp'];
        if (portMapping && portMapping[0]) {
          webPort = portMapping[0].HostPort;
        }
      }

      // Proxy request to container's test API
      const response = await fetch(`http://localhost:${safeWebPort(webPort)}/api/v2/auth/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider })
      });

      if (!response.ok) {
        throw new Error(`Container API returned ${response.status}`);
      }

      const data = await response.json();
      res.json({
        success: true,
        containerId: containerId,
        data: data
      });
    } catch (error) {
      sendError(res, 500, 'Failed to test connection', error);
    }
  });

  return router;
}
