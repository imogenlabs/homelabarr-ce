import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  APPARMOR_UPDATE_MESSAGE,
  checkDeployReadiness,
  getDeployReadiness,
  resetDeployReadiness,
} from './deploy-readiness.js';

// HLCE-372: a host whose AppArmor profile predates v2.6.2 refuses to let the
// backend run docker-compose. The check must spot exactly that, and nothing else.
function fakeSpawn(outcome) {
  return vi.fn(() => {
    const child = new EventEmitter();
    queueMicrotask(() => {
      if (outcome === 'ok') child.emit('close', 0);
      else {
        child.emit('error', Object.assign(new Error(`spawn docker-compose ${outcome}`), { code: outcome }));
        child.emit('close', -2);
      }
    });
    return child;
  });
}

beforeEach(() => resetDeployReadiness());

describe('checkDeployReadiness', () => {
  it('reports blocked, with the command to run, when docker-compose is refused (EACCES)', async () => {
    const result = await checkDeployReadiness({ spawnImpl: fakeSpawn('EACCES') });
    expect(result.ok).toBe(false);
    expect(result.message).toBe(APPARMOR_UPDATE_MESSAGE);
    expect(result.message).toContain('sudo bash scripts/install-apparmor.sh');
  });

  it('reports ok when docker-compose runs', async () => {
    expect((await checkDeployReadiness({ spawnImpl: fakeSpawn('ok') })).ok).toBe(true);
  });

  it('does not blame AppArmor for other failures', async () => {
    expect((await checkDeployReadiness({ spawnImpl: fakeSpawn('ENOENT') })).ok).toBe(true);
  });

  it('runs docker-compose version with a timeout', async () => {
    const spawnImpl = fakeSpawn('ok');
    await checkDeployReadiness({ spawnImpl, timeoutMs: 1234 });
    expect(spawnImpl).toHaveBeenCalledWith('docker-compose', ['version'], expect.objectContaining({ timeout: 1234 }));
  });
});

describe('getDeployReadiness', () => {
  it('re-checks while blocked, so the banner clears after the profile is updated', async () => {
    vi.useFakeTimers();
    try {
      await getDeployReadiness({ spawnImpl: fakeSpawn('EACCES') });

      const fixed = fakeSpawn('ok');
      // Within 30 seconds the cached result stands.
      expect((await getDeployReadiness({ spawnImpl: fixed })).ok).toBe(false);
      expect(fixed).not.toHaveBeenCalled();

      vi.advanceTimersByTime(30_001);
      expect((await getDeployReadiness({ spawnImpl: fixed })).ok).toBe(true);
      expect(fixed).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not re-run the check once it is ok', async () => {
    await getDeployReadiness({ spawnImpl: fakeSpawn('ok') });
    const again = fakeSpawn('ok');
    await getDeployReadiness({ spawnImpl: again });
    expect(again).not.toHaveBeenCalled();
  });
});
