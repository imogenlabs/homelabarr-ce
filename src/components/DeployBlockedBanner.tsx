import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getDeployReadiness } from '../lib/api';

const RECHECK_MS = 60_000;

// Shown when the host will not let the backend run docker-compose, usually an
// AppArmor profile older than v2.6.2. The fix is on the host, so say what to
// run before anyone tries a deploy (HLCE-372). Checks again while blocked, so
// the banner clears once the profile is updated.
export function DeployBlockedBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      try {
        const readiness = await getDeployReadiness();
        if (cancelled) return;
        if (readiness.ok) {
          setMessage(null);
          return;
        }
        setMessage(readiness.message || 'Deploys are blocked on this host.');
        timer = setTimeout(check, RECHECK_MS);
      } catch {
        // An older backend has no such endpoint; show nothing.
      }
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!message) return null;

  // The message marks the command with backticks; show it as code.
  const parts = message.split('`');
  return (
    <div
      role="alert"
      className="mb-6 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium">Deploys are blocked on this host</p>
        <p className="mt-1">
          {parts.map((part, i) =>
            i % 2 === 1 ? (
              <code key={i} className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs dark:bg-amber-900">
                {part}
              </code>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </p>
      </div>
    </div>
  );
}
