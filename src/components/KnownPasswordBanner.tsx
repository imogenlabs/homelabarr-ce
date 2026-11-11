import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { getKnownPasswordApps, type KnownPasswordApp } from '../lib/api';

const RECHECK_MS = 60_000;

// Apps deployed before v2.6.5 may still run with a password that earlier
// releases filled in by default, which anyone can look up (HLCE-387). Name each
// one and say how to fix it. Checks again while any remain, so the banner
// clears once they are redeployed.
export function KnownPasswordBanner() {
  const [apps, setApps] = useState<KnownPasswordApp[]>([]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      try {
        const { apps: found } = await getKnownPasswordApps();
        if (cancelled) return;
        setApps(found);
        if (found.length > 0) timer = setTimeout(check, RECHECK_MS);
      } catch {
        // An older backend has no such check; show nothing.
      }
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (apps.length === 0) return null;

  return (
    <div
      role="alert"
      className="mb-6 flex gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-100"
    >
      <KeyRound className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-medium">
          {apps.length === 1 ? 'An app still uses' : 'Some apps still use'} a password everyone knows
        </p>
        <p className="mt-1">
          Earlier versions of HomelabARR set these by default. Anyone who can reach the app can sign in with them.
          Deploy the app again from the catalog and type your own password; your data is kept.
        </p>
        <ul className="mt-2 list-disc pl-5">
          {apps.map((a) => (
            <li key={`${a.container}-${a.setting}`}>
              <span className="font-medium">{a.app}</span> (container <code className="font-mono text-xs">{a.container}</code>):
              set <code className="font-mono text-xs">{a.setting}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
