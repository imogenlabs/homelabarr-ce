import Docker from 'dockerode';
import { EnvironmentManager } from './environment-manager.js';
import { NetworkManager } from './network-manager.js';
import { DeploymentLogger } from './deployment-logger.js';
import { classifyDockerError, generateTroubleshootingInfo, getResolutionSuggestion } from './docker-errors.js';

const envConfig = EnvironmentManager.getConfiguration();
const isDevelopment = envConfig.environment === 'development';
const logLevel = envConfig.logLevel;

const logger = {
  info: (message, ...args) => console.log(`ℹ️  ${message}`, ...args),
  warn: (message, ...args) => console.warn(`⚠️  ${message}`, ...args),
  error: (message, ...args) => console.error(`❌ ${message}`, ...args),
  debug: (message, ...args) => {
    if (isDevelopment || logLevel === 'debug') console.log(`🐛 ${message}`, ...args);
  },

  dockerConnection: (level, message, context = {}) => {
    return DeploymentLogger.logNetworkActivity(`Docker: ${message}`, {
      level,
      dockerContext: context,
      component: 'DockerConnectionManager'
    });
  },

  dockerStateChange: (fromState, toState, context = {}) => {
    return DeploymentLogger.logDockerStateChange(fromState, toState, context);
  },

  dockerRetry: (attempt, maxAttempts, delay, error, context = {}) => {
    return DeploymentLogger.logDockerRetry(attempt, maxAttempts, delay, error, context);
  },

  dockerOperationFailed: (operation, error, troubleshooting = {}) => {
    return DeploymentLogger.logDockerOperationFailed(operation, error, troubleshooting);
  }
};

class DockerConnectionManager {
  constructor(options = {}) {
    const dockerConfig = EnvironmentManager.getDockerConfig();
    const networkConfig = NetworkManager.getConfiguration();

    this.config = {
      socketPath: options.socketPath || dockerConfig.socketPath,
      timeout: options.timeout || dockerConfig.timeout,
      retryAttempts: options.retryAttempts || 5,
      retryDelay: options.retryDelay || 1000,
      healthCheckInterval: options.healthCheckInterval || 30000,
      maxRetryDelay: options.maxRetryDelay || 30000,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 3,
      circuitBreakerTimeout: options.circuitBreakerTimeout || 60000,
      platform: networkConfig.platform
    };

    this.state = {
      isConnected: false,
      lastError: null,
      lastSuccessfulConnection: null,
      retryCount: 0,
      nextRetryAt: null,
      isRetrying: false
    };

    // Circuit breaker state
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      consecutiveFailures: 0,
      lastFailureTime: null,
      nextAttemptTime: null
    };

    this.docker = null;
    this.healthCheckTimer = null;
    this.retryTimer = null;
    this.statsLogTimer = null;

    // Log initialization with platform-specific context
    logger.dockerConnection('info', 'Initializing Docker Connection Manager', {
      config: {
        ...this.config,
        socketPath: this.config.socketPath // Show actual socket path being used
      },
      platform: this.config.platform,
      platformDetails: this.getPlatformDetails(),
      nodeVersion: process.version,
      environment: envConfig.environment,
      isContainerized: EnvironmentManager.isContainerized(),
      dockerSocketType: this.getDockerSocketType()
    });

    // Initialize connection with error handling
    this.initializeConnection();
    this.startHealthCheck();
    this.startStatsLogging();
  }

  /**
   * Initialize Docker connection with graceful error handling
   * This method won't crash the application if Docker is unavailable
   */
  async initializeConnection() {
    try {
      logger.dockerConnection('info', 'Attempting initial Docker connection with enhanced error handling');

      // Add a delay to allow Docker socket to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      await this.connect();
      logger.dockerConnection('info', 'Initial Docker connection successful');
    } catch (error) {
      logger.dockerConnection('warn', 'Initial Docker connection failed - will retry automatically', {
        error: error.message,
        code: error.code,
        willRetry: true,
        retryInterval: this.config.retryDelay
      });

      // Don't throw - let the health check handle retries
      this.state.isConnected = false;
      this.state.lastError = this.classifyError(error);

      // For Windows Docker Desktop, disable Docker functionality if modem errors occur
      if (error.message && error.message.includes('Cannot read properties of undefined')) {
        logger.dockerConnection('error', 'Docker modem error detected - disabling Docker functionality for stability');
        this.state.lastError = {
          type: 'modem_error',
          code: 'MODEM_ERROR',
          message: 'Docker modem initialization failed',
          userMessage: 'Docker functionality disabled due to Windows Docker Desktop compatibility issues',
          severity: 'error',
          recoverable: false,
          occurredAt: new Date().toISOString()
        };
      }
    }
  }

  /**
   * Get platform-specific details for logging and troubleshooting
   * @returns {Object} Platform details
   */
  getPlatformDetails() {
    const details = {
      platform: this.config.platform,
      arch: process.arch,
      nodeVersion: process.version
    };

    if (this.config.platform === 'windows') {
      details.dockerSocketType = 'named_pipe';
      details.expectedSocketPath = '\\\\.\\pipe\\docker_engine';
      details.commonIssues = [
        'Docker Desktop not running',
        'Named pipe access permissions',
        'Windows container mode vs Linux container mode'
      ];
    } else {
      details.dockerSocketType = 'unix_socket';
      details.expectedSocketPath = '/var/run/docker.sock';
      details.commonIssues = [
        'Docker daemon not running',
        'Socket file permissions',
        'User not in docker group',
        'Socket not mounted in container'
      ];
    }

    return details;
  }

  /**
   * Determine the type of Docker socket being used
   * @returns {string} Socket type
   */
  getDockerSocketType() {
    if (this.config.platform === 'windows' || this.config.socketPath.includes('pipe')) {
      return 'named_pipe';
    }
    return 'unix_socket';
  }

  /**
   * Get platform-specific Docker connection options
   * @returns {Object} Docker connection options
   */
  getPlatformSpecificDockerOptions() {
    // C-R4-1: Support DOCKER_HOST=tcp://socket-proxy:2375 for socket proxy
    const dockerHost = process.env.DOCKER_HOST;
    if (dockerHost && dockerHost.startsWith('tcp://')) {
      const url = new URL(dockerHost);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 2375,
        protocol: 'http',
        timeout: this.config.timeout,
      };
    }

    const baseOptions = {
      socketPath: this.config.socketPath,
      timeout: this.config.timeout
    };

    if (this.config.platform === 'windows') {
      baseOptions.protocol = 'npipe';
      if (!this.config.socketPath.includes('pipe')) {
        baseOptions.socketPath = '\\\\.\\pipe\\docker_engine';
      }
    } else {
      baseOptions.protocol = 'unix';
    }

    return baseOptions;
  }

  /**
   * Get platform-specific connection information for logging
   * @returns {Object} Platform connection info
   */
  getPlatformConnectionInfo() {
    const info = {
      platform: this.config.platform,
      socketType: this.getDockerSocketType(),
      actualSocketPath: this.config.socketPath
    };

    if (this.config.platform === 'windows') {
      info.namedPipeInfo = {
        isDefaultPipe: this.config.socketPath.includes('docker_engine'),
        pipeFormat: this.config.socketPath.startsWith('\\\\.\\pipe\\') ? 'correct' : 'non_standard'
      };
    } else {
      info.unixSocketInfo = {
        isDefaultSocket: this.config.socketPath === '/var/run/docker.sock',
        isContainerized: EnvironmentManager.isContainerized(),
        expectedMountPath: '/var/run/docker.sock'
      };
    }

    return info;
  }

  // Start periodic statistics logging
  startStatsLogging() {
    // Log stats every 5 minutes in production, every minute in development
    const statsInterval = isDevelopment ? 60000 : 300000;

    logger.dockerConnection('debug', 'Starting periodic statistics logging', {
      interval: statsInterval,
      intervalMinutes: statsInterval / 60000
    });

    this.statsLogTimer = setInterval(() => {
      this.logConnectionStats();
    }, statsInterval);
  }

  async connect() {
    const previousState = this.state.isConnected ? 'connected' : 'disconnected';

    // Check circuit breaker before attempting connection
    if (!this.canAttemptConnection()) {
      const timeUntilNextAttempt = this.circuitBreaker.nextAttemptTime ?
        this.circuitBreaker.nextAttemptTime.getTime() - Date.now() : 0;

      logger.dockerConnection('warn', 'Connection attempt blocked by circuit breaker', {
        circuitBreakerState: this.circuitBreaker.state,
        consecutiveFailures: this.circuitBreaker.consecutiveFailures,
        timeUntilNextAttempt,
        nextAttemptTime: this.circuitBreaker.nextAttemptTime?.toISOString()
      });

      return false;
    }

    try {
      logger.dockerConnection('debug', 'Initiating Docker connection attempt', {
        socketPath: this.config.socketPath,
        timeout: this.config.timeout,
        retryCount: this.state.retryCount,
        previousConnectionState: previousState,
        circuitBreakerState: this.circuitBreaker.state,
        consecutiveFailures: this.circuitBreaker.consecutiveFailures,
        platform: this.config.platform,
        socketType: this.getDockerSocketType(),
        platformDetails: this.getPlatformDetails()
      });

      // Use platform-specific Docker connection options
      const dockerOptions = this.getPlatformSpecificDockerOptions();

      let testResult;
      try {
        // Add additional error handling for Windows Docker Desktop modem issues
        if (this.config.platform === 'windows' || process.platform === 'win32') {
          logger.dockerConnection('debug', 'Applying Windows-specific Docker connection handling');
        }

        this.docker = new Docker(dockerOptions);

        logger.dockerConnection('debug', 'Created Docker client with platform-specific options', {
          options: dockerOptions,
          platform: this.config.platform,
          socketType: this.getDockerSocketType()
        });

        // Test the connection by listing containers with detailed logging
        logger.dockerConnection('debug', 'Testing Docker connection with container list operation');

        // Add timeout to prevent hanging on modem errors
        const testPromise = this.docker.listContainers({ limit: 1 });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Docker connection test timeout')), 5000)
        );

        testResult = await Promise.race([testPromise, timeoutPromise]);

        logger.dockerConnection('debug', 'Docker connection test successful', {
          testContainers: testResult.length
        });
      } catch (dockerError) {
        logger.dockerConnection('error', 'Failed to create or test Docker client', {
          error: dockerError.message,
          code: dockerError.code,
          platform: this.config.platform,
          socketPath: this.config.socketPath,
          isModemError: dockerError.message && dockerError.message.includes('Cannot read properties of undefined')
        });

        // Special handling for modem errors - these are typically unrecoverable
        if (dockerError.message && dockerError.message.includes('Cannot read properties of undefined')) {
          logger.dockerConnection('error', 'Docker modem error detected - this typically indicates Docker socket access issues');
          const modemError = new Error('Docker modem initialization failed - check Docker socket access');
          modemError.code = 'MODEM_ERROR';
          modemError.recoverable = false;
          throw modemError;
        }

        // Don't throw here for other errors - let the connection be retried later
        this.docker = null;
        throw dockerError;
      }

      // Log successful connection with context
      const connectionContext = {
        socketPath: this.config.socketPath,
        testContainers: testResult.length,
        connectionDuration: this.state.lastSuccessfulConnection ?
          Date.now() - this.state.lastSuccessfulConnection.getTime() : 'first_connection',
        previousRetryCount: this.state.retryCount,
        circuitBreakerState: this.circuitBreaker.state,
        consecutiveFailures: this.circuitBreaker.consecutiveFailures,
        platform: this.config.platform,
        socketType: this.getDockerSocketType(),
        platformSpecificInfo: this.getPlatformConnectionInfo()
      };

      this.state.isConnected = true;
      this.state.lastError = null;
      this.state.lastSuccessfulConnection = new Date();
      this.state.retryCount = 0;
      this.state.nextRetryAt = null;
      this.state.isRetrying = false;

      // Update circuit breaker on successful connection
      this.updateCircuitBreakerOnSuccess();

      // Log state change
      logger.dockerStateChange(previousState, 'connected', connectionContext);

      logger.dockerConnection('info', 'Docker connection established successfully', connectionContext);
      return true;
    } catch (error) {
      logger.dockerConnection('debug', 'Docker connection attempt failed, handling error', {
        errorCode: error.code,
        errorMessage: error.message,
        socketPath: this.config.socketPath,
        retryCount: this.state.retryCount,
        circuitBreakerState: this.circuitBreaker.state,
        consecutiveFailures: this.circuitBreaker.consecutiveFailures,
        platform: this.config.platform,
        socketType: this.getDockerSocketType(),
        platformSpecificInfo: this.getPlatformConnectionInfo()
      });

      this.handleConnectionError(error);
      return false;
    }
  }

  handleConnectionError(error) {
    const previousState = this.state.isConnected ? 'connected' : 'disconnected';

    this.state.isConnected = false;
    this.state.lastError = this.classifyError(error);
    this.docker = null;

    // Update circuit breaker state
    this.updateCircuitBreakerOnFailure();

    // Generate troubleshooting information based on error type
    const troubleshooting = this.generateTroubleshootingInfo(this.state.lastError);

    // Log the connection failure with comprehensive context
    logger.dockerOperationFailed('Docker connection', this.state.lastError, troubleshooting);

    // Log state change
    logger.dockerStateChange(previousState, 'disconnected', {
      errorType: this.state.lastError.type,
      errorCode: this.state.lastError.code,
      retryCount: this.state.retryCount,
      recoverable: this.state.lastError.recoverable,
      circuitBreakerState: this.circuitBreaker.state,
      consecutiveFailures: this.circuitBreaker.consecutiveFailures,
      platform: this.config.platform,
      socketType: this.getDockerSocketType(),
      platformSpecificInfo: this.getPlatformConnectionInfo()
    });

    // Check circuit breaker state before attempting retry
    if (this.circuitBreaker.state === 'OPEN') {
      logger.dockerConnection('warn', 'Circuit breaker is OPEN, blocking retry attempts', {
        consecutiveFailures: this.circuitBreaker.consecutiveFailures,
        threshold: this.config.circuitBreakerThreshold,
        nextAttemptTime: this.circuitBreaker.nextAttemptTime?.toISOString(),
        timeUntilNextAttempt: this.circuitBreaker.nextAttemptTime ?
          this.circuitBreaker.nextAttemptTime.getTime() - Date.now() : null
      });
      this.state.isRetrying = false;
      return;
    }

    if (this.state.lastError.recoverable && this.state.retryCount < this.config.retryAttempts) {
      logger.dockerConnection('info', 'Error is recoverable, scheduling retry', {
        errorType: this.state.lastError.type,
        retryCount: this.state.retryCount,
        maxRetries: this.config.retryAttempts,
        recoverable: this.state.lastError.recoverable,
        circuitBreakerState: this.circuitBreaker.state,
        consecutiveFailures: this.circuitBreaker.consecutiveFailures
      });
      this.scheduleRetry();
    } else {
      const finalFailureContext = {
        errorType: this.state.lastError.type,
        totalRetries: this.state.retryCount,
        maxRetries: this.config.retryAttempts,
        recoverable: this.state.lastError.recoverable,
        finalFailureReason: this.state.lastError.recoverable ? 'max_retries_exceeded' : 'non_recoverable_error',
        circuitBreakerState: this.circuitBreaker.state,
        consecutiveFailures: this.circuitBreaker.consecutiveFailures
      };

      logger.dockerConnection('error', 'Docker connection failed permanently', finalFailureContext);
      logger.dockerStateChange('disconnected', 'failed', finalFailureContext);
      this.state.isRetrying = false;
    }
  }

  generateTroubleshootingInfo(classifiedError) {
    return generateTroubleshootingInfo(classifiedError);
  }

  classifyError(error) {
    return classifyDockerError(error, this.config.platform, this.getDockerSocketType(), this.calculateRetryDelay());
  }

  calculateRetryDelay() {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, this.state.retryCount);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const delay = Math.min(exponentialDelay + jitter, this.config.maxRetryDelay);

    return Math.floor(delay);
  }

  // Circuit breaker pattern implementation
  updateCircuitBreakerOnFailure() {
    this.circuitBreaker.consecutiveFailures++;
    this.circuitBreaker.lastFailureTime = new Date();

    logger.dockerConnection('debug', 'Circuit breaker failure recorded', {
      consecutiveFailures: this.circuitBreaker.consecutiveFailures,
      threshold: this.config.circuitBreakerThreshold,
      currentState: this.circuitBreaker.state
    });

    // Check if we should open the circuit breaker
    if (this.circuitBreaker.state === 'CLOSED' &&
      this.circuitBreaker.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      this.openCircuitBreaker();
    } else if (this.circuitBreaker.state === 'HALF_OPEN') {
      // In HALF_OPEN state, any failure should immediately open the circuit
      logger.dockerConnection('warn', 'Circuit breaker reopened after failure in HALF_OPEN state', {
        consecutiveFailures: this.circuitBreaker.consecutiveFailures
      });
      this.openCircuitBreaker();
    }
  }

  updateCircuitBreakerOnSuccess() {
    const previousState = this.circuitBreaker.state;
    const previousFailures = this.circuitBreaker.consecutiveFailures;

    // Reset circuit breaker on successful connection
    this.circuitBreaker.consecutiveFailures = 0;
    this.circuitBreaker.lastFailureTime = null;
    this.circuitBreaker.nextAttemptTime = null;
    this.circuitBreaker.state = 'CLOSED';

    if (previousState !== 'CLOSED' || previousFailures > 0) {
      logger.dockerConnection('info', 'Circuit breaker reset after successful connection', {
        previousState,
        previousConsecutiveFailures: previousFailures,
        newState: this.circuitBreaker.state
      });
    }
  }

  openCircuitBreaker() {
    this.circuitBreaker.state = 'OPEN';
    this.circuitBreaker.nextAttemptTime = new Date(Date.now() + this.config.circuitBreakerTimeout);

    logger.dockerConnection('warn', 'Circuit breaker OPENED due to consecutive failures', {
      consecutiveFailures: this.circuitBreaker.consecutiveFailures,
      threshold: this.config.circuitBreakerThreshold,
      nextAttemptTime: this.circuitBreaker.nextAttemptTime.toISOString(),
      timeoutDuration: this.config.circuitBreakerTimeout
    });

    // Schedule circuit breaker to transition to HALF_OPEN
    setTimeout(() => {
      if (this.circuitBreaker.state === 'OPEN') {
        this.circuitBreaker.state = 'HALF_OPEN';
        logger.dockerConnection('info', 'Circuit breaker transitioned to HALF_OPEN', {
          timeInOpenState: this.config.circuitBreakerTimeout,
          nextAttemptAllowed: true
        });
      }
    }, this.config.circuitBreakerTimeout);
  }

  canAttemptConnection() {
    const now = new Date();

    switch (this.circuitBreaker.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (this.circuitBreaker.nextAttemptTime && now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = 'HALF_OPEN';
          logger.dockerConnection('info', 'Circuit breaker transitioned to HALF_OPEN after timeout', {
            timeInOpenState: now.getTime() - this.circuitBreaker.lastFailureTime.getTime()
          });
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return false;
    }
  }

  getCircuitBreakerStatus() {
    return {
      state: this.circuitBreaker.state,
      consecutiveFailures: this.circuitBreaker.consecutiveFailures,
      threshold: this.config.circuitBreakerThreshold,
      lastFailureTime: this.circuitBreaker.lastFailureTime,
      nextAttemptTime: this.circuitBreaker.nextAttemptTime,
      canAttempt: this.canAttemptConnection()
    };
  }

  scheduleRetry() {
    if (this.state.isRetrying) {
      logger.dockerConnection('debug', 'Retry already scheduled, skipping duplicate retry request');
      return; // Already retrying
    }

    // Check circuit breaker before scheduling retry
    if (!this.canAttemptConnection()) {
      const timeUntilNextAttempt = this.circuitBreaker.nextAttemptTime ?
        this.circuitBreaker.nextAttemptTime.getTime() - Date.now() : 0;

      logger.dockerConnection('warn', 'Retry blocked by circuit breaker', {
        circuitBreakerState: this.circuitBreaker.state,
        consecutiveFailures: this.circuitBreaker.consecutiveFailures,
        timeUntilNextAttempt,
        retryCount: this.state.retryCount
      });

      this.state.isRetrying = false;
      return;
    }

    const delay = this.calculateRetryDelay();
    this.state.nextRetryAt = new Date(Date.now() + delay);
    this.state.isRetrying = true;

    // Log retry scheduling with detailed context
    logger.dockerRetry(
      this.state.retryCount + 1,
      this.config.retryAttempts,
      delay,
      this.state.lastError,
      {
        socketPath: this.config.socketPath,
        errorType: this.state.lastError?.type,
        retryStrategy: 'exponential_backoff_with_jitter',
        circuitBreakerState: this.circuitBreaker.state,
        consecutiveFailures: this.circuitBreaker.consecutiveFailures
      }
    );

    // Log state change to retrying
    logger.dockerStateChange('disconnected', 'retrying', {
      retryAttempt: this.state.retryCount + 1,
      maxRetries: this.config.retryAttempts,
      retryDelay: delay,
      nextRetryAt: this.state.nextRetryAt.toISOString(),
      circuitBreakerState: this.circuitBreaker.state
    });

    this.retryTimer = setTimeout(async () => {
      this.state.retryCount++;

      logger.dockerConnection('info', `Executing retry attempt ${this.state.retryCount}/${this.config.retryAttempts}`, {
        retryAttempt: this.state.retryCount,
        maxRetries: this.config.retryAttempts,
        lastErrorType: this.state.lastError?.type,
        timeSinceLastAttempt: delay,
        circuitBreakerState: this.circuitBreaker.state,
        consecutiveFailures: this.circuitBreaker.consecutiveFailures
      });

      const success = await this.connect();

      if (!success && this.state.retryCount < this.config.retryAttempts && this.canAttemptConnection()) {
        logger.dockerConnection('warn', `Retry attempt ${this.state.retryCount} failed, scheduling next attempt`, {
          failedAttempt: this.state.retryCount,
          remainingAttempts: this.config.retryAttempts - this.state.retryCount,
          lastErrorType: this.state.lastError?.type,
          circuitBreakerState: this.circuitBreaker.state
        });
        this.scheduleRetry();
      } else if (!success) {
        const failureReason = !this.canAttemptConnection() ? 'circuit_breaker_open' : 'max_retries_exceeded';
        logger.dockerConnection('error', 'Retry attempts stopped', {
          totalAttempts: this.state.retryCount,
          maxRetries: this.config.retryAttempts,
          finalErrorType: this.state.lastError?.type,
          finalErrorMessage: this.state.lastError?.message,
          failureReason,
          circuitBreakerState: this.circuitBreaker.state,
          consecutiveFailures: this.circuitBreaker.consecutiveFailures
        });
        this.state.isRetrying = false;
      }
    }, delay);
  }

  startHealthCheck() {
    logger.dockerConnection('info', 'Starting Docker health check monitoring', {
      healthCheckInterval: this.config.healthCheckInterval,
      socketPath: this.config.socketPath
    });

    this.healthCheckTimer = setInterval(async () => {
      const healthCheckStart = Date.now();

      if (this.state.isConnected) {
        try {
          // Simple health check - list containers with limit 1
          logger.dockerConnection('debug', 'Performing Docker health check');
          await this.docker.listContainers({ limit: 1 });

          const healthCheckDuration = Date.now() - healthCheckStart;
          logger.dockerConnection('debug', 'Docker health check passed', {
            duration: healthCheckDuration,
            status: 'healthy',
            lastSuccessfulConnection: this.state.lastSuccessfulConnection?.toISOString()
          });
        } catch (error) {
          const healthCheckDuration = Date.now() - healthCheckStart;
          logger.dockerConnection('warn', 'Docker health check failed, connection may be lost', {
            duration: healthCheckDuration,
            errorCode: error.code,
            errorMessage: error.message,
            lastSuccessfulConnection: this.state.lastSuccessfulConnection?.toISOString()
          });

          this.handleConnectionError(error);
        }
      } else if (!this.state.isRetrying && this.state.retryCount < this.config.retryAttempts) {
        // Only try to reconnect if the last error was recoverable
        if (this.state.lastError && this.state.lastError.recoverable) {
          logger.dockerConnection('info', 'Health check triggered automatic reconnection attempt', {
            lastErrorType: this.state.lastError.type,
            timeSinceLastError: this.state.lastError.occurredAt ?
              Date.now() - new Date(this.state.lastError.occurredAt).getTime() : 'unknown',
            retryCount: this.state.retryCount
          });

          this.state.retryCount = 0; // Reset retry count for health check reconnections
          await this.connect();
        } else {
          logger.dockerConnection('debug', 'Health check skipped - non-recoverable error or max retries reached', {
            lastErrorType: this.state.lastError?.type,
            recoverable: this.state.lastError?.recoverable,
            retryCount: this.state.retryCount,
            maxRetries: this.config.retryAttempts
          });
        }
      } else {
        logger.dockerConnection('debug', 'Health check skipped - retry in progress or max attempts reached', {
          isRetrying: this.state.isRetrying,
          retryCount: this.state.retryCount,
          maxRetries: this.config.retryAttempts,
          nextRetryAt: this.state.nextRetryAt?.toISOString()
        });
      }
    }, this.config.healthCheckInterval);
  }

  getDocker() {
    if (!this.state.isConnected || !this.docker) {
      throw new Error('Docker connection not available');
    }
    return this.docker;
  }

  getConnectionState() {
    return {
      ...this.state,
      config: {
        socketPath: this.config.socketPath,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
        circuitBreakerThreshold: this.config.circuitBreakerThreshold,
        circuitBreakerTimeout: this.config.circuitBreakerTimeout
      },
      circuitBreaker: this.getCircuitBreakerStatus()
    };
  }

  createErrorResponse(operation, error, includeRetryInfo = true) {
    const classifiedError = this.classifyError(error);
    const connectionState = this.getConnectionState();
    const troubleshooting = this.generateTroubleshootingInfo(classifiedError);

    const response = {
      error: `${operation} failed`,
      message: classifiedError.userMessage,
      details: {
        type: classifiedError.type,
        code: classifiedError.code,
        severity: classifiedError.severity,
        recoverable: classifiedError.recoverable,
        platform: classifiedError.platform,
        socketType: classifiedError.socketType
      },
      docker: {
        connected: connectionState.isConnected,
        socketPath: connectionState.config.socketPath,
        platform: connectionState.platform
      },
      troubleshooting: {
        possibleCauses: troubleshooting.possibleCauses,
        suggestedActions: troubleshooting.suggestedActions,
        documentationLinks: troubleshooting.documentationLinks,
        platform: troubleshooting.platform,
        socketType: troubleshooting.socketType
      },
      timestamp: new Date().toISOString()
    };

    if (includeRetryInfo && classifiedError.recoverable) {
      response.retry = {
        willRetry: connectionState.retryCount < this.config.retryAttempts,
        retryCount: connectionState.retryCount,
        maxRetries: this.config.retryAttempts,
        nextRetryAt: connectionState.nextRetryAt,
        retryAfter: classifiedError.retryAfter
      };
    }

    if (!classifiedError.recoverable) {
      response.resolution = this.getResolutionSuggestion(classifiedError.type);
    }

    return response;
  }

  getResolutionSuggestion(errorType) {
    return getResolutionSuggestion(errorType);
  }

  isDockerAvailable() {
    return this.state.isConnected;
  }

  getServiceStatus() {
    const connectionState = this.getConnectionState();

    if (connectionState.isConnected) {
      return {
        status: 'available',
        message: 'Docker service is running normally'
      };
    }

    if (connectionState.isRetrying && connectionState.lastError?.recoverable) {
      return {
        status: 'degraded',
        message: 'Docker service is temporarily unavailable, retrying connection'
      };
    }

    if (connectionState.lastError && !connectionState.lastError.recoverable) {
      return {
        status: 'unavailable',
        message: connectionState.lastError.userMessage
      };
    }

    return {
      status: 'unknown',
      message: 'Docker service status unknown'
    };
  }

  async executeWithRetry(operation, operationName = 'Docker operation', options = {}) {
    const {
      allowDegraded = false,
      fallbackValue = null,
      maxOperationRetries = 2
    } = options;

    const operationStart = Date.now();

    logger.dockerConnection('debug', `Starting operation: ${operationName}`, {
      operation: operationName,
      allowDegraded,
      maxOperationRetries,
      connectionState: this.state.isConnected ? 'connected' : 'disconnected'
    });

    // Check if Docker is available
    if (!this.state.isConnected) {
      const serviceStatus = this.getServiceStatus();

      if (allowDegraded) {
        logger.dockerConnection('warn', `Operation skipped due to Docker unavailability`, {
          operation: operationName,
          serviceStatus: serviceStatus.status,
          serviceMessage: serviceStatus.message,
          fallbackUsed: true,
          duration: Date.now() - operationStart
        });
        return fallbackValue;
      }

      const error = new Error(`${operationName} failed: ${serviceStatus.message}`);
      error.dockerStatus = serviceStatus.status;

      logger.dockerOperationFailed(operationName, {
        type: 'connection_unavailable',
        code: 'DOCKER_UNAVAILABLE',
        message: serviceStatus.message,
        severity: 'high',
        recoverable: serviceStatus.status === 'degraded'
      });

      throw error;
    }

    let lastError = null;

    // Retry the operation with exponential backoff
    for (let attempt = 0; attempt <= maxOperationRetries; attempt++) {
      const attemptStart = Date.now();

      try {
        logger.dockerConnection('debug', `Executing operation attempt ${attempt + 1}/${maxOperationRetries + 1}`, {
          operation: operationName,
          attempt: attempt + 1,
          maxAttempts: maxOperationRetries + 1
        });

        const result = await operation(this.docker);

        const operationDuration = Date.now() - operationStart;
        const attemptDuration = Date.now() - attemptStart;

        logger.dockerConnection('debug', `Operation completed successfully`, {
          operation: operationName,
          attempt: attempt + 1,
          totalDuration: operationDuration,
          attemptDuration: attemptDuration,
          retriesUsed: attempt
        });

        return result;
      } catch (error) {
        lastError = error;
        const classifiedError = this.classifyError(error);
        const attemptDuration = Date.now() - attemptStart;

        logger.dockerConnection('warn', `Operation attempt ${attempt + 1} failed`, {
          operation: operationName,
          attempt: attempt + 1,
          maxAttempts: maxOperationRetries + 1,
          attemptDuration,
          errorType: classifiedError.type,
          errorCode: classifiedError.code,
          errorMessage: error.message,
          recoverable: classifiedError.recoverable
        });

        // If it's a connection-related error, trigger reconnection
        if (['connection_refused', 'timeout', 'broken_pipe', 'socket_hangup'].includes(classifiedError.type)) {
          logger.dockerConnection('info', 'Connection-related error detected, triggering reconnection', {
            operation: operationName,
            errorType: classifiedError.type,
            attempt: attempt + 1
          });

          this.handleConnectionError(error);

          // If we have more attempts and the error is recoverable, wait and retry
          if (attempt < maxOperationRetries && classifiedError.recoverable) {
            const retryDelay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 second delay

            logger.dockerConnection('info', `Retrying operation after connection error`, {
              operation: operationName,
              attempt: attempt + 1,
              retryDelay,
              nextAttempt: attempt + 2
            });

            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }

        // For non-recoverable errors or final attempt, break the loop
        if (!classifiedError.recoverable || attempt === maxOperationRetries) {
          logger.dockerConnection('error', 'Operation cannot be retried', {
            operation: operationName,
            attempt: attempt + 1,
            reason: !classifiedError.recoverable ? 'non_recoverable_error' : 'max_attempts_reached',
            errorType: classifiedError.type,
            recoverable: classifiedError.recoverable
          });
          break;
        }

        // Wait before next attempt for recoverable errors
        if (attempt < maxOperationRetries) {
          const retryDelay = Math.min(500 * Math.pow(2, attempt), 2000);

          logger.dockerConnection('info', `Retrying operation after recoverable error`, {
            operation: operationName,
            attempt: attempt + 1,
            retryDelay,
            nextAttempt: attempt + 2,
            errorType: classifiedError.type
          });

          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // If we reach here, all attempts failed
    const totalDuration = Date.now() - operationStart;

    if (allowDegraded) {
      logger.dockerConnection('warn', 'Operation failed after all retries, using fallback', {
        operation: operationName,
        totalAttempts: maxOperationRetries + 1,
        totalDuration,
        fallbackUsed: true,
        finalErrorType: this.classifyError(lastError).type
      });
      return fallbackValue;
    }

    logger.dockerOperationFailed(operationName, this.classifyError(lastError), {
      possibleCauses: ['Connection instability', 'Docker daemon issues', 'Resource constraints'],
      suggestedActions: [
        'Check Docker daemon status',
        'Verify system resources',
        'Review container configuration',
        'Check network connectivity'
      ]
    });

    throw lastError;
  }

  // Get connection statistics for logging and monitoring
  getConnectionStats() {
    const now = new Date();
    const stats = {
      currentState: this.state.isConnected ? 'connected' : 'disconnected',
      lastSuccessfulConnection: this.state.lastSuccessfulConnection,
      totalRetries: this.state.retryCount,
      isRetrying: this.state.isRetrying,
      nextRetryAt: this.state.nextRetryAt,
      uptime: this.state.lastSuccessfulConnection ?
        now.getTime() - this.state.lastSuccessfulConnection.getTime() : 0,
      lastError: this.state.lastError ? {
        type: this.state.lastError.type,
        code: this.state.lastError.code,
        severity: this.state.lastError.severity,
        recoverable: this.state.lastError.recoverable,
        occurredAt: this.state.lastError.occurredAt,
        platform: this.state.lastError.platform,
        socketType: this.state.lastError.socketType
      } : null,
      circuitBreaker: this.getCircuitBreakerStatus(),
      platform: {
        name: this.config.platform,
        socketType: this.getDockerSocketType(),
        details: this.getPlatformDetails(),
        connectionInfo: this.getPlatformConnectionInfo()
      },
      config: {
        socketPath: this.config.socketPath,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts,
        healthCheckInterval: this.config.healthCheckInterval,
        circuitBreakerThreshold: this.config.circuitBreakerThreshold,
        circuitBreakerTimeout: this.config.circuitBreakerTimeout,
        platform: this.config.platform
      }
    };

    return stats;
  }

  // Log periodic connection statistics
  logConnectionStats() {
    const stats = this.getConnectionStats();

    // Use DeploymentLogger for performance metrics
    DeploymentLogger.logPerformanceMetrics({
      docker: {
        connectionStats: stats,
        isConnected: this.state.isConnected,
        retryCount: this.state.retryCount,
        lastSuccessfulConnection: this.state.lastSuccessfulConnection,
        circuitBreakerState: this.circuitBreaker.state
      }
    });

    logger.dockerConnection('info', 'Docker connection statistics', {
      connectionStats: stats,
      timestamp: new Date().toISOString()
    });
  }

  destroy() {
    const stats = this.getConnectionStats();

    logger.dockerConnection('info', 'Destroying Docker connection manager', {
      finalStats: stats,
      timersCleared: {
        healthCheck: !!this.healthCheckTimer,
        retry: !!this.retryTimer,
        statsLog: !!this.statsLogTimer
      }
    });

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      logger.dockerConnection('debug', 'Health check timer cleared');
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
      logger.dockerConnection('debug', 'Retry timer cleared');
    }

    if (this.statsLogTimer) {
      clearInterval(this.statsLogTimer);
      this.statsLogTimer = null;
      logger.dockerConnection('debug', 'Statistics logging timer cleared');
    }

    // Log final state change
    if (this.state.isConnected) {
      logger.dockerStateChange('connected', 'destroyed', {
        reason: 'manager_shutdown',
        finalStats: stats
      });
    }

    this.state.isConnected = false;
    this.docker = null;

    logger.dockerConnection('info', 'Docker connection manager destroyed successfully');
  }
}

/**
 * Creates the CLI-based Docker manager used in production.
 * This is the lightweight wrapper (not the full DockerConnectionManager class)
 * that index.js currently uses at lines 3219-3275.
 *
 * Usage in index.js:
 *   import { createDockerManager } from './docker-manager.js';
 *   const dockerManager = createDockerManager();
 *   const docker = dockerManager; // backward compat
 */
function createDockerManager() {
  const networkConfig = NetworkManager.getConfiguration();

  logger.info('🐳 Initializing Docker connection manager');
  logger.info('🔧 Enabling Docker functionality for container deployment');

  const dockerHost = process.env.DOCKER_HOST;
  const cliDocker = dockerHost?.startsWith('tcp://')
    ? new Docker({ host: new URL(dockerHost).hostname, port: parseInt(new URL(dockerHost).port) || 2375, protocol: 'http' })
    : new Docker({ socketPath: networkConfig.serviceUrls?.docker?.replace('unix://', '') || '/var/run/docker.sock' });

  // Real health state, updated by an actual ping probe instead of hardcoded
  // (HLCE-258). Starts 'unknown' so the very first request before the initial
  // probe resolves is not falsely reported as unavailable (routes only 503 on
  // 'unavailable'); the probe + each successful operation then keep it honest.
  const state = {
    isConnected: null, // null = not yet probed, true/false = real result
    lastError: null,
    lastSuccessfulConnection: null,
  };

  const probe = async () => {
    try {
      await cliDocker.ping();
      state.isConnected = true;
      state.lastError = null;
      state.lastSuccessfulConnection = new Date();
    } catch (error) {
      state.isConnected = false;
      state.lastError = error;
    }
    return state.isConnected;
  };

  // Initial probe (fire-and-forget) + periodic re-probe; unref so it never keeps
  // the process alive.
  probe();
  const probeTimer = setInterval(probe, 30_000);
  if (typeof probeTimer.unref === 'function') probeTimer.unref();

  const manager = {
    docker: cliDocker,
    config: {
      platform: networkConfig.platform,
      cliPath: 'docker',
    },
    probe,
    getConnectionState: () => ({
      isConnected: state.isConnected === true,
      lastSuccessfulConnection: state.lastSuccessfulConnection,
      lastError: state.lastError ? (state.lastError.message || String(state.lastError)) : null,
      platform: networkConfig.platform,
    }),
    getServiceStatus: () => {
      if (state.isConnected === true) {
        return { status: 'available', message: 'Docker CLI integration active' };
      }
      if (state.isConnected === false) {
        return { status: 'unavailable', message: state.lastError?.message || 'Docker daemon is not reachable' };
      }
      return { status: 'unknown', message: 'Docker connection state not yet determined' };
    },
    executeWithRetry: async (operation, _description) => {
      const result = await operation(cliDocker);
      // A completed operation is positive proof the daemon is reachable.
      state.isConnected = true;
      state.lastSuccessfulConnection = new Date();
      return result;
    },
    createErrorResponse: (operation, error, includeDetails = true) => ({
      success: false,
      error: error.message || 'Docker operation failed',
      details: includeDetails ? error.message : undefined,
      operation,
      timestamp: new Date().toISOString(),
      dockerStatus: 'cli-mode'
    }),
    classifyError: (error) => ({
      type: 'docker_error',
      code: error.code || 'UNKNOWN',
      message: error.message || 'Unknown error',
      recoverable: false,
      severity: 'high',
      userMessage: 'Docker operation failed'
    }),
    destroy: () => {
      clearInterval(probeTimer);
      logger.info('🔧 CLI Docker manager cleanup complete');
    }
  };

  logger.info('✅ CLI-based Docker manager initialized for Windows compatibility');

  return manager;
}

export { DockerConnectionManager, createDockerManager };
