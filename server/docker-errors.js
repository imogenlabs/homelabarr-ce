export function classifyDockerError(error, platform, socketType, retryDelay) {
  let errorInfo = {
    type: 'unknown',
    code: error.code || 'UNKNOWN',
    message: error.message,
    recoverable: true,
    retryAfter: retryDelay,
    severity: 'medium',
    userMessage: 'Docker service is temporarily unavailable',
    occurredAt: new Date().toISOString(),
    platform,
    socketType
  };

  if (platform === 'windows') {
    errorInfo = classifyWindowsError(error, errorInfo);
  } else {
    errorInfo = classifyUnixError(error, errorInfo);
  }

  if (error.code === 'ETIMEDOUT') {
    errorInfo.type = 'timeout';
    errorInfo.recoverable = true;
    errorInfo.severity = 'low';
    errorInfo.userMessage = 'Docker operation timed out. Retrying...';
  } else if (error.message && error.message.includes('EPIPE')) {
    errorInfo.type = 'broken_pipe';
    errorInfo.recoverable = true;
    errorInfo.severity = 'medium';
    errorInfo.userMessage = 'Docker connection was interrupted. Reconnecting...';
  } else if (error.message && error.message.includes('socket hang up')) {
    errorInfo.type = 'socket_hangup';
    errorInfo.recoverable = true;
    errorInfo.severity = 'low';
    errorInfo.userMessage = 'Docker connection was reset. Retrying...';
  } else if (error.statusCode >= 400 && error.statusCode < 500) {
    errorInfo.type = 'client_error';
    errorInfo.recoverable = false;
    errorInfo.severity = 'medium';
    errorInfo.userMessage = 'Invalid Docker operation request.';
  } else if (error.statusCode >= 500) {
    errorInfo.type = 'server_error';
    errorInfo.recoverable = true;
    errorInfo.severity = 'high';
    errorInfo.userMessage = 'Docker daemon encountered an internal error.';
  }

  return errorInfo;
}

function classifyWindowsError(error, errorInfo) {
  if (error.code === 'ENOENT') {
    errorInfo.type = 'windows_named_pipe_not_found';
    errorInfo.recoverable = false;
    errorInfo.severity = 'high';
    errorInfo.userMessage = 'Docker Desktop named pipe not found. Please ensure Docker Desktop is running.';
  } else if (error.code === 'EACCES') {
    errorInfo.type = 'windows_named_pipe_permission';
    errorInfo.recoverable = false;
    errorInfo.severity = 'high';
    errorInfo.userMessage = 'Access denied to Docker Desktop named pipe.';
  } else if (error.code === 'ECONNREFUSED') {
    errorInfo.type = 'windows_docker_desktop_not_running';
    errorInfo.recoverable = true;
    errorInfo.severity = 'medium';
    errorInfo.userMessage = 'Cannot connect to Docker Desktop. Please ensure it is running.';
  } else if (error.message && error.message.includes('pipe')) {
    errorInfo.type = 'windows_named_pipe_error';
    errorInfo.recoverable = true;
    errorInfo.severity = 'medium';
    errorInfo.userMessage = 'Windows named pipe connection error.';
  } else if (error.message && error.message.includes('hyperv')) {
    errorInfo.type = 'windows_hyperv_error';
    errorInfo.recoverable = false;
    errorInfo.severity = 'high';
    errorInfo.userMessage = 'Hyper-V related error. Check Docker Desktop and Hyper-V configuration.';
  }
  return errorInfo;
}

function classifyUnixError(error, errorInfo) {
  if (error.code === 'EACCES') {
    errorInfo.type = 'unix_socket_permission';
    errorInfo.recoverable = false;
    errorInfo.severity = 'high';
    errorInfo.userMessage = 'Docker socket permission denied. Check container user is in docker group.';
  } else if (error.code === 'ENOENT') {
    errorInfo.type = 'unix_socket_not_found';
    errorInfo.recoverable = false;
    errorInfo.severity = 'high';
    errorInfo.userMessage = 'Docker socket not found. Ensure Docker is installed and socket is mounted.';
  } else if (error.code === 'ECONNREFUSED') {
    errorInfo.type = 'unix_docker_daemon_not_running';
    errorInfo.recoverable = true;
    errorInfo.severity = 'medium';
    errorInfo.userMessage = 'Cannot connect to Docker daemon. It may be starting up.';
  } else if (error.code === 'ENOTFOUND') {
    errorInfo.type = 'unix_host_not_found';
    errorInfo.recoverable = true;
    errorInfo.severity = 'medium';
    errorInfo.userMessage = 'Docker host not found. Check Docker configuration.';
  }
  return errorInfo;
}

export function generateTroubleshootingInfo(classifiedError) {
  let troubleshooting = {
    possibleCauses: [],
    suggestedActions: [],
    documentationLinks: [],
    platform: classifiedError.platform,
    socketType: classifiedError.socketType
  };

  if (classifiedError.platform === 'windows') {
    troubleshooting = generateWindowsTroubleshooting(classifiedError, troubleshooting);
  } else {
    troubleshooting = generateUnixTroubleshooting(classifiedError, troubleshooting);
  }

  switch (classifiedError.type) {
    case 'timeout':
      troubleshooting.possibleCauses.push('Docker daemon overloaded', 'Network latency', 'System resource constraints');
      troubleshooting.suggestedActions.push('Check system resources', 'Increase timeout', 'Restart Docker daemon');
      break;
    case 'broken_pipe':
    case 'socket_hangup':
      troubleshooting.possibleCauses.push('Network instability', 'Docker daemon restart', 'Resource exhaustion');
      troubleshooting.suggestedActions.push('Check network stability', 'Monitor Docker status');
      break;
    case 'client_error':
      troubleshooting.possibleCauses.push('Invalid API parameters', 'Unsupported API version');
      troubleshooting.suggestedActions.push('Review request parameters', 'Check API compatibility');
      break;
    case 'server_error':
      troubleshooting.possibleCauses.push('Docker daemon internal error', 'Resource exhaustion');
      troubleshooting.suggestedActions.push('Check Docker logs', 'Restart Docker daemon');
      break;
  }

  return troubleshooting;
}

function generateWindowsTroubleshooting(classifiedError, troubleshooting) {
  switch (classifiedError.type) {
    case 'windows_named_pipe_not_found':
      troubleshooting.possibleCauses = ['Docker Desktop not installed', 'Docker Desktop not running', 'Container mode mismatch'];
      troubleshooting.suggestedActions = ['Install Docker Desktop', 'Start Docker Desktop', 'Check container mode (Linux containers)'];
      troubleshooting.documentationLinks = ['https://docs.docker.com/desktop/windows/install/'];
      break;
    case 'windows_named_pipe_permission':
      troubleshooting.possibleCauses = ['User not in docker-users group', 'Docker Desktop permission settings'];
      troubleshooting.suggestedActions = ['Add user to docker-users group', 'Run Docker Desktop as administrator'];
      break;
    case 'windows_docker_desktop_not_running':
      troubleshooting.possibleCauses = ['Docker Desktop service stopped', 'Docker Desktop crashed'];
      troubleshooting.suggestedActions = ['Start Docker Desktop', 'Check Windows Services', 'Check Event Viewer'];
      break;
    case 'windows_hyperv_error':
      troubleshooting.possibleCauses = ['Hyper-V not enabled', 'Conflicting virtualization software'];
      troubleshooting.suggestedActions = ['Enable Hyper-V', 'Enable virtualization in BIOS', 'Disable conflicting VM software'];
      break;
  }
  return troubleshooting;
}

function generateUnixTroubleshooting(classifiedError, troubleshooting) {
  switch (classifiedError.type) {
    case 'unix_socket_permission':
      troubleshooting.possibleCauses = ['Container user not in docker group', 'Socket permissions too restrictive', 'GID mismatch'];
      troubleshooting.suggestedActions = ['Check group_add in compose', 'Verify socket mount', 'Run: docker compose exec service id'];
      troubleshooting.documentationLinks = ['https://docs.docker.com/engine/install/linux-postinstall/'];
      break;
    case 'unix_socket_not_found':
      troubleshooting.possibleCauses = ['Docker daemon not running', 'Socket not mounted', 'Wrong socket path'];
      troubleshooting.suggestedActions = ['systemctl status docker', 'Check compose volume mounts', 'ls -la /var/run/docker.sock'];
      break;
    case 'unix_docker_daemon_not_running':
      troubleshooting.possibleCauses = ['Docker daemon starting up', 'Daemon crashed', 'Service not enabled'];
      troubleshooting.suggestedActions = ['sudo systemctl start docker', 'sudo systemctl enable docker', 'journalctl -u docker'];
      break;
    case 'unix_host_not_found':
      troubleshooting.possibleCauses = ['Incorrect DOCKER_HOST', 'Network issues', 'DNS resolution failure'];
      troubleshooting.suggestedActions = ['Check DOCKER_HOST env var', 'Verify network connectivity', 'Try IP instead of hostname'];
      break;
  }
  return troubleshooting;
}

export function getResolutionSuggestion(errorType) {
  const suggestions = {
    'windows_named_pipe_not_found': { action: 'Install or start Docker Desktop', priority: 'high' },
    'windows_named_pipe_permission': { action: 'Add user to docker-users group and restart session', priority: 'high' },
    'windows_docker_desktop_not_running': { action: 'Start Docker Desktop from Start Menu', priority: 'medium' },
    'windows_hyperv_error': { action: 'Enable Hyper-V and restart', priority: 'high' },
    'unix_socket_permission': { action: 'Check docker group membership and socket mount', priority: 'high' },
    'unix_socket_not_found': { action: 'Start Docker daemon and verify socket mount', priority: 'high' },
    'unix_docker_daemon_not_running': { action: 'Start Docker daemon: sudo systemctl start docker', priority: 'medium' },
    'unix_host_not_found': { action: 'Check DOCKER_HOST configuration', priority: 'medium' },
    'timeout': { action: 'Check system resources and Docker daemon load', priority: 'low' },
    'broken_pipe': { action: 'Check network stability', priority: 'low' },
    'socket_hangup': { action: 'Connection will retry automatically', priority: 'low' },
  };
  return suggestions[errorType] || { action: 'Check Docker daemon status and logs', priority: 'medium' };
}
