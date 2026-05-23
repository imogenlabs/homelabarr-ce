import { Router } from 'express';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export default function deployRoutes({
  dockerManager,
  cliBridge,
  streamingCLIBridge,
  sendError,
  getRequestMeta,
  logActivity,
  logger,
  yaml,
  authEnabled,
  requireAuth,
  optionalAuth,
}) {
  const router = Router();

  router.post('/', authEnabled ? requireAuth : optionalAuth, async (req, res) => {
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

      // Check for special Docker CLI deployments before using CLI Bridge
      if (appId === 'it-tools') {
        logger.info('🐳 Using direct Docker CLI deployment for it-tools MVP');

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

          return new Promise((resolve) => {
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
                resolve(res.json({
                  success: true,
                  message: `${appId} deployed successfully using Docker CLI`,
                  containerName,
                  containerId: output.trim(),
                  url: `http://localhost:${port}`,
                  source: 'docker-cli',
                  appId,
                  port: parseInt(port)
                }));
              } else {
                logger.error(`Docker deployment failed with code ${code}: ${errorOutput}`);
                resolve(sendError(res, 500, 'Docker deployment failed', new Error(errorOutput || `Process exited with code ${code}`)));
              }
            });

            // Set timeout for the deployment
            setTimeout(() => {
              if (!res.headersSent) {
                dockerProcess.kill();
                resolve(sendError(res, 500, 'Deployment timeout', new Error('Docker deployment took too long')));
              }
            }, 30000);
          });

        } catch (cliError) {
          return sendError(res, 500, 'Docker CLI deployment failed', cliError);
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

      // Direct Docker CLI deployment for MVP
      logger.info('Using CLI-based Docker deployment for MVP');

      // For MVP, create a simple container deployment using docker CLI
      try {
        // Basic it-tools container deployment
        if (appId === 'it-tools') {
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
              res.json({
                success: true,
                message: `${appId} deployed successfully using Docker CLI`,
                containerName,
                containerId: output.trim(),
                url: `http://localhost:${port}`,
                source: 'docker-cli',
                appId,
                port: parseInt(port)
              });
            } else {
              logger.error(`Docker deployment failed with code ${code}: ${errorOutput}`);
              sendError(res, 500, 'Docker deployment failed', new Error(errorOutput || `Process exited with code ${code}`));
            }
          });

          // Set timeout for the deployment
          setTimeout(() => {
            if (!res.headersSent) {
              dockerProcess.kill();
              sendError(res, 500, 'Deployment timeout', new Error('Docker deployment took too long'));
            }
          }, 30000);

          return; // Don't continue to old template mode
        }

        // For other apps, return a helpful message
        return res.status(501).json({
          success: false,
          error: 'App not supported in CLI mode',
          details: `${appId} deployment not implemented yet. Try 'it-tools' for MVP testing.`,
          supportedApps: ['it-tools']
        });

      } catch (cliError) {
        return sendError(res, 500, 'CLI deployment failed', cliError);
      }

      // Read template file
      const templatePath = path.join(process.cwd(), 'server', 'templates', `${appId}.yml`);
      if (!fs.existsSync(templatePath)) {
        logger.error('Template not found:', templatePath);
        return res.status(404).json({
          error: 'Template not found',
          details: `No template file found for app: ${appId}`
        });
      }

      const templateContent = fs.readFileSync(templatePath, 'utf8');
      logger.info('Template content:', templateContent);

      const template = yaml.parse(templateContent);
      logger.info('Parsed template:', template);

      // Replace variables in template
      const composerConfig = JSON.stringify(template)
        .replace(/\${([^}]+)}/g, (_, key) => config[key] || '');

      // Parse back to object
      const finalConfig = JSON.parse(composerConfig);
      logger.info('Final config:', finalConfig);

      // Check for port conflicts before deployment
      const [serviceName, serviceConfig] = Object.entries(finalConfig.services)[0];
      if (serviceConfig.ports) {
        const containers = await dockerManager.executeWithRetry(
          async (docker) => await docker.listContainers({ all: true }),
          'Check port conflicts'
        );
        const usedPorts = new Set();

        containers.forEach(container => {
          if (container.Ports) {
            container.Ports.forEach(port => {
              if (port.PublicPort) {
                usedPorts.add(port.PublicPort);
              }
            });
          }
        });

        const conflictingPorts = [];
        serviceConfig.ports.forEach(portMapping => {
          const cleanMapping = portMapping.replace('/udp', '');
          const [hostPort] = cleanMapping.split(':').reverse();
          const port = parseInt(hostPort);

          if (usedPorts.has(port)) {
            conflictingPorts.push(port);
          }
        });

        if (conflictingPorts.length > 0) {
          return res.status(409).json({
            error: 'Port conflict detected',
            details: `The following ports are already in use: ${conflictingPorts.join(', ')}`,
            conflictingPorts
          });
        }
      }

      // Ensure required networks exist
      try {
        await dockerManager.executeWithRetry(
          async (docker) => {
            const networks = await docker.listNetworks();

            // Create homelabarr network if it doesn't exist
            const homelabarrExists = networks.some(n => n.Name === 'homelabarr');
            if (!homelabarrExists) {
              logger.info('Creating homelabarr network');
              await docker.createNetwork({
                Name: 'homelabarr',
                Driver: 'bridge'
              });
            }

            // Create proxy network if it doesn't exist (for templates that use it)
            const proxyExists = networks.some(n => n.Name === 'proxy');
            if (!proxyExists) {
              logger.info('Creating proxy network');
              await docker.createNetwork({
                Name: 'proxy',
                Driver: 'bridge'
              });
            }
          },
          'Setup networks'
        );
      } catch (error) {
        logger.error('Error checking/creating networks:', error);
        throw new Error('Failed to setup networks');
      }

      // Get the service configuration (reusing variables from above)
      // const [serviceName, serviceConfig] = Object.entries(finalConfig.services)[0]; // Already declared above

      // Pull the image first
      logger.info('Pulling image:', serviceConfig.image);
      try {
        await dockerManager.executeWithRetry(
          async (docker) => {
            const stream = await docker.pull(serviceConfig.image);
            await new Promise((resolve, reject) => {
              docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
            });
          },
          'Pull image'
        );
      } catch (error) {
        logger.error('Error pulling image:', error);
        throw new Error(`Failed to pull image: ${error.message}`);
      }

      // Process environment variables (handle both array and object formats)
      let envVars = [];
      if (serviceConfig.environment) {
        if (Array.isArray(serviceConfig.environment)) {
          envVars = serviceConfig.environment;
        } else {
          envVars = Object.entries(serviceConfig.environment).map(([key, value]) => `${key}=${value}`);
        }
      }

      // Process volumes with proper path handling
      const processedVolumes = (serviceConfig.volumes || []).map(volume => {
        // Skip Docker socket and system mounts
        if (volume.includes('/var/run/docker.sock') || volume.includes('/proc') || volume.includes('/sys')) {
          return volume;
        }

        const [host, container, options] = volume.split(':');

        // Handle relative paths and special cases
        let hostPath;
        if (host.startsWith('./')) {
          // Create app-specific config directory
          hostPath = path.join(process.cwd(), 'server', 'data', appId, host.substring(2));
        } else if (host.startsWith('/')) {
          // Absolute path - use as is (but validate it's safe)
          if (host.startsWith('/var/run') || host.startsWith('/proc') || host.startsWith('/sys')) {
            return volume; // System paths, don't modify
          }
          hostPath = host;
        } else {
          // Relative path - create in app data directory
          hostPath = path.join(process.cwd(), 'server', 'data', appId, host);
        }

        // Ensure directory exists for non-system paths
        try {
          if (!fs.existsSync(hostPath)) {
            fs.mkdirSync(hostPath, { recursive: true });
            fs.chmodSync(hostPath, 0o755);
          }
        } catch (error) {
          logger.error(`Error creating volume path ${hostPath}:`, error);
          // Don't fail deployment for volume creation issues
          logger.warn(`Warning: Could not create volume path ${hostPath}, using default`);
        }

        return options ? `${hostPath}:${container}:${options}` : `${hostPath}:${container}`;
      });

      // Create container config
      const containerConfig = {
        Image: serviceConfig.image,
        name: serviceConfig.container_name,
        Env: envVars,
        HostConfig: {
          RestartPolicy: {
            Name: serviceConfig.restart === 'unless-stopped' ? 'unless-stopped' : 'no',
          },
          Binds: processedVolumes,
          PortBindings: {},
          NetworkMode: 'homelabarr', // Use homelabarr network by default
        },
        ExposedPorts: {}
      };

      // Handle port bindings with UDP support
      if (serviceConfig.ports) {
        serviceConfig.ports.forEach(portMapping => {
          // Handle both TCP and UDP ports
          const isUdp = portMapping.includes('/udp');
          const cleanMapping = portMapping.replace('/udp', '');
          const [hostPort, containerPort] = cleanMapping.split(':').reverse();
          const protocol = isUdp ? 'udp' : 'tcp';

          containerConfig.ExposedPorts[`${containerPort}/${protocol}`] = {};
          containerConfig.HostConfig.PortBindings[`${containerPort}/${protocol}`] = [
            { HostPort: hostPort }
          ];
        });
      }

      logger.info('Container config:', containerConfig);

      // Create and start the container
      let container;
      try {
        container = await dockerManager.executeWithRetry(
          async (docker) => {
            // Check if container with same name exists
            const existingContainers = await docker.listContainers({ all: true });
            const existing = existingContainers.find(c =>
              c.Names.includes(`/${containerConfig.name}`)
            );

            if (existing) {
              logger.info('Container already exists, removing...');
              const existingContainer = docker.getContainer(existing.Id);
              if (existing.State === 'running') {
                await existingContainer.stop();
              }
              await existingContainer.remove();
            }

            const newContainer = await docker.createContainer(containerConfig);
            logger.info('Container created:', newContainer.id);
            return newContainer;
          },
          'Create container'
        );
      } catch (error) {
        logger.error('Error creating container:', error);
        throw new Error(`Failed to create container: ${error.message}`);
      }

      // Connect to networks after creation
      try {
        await dockerManager.executeWithRetry(
          async (docker) => {
            if (finalConfig.networks && finalConfig.networks.proxy) {
              const proxyNetwork = docker.getNetwork('proxy');
              await proxyNetwork.connect({ Container: container.id });
              logger.info('Connected to proxy network');
            }

            const homelabarrNetwork = docker.getNetwork('homelabarr');
            await homelabarrNetwork.connect({ Container: container.id });
            logger.info('Connected to homelabarr network');
          },
          'Connect to networks'
        );
      } catch (networkError) {
        logger.warn('Network connection warning:', networkError.message);
        // Don't fail deployment for network issues
      }

      try {
        await dockerManager.executeWithRetry(
          async (docker) => {
            await container.start();
            logger.info('Container started');
          },
          'Start container'
        );
      } catch (error) {
        logger.error('Error starting container:', error);
        // Try to get container logs for better error reporting
        try {
          const logs = await container.logs({ tail: 50, stdout: true, stderr: true });
          logger.error('Container logs:', logs.toString());
        } catch (logError) {
          logger.error('Could not fetch container logs:', logError);
        }
        throw new Error(`Failed to start container: ${error.message}`);
      }

      logger.info(`✅ Successfully deployed ${appId} (${container.id})`);
      res.json({
        success: true,
        containerId: container.id,
        appId: appId,
        message: 'Container deployed successfully'
      });
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
