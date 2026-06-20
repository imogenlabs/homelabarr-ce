import { describe, it, expect } from 'vitest';
import {
  classifyDockerError,
  generateTroubleshootingInfo,
  getResolutionSuggestion,
} from './docker-errors.js';

// HLCE-218 — Docker error classification is pure logic and security/UX
// load-bearing: a misclassified "recoverable" flag drives the retry loop, and a
// "non-recoverable" verdict surfaces a hard error to the operator. These tests
// pin the platform branches, the override precedence, and the recoverable
// default exhaustively.

const err = (props) => Object.assign(new Error(props.message || 'boom'), props);

describe('classifyDockerError — base defaults', () => {
  it('returns a recoverable medium-severity unknown error by default', () => {
    const info = classifyDockerError(err({ code: undefined, message: 'mystery' }), 'linux', 'unix', 1000);
    expect(info.type).toBe('unknown');
    expect(info.code).toBe('UNKNOWN');
    expect(info.recoverable).toBe(true);
    expect(info.severity).toBe('medium');
    expect(info.retryAfter).toBe(1000);
    expect(info.platform).toBe('linux');
    expect(info.socketType).toBe('unix');
    expect(typeof info.occurredAt).toBe('string');
    expect(Number.isNaN(Date.parse(info.occurredAt))).toBe(false);
  });

  it('carries the error.code through to the classified result', () => {
    const info = classifyDockerError(err({ code: 'EWHATEVER' }), 'linux', 'unix', 500);
    expect(info.code).toBe('EWHATEVER');
  });
});

describe('classifyDockerError — Unix code mapping', () => {
  it('EACCES -> unix_socket_permission, non-recoverable, high', () => {
    const info = classifyDockerError(err({ code: 'EACCES' }), 'linux', 'unix', 0);
    expect(info.type).toBe('unix_socket_permission');
    expect(info.recoverable).toBe(false);
    expect(info.severity).toBe('high');
    expect(info.userMessage).toMatch(/permission denied/i);
  });

  it('ENOENT -> unix_socket_not_found, non-recoverable, high', () => {
    const info = classifyDockerError(err({ code: 'ENOENT' }), 'linux', 'unix', 0);
    expect(info.type).toBe('unix_socket_not_found');
    expect(info.recoverable).toBe(false);
    expect(info.severity).toBe('high');
  });

  it('ECONNREFUSED -> unix_docker_daemon_not_running, recoverable, medium', () => {
    const info = classifyDockerError(err({ code: 'ECONNREFUSED' }), 'linux', 'unix', 0);
    expect(info.type).toBe('unix_docker_daemon_not_running');
    expect(info.recoverable).toBe(true);
    expect(info.severity).toBe('medium');
  });

  it('ENOTFOUND -> unix_host_not_found, recoverable, medium', () => {
    const info = classifyDockerError(err({ code: 'ENOTFOUND' }), 'linux', 'unix', 0);
    expect(info.type).toBe('unix_host_not_found');
    expect(info.recoverable).toBe(true);
    expect(info.severity).toBe('medium');
  });

  it('treats any non-windows platform as Unix', () => {
    const info = classifyDockerError(err({ code: 'EACCES' }), 'darwin', 'unix', 0);
    expect(info.type).toBe('unix_socket_permission');
  });
});

describe('classifyDockerError — Windows code mapping', () => {
  it('ENOENT -> windows_named_pipe_not_found, non-recoverable, high', () => {
    const info = classifyDockerError(err({ code: 'ENOENT' }), 'windows', 'npipe', 0);
    expect(info.type).toBe('windows_named_pipe_not_found');
    expect(info.recoverable).toBe(false);
    expect(info.severity).toBe('high');
  });

  it('EACCES -> windows_named_pipe_permission, non-recoverable, high', () => {
    const info = classifyDockerError(err({ code: 'EACCES' }), 'windows', 'npipe', 0);
    expect(info.type).toBe('windows_named_pipe_permission');
    expect(info.recoverable).toBe(false);
    expect(info.severity).toBe('high');
  });

  it('ECONNREFUSED -> windows_docker_desktop_not_running, recoverable, medium', () => {
    const info = classifyDockerError(err({ code: 'ECONNREFUSED' }), 'windows', 'npipe', 0);
    expect(info.type).toBe('windows_docker_desktop_not_running');
    expect(info.recoverable).toBe(true);
    expect(info.severity).toBe('medium');
  });

  it('message containing "pipe" -> windows_named_pipe_error, recoverable, medium', () => {
    const info = classifyDockerError(err({ code: 'EOTHER', message: 'broken pipe thing' }), 'windows', 'npipe', 0);
    expect(info.type).toBe('windows_named_pipe_error');
    expect(info.recoverable).toBe(true);
  });

  it('message containing "hyperv" -> windows_hyperv_error, non-recoverable, high', () => {
    const info = classifyDockerError(err({ code: 'EOTHER', message: 'hyperv failure' }), 'windows', 'npipe', 0);
    expect(info.type).toBe('windows_hyperv_error');
    expect(info.recoverable).toBe(false);
    expect(info.severity).toBe('high');
  });
});

describe('classifyDockerError — statusCode mapping', () => {
  it('4xx -> client_error, NON-recoverable, medium', () => {
    for (const sc of [400, 404, 422, 499]) {
      const info = classifyDockerError(err({ statusCode: sc }), 'linux', 'unix', 0);
      expect(info.type).toBe('client_error');
      expect(info.recoverable).toBe(false);
      expect(info.severity).toBe('medium');
    }
  });

  it('5xx -> server_error, recoverable, high', () => {
    for (const sc of [500, 502, 503]) {
      const info = classifyDockerError(err({ statusCode: sc }), 'linux', 'unix', 0);
      expect(info.type).toBe('server_error');
      expect(info.recoverable).toBe(true);
      expect(info.severity).toBe('high');
    }
  });

  it('a sub-400 statusCode does not trigger the client/server branches', () => {
    const info = classifyDockerError(err({ statusCode: 200, message: 'odd' }), 'linux', 'unix', 0);
    expect(info.type).toBe('unknown');
  });
});

describe('classifyDockerError — timeout / pipe / hangup', () => {
  it('ETIMEDOUT -> timeout, recoverable, low', () => {
    const info = classifyDockerError(err({ code: 'ETIMEDOUT' }), 'linux', 'unix', 0);
    expect(info.type).toBe('timeout');
    expect(info.recoverable).toBe(true);
    expect(info.severity).toBe('low');
  });

  it('message containing EPIPE -> broken_pipe, recoverable, medium', () => {
    const info = classifyDockerError(err({ code: 'EX', message: 'write EPIPE' }), 'linux', 'unix', 0);
    expect(info.type).toBe('broken_pipe');
    expect(info.recoverable).toBe(true);
    expect(info.severity).toBe('medium');
  });

  it('message containing "socket hang up" -> socket_hangup, recoverable, low', () => {
    const info = classifyDockerError(err({ code: 'EX', message: 'socket hang up' }), 'linux', 'unix', 0);
    expect(info.type).toBe('socket_hangup');
    expect(info.recoverable).toBe(true);
    expect(info.severity).toBe('low');
  });
});

describe('classifyDockerError — override precedence', () => {
  // The platform classifier runs FIRST, then the generic block can override it.
  it('ETIMEDOUT overrides the platform code classification', () => {
    // EACCES would map to unix_socket_permission, but ETIMEDOUT takes the code branch.
    const info = classifyDockerError(err({ code: 'ETIMEDOUT' }), 'linux', 'unix', 0);
    expect(info.type).toBe('timeout');
    expect(info.recoverable).toBe(true); // NOT the non-recoverable permission verdict
  });

  it('a 4xx statusCode overrides the platform classification', () => {
    // ECONNREFUSED on unix would be recoverable; a 4xx flips it to non-recoverable client_error.
    const info = classifyDockerError(err({ code: 'ECONNREFUSED', statusCode: 400 }), 'linux', 'unix', 0);
    expect(info.type).toBe('client_error');
    expect(info.recoverable).toBe(false);
  });

  it('timeout wins over a 5xx statusCode (earlier branch in the if-chain)', () => {
    const info = classifyDockerError(err({ code: 'ETIMEDOUT', statusCode: 500 }), 'linux', 'unix', 0);
    expect(info.type).toBe('timeout');
  });

  it('EPIPE message wins over a 5xx statusCode', () => {
    const info = classifyDockerError(err({ code: 'EX', message: 'EPIPE', statusCode: 500 }), 'linux', 'unix', 0);
    expect(info.type).toBe('broken_pipe');
  });
});

describe('generateTroubleshootingInfo', () => {
  it('returns the expected shape with arrays for all guidance fields', () => {
    const classified = classifyDockerError(err({ code: 'EACCES' }), 'linux', 'unix', 0);
    const t = generateTroubleshootingInfo(classified);
    expect(Array.isArray(t.possibleCauses)).toBe(true);
    expect(Array.isArray(t.suggestedActions)).toBe(true);
    expect(Array.isArray(t.documentationLinks)).toBe(true);
    expect(t.platform).toBe('linux');
    expect(t.socketType).toBe('unix');
  });

  it('unix_socket_permission yields concrete causes, actions and a doc link', () => {
    const classified = classifyDockerError(err({ code: 'EACCES' }), 'linux', 'unix', 0);
    const t = generateTroubleshootingInfo(classified);
    expect(t.possibleCauses.length).toBeGreaterThan(0);
    expect(t.suggestedActions.length).toBeGreaterThan(0);
    expect(t.documentationLinks).toContain('https://docs.docker.com/engine/install/linux-postinstall/');
  });

  it('windows_named_pipe_not_found yields Windows-specific guidance', () => {
    const classified = classifyDockerError(err({ code: 'ENOENT' }), 'windows', 'npipe', 0);
    const t = generateTroubleshootingInfo(classified);
    expect(t.suggestedActions.join(' ')).toMatch(/Docker Desktop/i);
    expect(t.documentationLinks[0]).toMatch(/desktop\/windows/);
  });

  it('appends generic timeout guidance for a timeout classification', () => {
    const classified = classifyDockerError(err({ code: 'ETIMEDOUT' }), 'linux', 'unix', 0);
    const t = generateTroubleshootingInfo(classified);
    expect(t.possibleCauses).toContain('Docker daemon overloaded');
    expect(t.suggestedActions).toContain('Increase timeout');
  });

  it('appends server_error guidance for a 5xx classification', () => {
    const classified = classifyDockerError(err({ statusCode: 503 }), 'linux', 'unix', 0);
    const t = generateTroubleshootingInfo(classified);
    expect(t.suggestedActions).toContain('Check Docker logs');
  });
});

describe('getResolutionSuggestion', () => {
  it('returns a known suggestion with action + priority for each mapped type', () => {
    const types = [
      'windows_named_pipe_not_found',
      'unix_socket_permission',
      'unix_docker_daemon_not_running',
      'timeout',
      'socket_hangup',
    ];
    for (const type of types) {
      const s = getResolutionSuggestion(type);
      expect(typeof s.action).toBe('string');
      expect(s.action.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(s.priority);
    }
  });

  it('falls back to a sane default for an unknown type', () => {
    const s = getResolutionSuggestion('totally_made_up');
    expect(s).toEqual({ action: 'Check Docker daemon status and logs', priority: 'medium' });
  });
});
