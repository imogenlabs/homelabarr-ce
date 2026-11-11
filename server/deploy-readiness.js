import { spawn } from 'child_process';

// The AppArmor profile lives on the host, so the container cannot update it.
// When the host still has a profile older than v2.6.2, the backend may not run
// docker-compose and every deploy fails. Say what to run, in one place.
export const APPARMOR_UPDATE_MESSAGE =
  'HomelabARR is not allowed to run docker-compose on this host. If you installed the AppArmor ' +
  'profiles, update them from your HomelabARR folder with `sudo bash scripts/install-apparmor.sh`, ' +
  'then deploy again.';

const RECHECK_MS = 30_000;

let last = null; // { ok, message, checkedAt }

/**
 * Try `docker-compose version`. Only a refusal to run it (EACCES) counts as
 * blocked: anything else, including a slow or odd answer, is reported as ok so
 * the dashboard never shows a banner it cannot explain.
 */
export function checkDeployReadiness({ spawnImpl = spawn, timeoutMs = 10_000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (error) => {
      if (settled) return;
      settled = true;
      last = error?.code === 'EACCES'
        ? { ok: false, message: APPARMOR_UPDATE_MESSAGE, checkedAt: Date.now() }
        : { ok: true, checkedAt: Date.now() };
      resolve(last);
    };
    try {
      const child = spawnImpl('docker-compose', ['version'], { stdio: 'ignore', timeout: timeoutMs });
      child.on('error', done);
      child.on('close', () => done());
    } catch (error) {
      done(error);
    }
  });
}

/**
 * The latest result. While blocked, check again at most every 30 seconds, so
 * the banner clears soon after the host profile is updated, without a restart.
 */
export async function getDeployReadiness(options) {
  if (!last || (!last.ok && Date.now() - last.checkedAt > RECHECK_MS)) {
    return checkDeployReadiness(options);
  }
  return last;
}

// Test seam.
export function resetDeployReadiness() {
  last = null;
}
