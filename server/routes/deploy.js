import { Router } from 'express';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

export default function deployRoutes({
  dockerManager,
  cliBridge,
  streamingCLIBridge,
  sendError,
  getRequestMeta,
  logActivity,
  logger,
  authEnabled,
  requireAuth,
  optionalAuth,
}) {
  const router = Router();

  // POST /deploy — the frontend calls apiFetch('/deploy'), and every other
  // router here registers full resource paths (mounted at root). This route was
  // mistakenly registered at '/', so /api/deploy 404'd and deploy-from-UI was
  // unreachable in production (HLCE-226 — surfaced by the deploy E2E journey).
  router.post('/deploy', authEnabled ? requireAuth : optionalAuth, async (req, res) => {
    try {
      const { appId, config, mode } = req.body;
      logger.info(`🚀 Starting deployment of ${appId} using ${cliBridge ? 'CLI Bridge' : 'Template Mode'}...`);

      // Validate input
      if (!appId) {
        return res.status(400).json({
          error: 'App ID is required',
          details: 'Please provide a valid application identifier'
        });
      }

      if (!config || typeof config !== 'object') {
        return res.status(400).json({
          error: 'Configuration object is required',
          details: 'Please provide a valid configuration object with deployment parameters'
        });
      }

      // Check for special Docker CLI deployments first
      if (appId === 'it-tools') {
        logger.info('🐳 Using direct Docker CLI deployment for it-tools MVP (bypassing streaming)');

        try {
          const containerName = `homelabarr-${appId}-${Date.now()}`;
          const port = config.port || '8080';

          const dockerArgs = [
            'run',
            '-d',
            '--name', containerName,
            '--restart', 'unless-stopped',
            '-p', `${port}:80`,
            'corentinth/it-tools:latest'
          ];

          logger.info(`🐳 Deploying ${appId} with: docker ${dockerArgs.join(' ')}`);

          const dockerProcess = spawn('docker', dockerArgs, {
            stdio: ['pipe', 'pipe', 'pipe']
          });

          let output = '';
          let errorOutput = '';

          dockerProcess.stdout.on('data', (data) => {
            output += data.toString();
          });

          dockerProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
          });

          dockerProcess.on('close', (code) => {
            if (code === 0) {
              logger.info(`✅ Container ${containerName} deployed successfully`);
            } else {
              logger.error(`❌ Docker deployment failed with code ${code}: ${errorOutput}`);
            }
          });

          // Set timeout for the deployment
          setTimeout(() => {
            if (!res.headersSent) {
              dockerProcess.kill();
              return sendError(res, 500, 'Deployment timeout', new Error('Docker deployment took too long'));
            }
          }, 30000);

          // Return success immediately for MVP testing
          logActivity({
            userId: req.user?.id || 'anonymous',
            username: req.user?.username || 'Anonymous',
            action: 'application_deployed',
            targetType: 'application',
            targetId: appId,
            targetName: appId,
            details: { mode: 'docker-cli' },
            ...getRequestMeta(req)
          });

          return res.json({
            success: true,
            message: `${appId} deployed successfully using Docker CLI`,
            containerName,
            containerId: 'generated-by-docker',
            url: `http://localhost:${port}`,
            source: 'docker-cli',
            appId,
            port: parseInt(port)
          });

        } catch (cliError) {
          return sendError(res, 500, 'Docker CLI deployment failed', cliError);
        }
      }

      // Use Streaming CLI Bridge if available (preferred method)
      if (streamingCLIBridge) {
        try {
          const deploymentId = randomUUID();

          // Start deployment with streaming
          const deploymentPromise = streamingCLIBridge.deployApplicationWithProgress(
            appId,
            config,
            mode || { type: 'standard', useAuthentik: false },
            deploymentId
          );

          // Return immediately with deployment ID for streaming
          res.json({
            success: true,
            message: `${appId} deployment started with real-time progress tracking`,
            deploymentId,
            source: 'cli-streaming',
            appId,
            mode: mode || { type: 'standard' },
            streamEndpoint: `/stream/progress`,
            statusEndpoint: `/deployments/${deploymentId}/status`
          });

          logActivity({
            userId: req.user?.id || 'anonymous',
            username: req.user?.username || 'Anonymous',
            action: 'application_deployed',
            targetType: 'application',
            targetId: appId,
            targetName: appId,
            details: { mode },
            ...getRequestMeta(req)
          });

          // Continue deployment in background
          deploymentPromise.catch((error) => {
            logger.error('Background CLI deployment failed:', error.message);
          });

          return;
        } catch (cliError) {
          logger.error('Streaming CLI deployment failed:', cliError.message);
          logger.warn('Falling back to standard CLI mode');
        }
      }

      // Fallback to standard CLI Bridge for other apps
      if (cliBridge) {
        try {
          const deploymentResult = await cliBridge.deployApplication(appId, config, mode || { type: 'standard', useAuthentik: false });

          return res.json({
            success: true,
            message: `${appId} deployed successfully using HomelabARR CLI`,
            deployment: deploymentResult,
            source: 'cli',
            appId,
            mode: mode || { type: 'standard' }
          });
        } catch (cliError) {
          logger.error('CLI deployment failed:', cliError.message);
          // Fall back to template mode if CLI fails
          logger.warn('Falling back to template mode for deployment');
        }
      }

      // No deployment path matched (not it-tools, no streaming/CLI bridge, or
      // the CLI bridge failed and fell through): the app isn't deployable here.
      logger.info('No CLI deployment path available for', appId);
      return res.status(501).json({
        success: false,
        error: 'App not supported in CLI mode',
        details: `${appId} deployment not implemented yet. Try 'it-tools' for MVP testing.`,
        supportedApps: ['it-tools']
      });

      // NOTE: every reachable path above returns (it-tools spawn, streaming
      // bridge, CLI bridge, or this 501). The former template-mode dockerode
      // deploy tail and the two duplicate it-tools blocks here were unreachable
      // dead code and were removed (HLCE-229).
    } catch (error) {
      logger.error(`❌ Failed to deploy ${appId}:`, error.message);

      // Determine appropriate status code based on error type
      let statusCode = 500;
      if (error.dockerStatus === 'degraded') {
        statusCode = 503;
      } else if (error.message.includes('Port conflict')) {
        statusCode = 409;
      } else if (error.message.includes('Template not found')) {
        statusCode = 404;
      } else if (error.message.includes('required') || error.message.includes('invalid')) {
        statusCode = 400;
      }

      const errorResponse = dockerManager.createErrorResponse('Deploy container', error);
      errorResponse.appId = appId;
      errorResponse.step = error.step || 'deployment';

      res.status(statusCode).json(errorResponse);
    }
  });

  return router;
}
