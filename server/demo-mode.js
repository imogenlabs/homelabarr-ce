// Demo mode — refuses the handful of actions that could lock everyone else out
// of a shared, publicly-signed-in HomelabARR.
//
// The public demo hands out admin / admin on its own login screen, which is the
// point: anyone should be able to look around. The cost is that any visitor
// could change that password, delete the admin, or turn on MFA with a secret
// only they hold — and everyone after them is locked out. A scheduled reset
// bounds that damage to half an hour; this closes it.
//
// ── Rules for anyone touching this ──────────────────────────────────────────
//
// OFF UNLESS EXPLICITLY ON. This code ships to every self-hosted install. With
// DEMO_MODE unset — which is every real install — `demoGuard` calls next() and
// behaves exactly as it did before this file existed. Only the literal strings
// "true" and "1" turn it on.
//
// IT ONLY EVER ADDS A REFUSAL. It never relaxes an existing check. Mount it
// AFTER requireAuth / requireRole on protected routes, so an unauthenticated
// caller still gets the 401 it has always got, and the refusal only ever
// replaces a would-be success.
//
// ONE CHOKEPOINT. The gate is this middleware and the list of routes it is
// mounted on — not conditionals sprinkled through auth logic. To see what is
// gated, grep for demoGuard.

// Read at call time, not at import time: a module-level snapshot makes the
// behaviour depend on import order and is a nuisance to test.
export function isDemoMode() {
  const raw = String(process.env.DEMO_MODE ?? '').trim().toLowerCase();
  return raw === 'true' || raw === '1';
}

// Written for a stranger looking at a browser notification, not for an operator
// reading a log: say what happened, why, and what to do about it.
export const DEMO_REFUSAL =
  'This is the public HomelabARR demo, so changes to accounts are switched off — ' +
  'everyone signs in with admin / admin. Install HomelabARR on your own machine to ' +
  'change passwords, manage users, set up MFA or mint API keys.';

export function demoGuard(req, res, next) {
  if (!isDemoMode()) return next();
  // 403, not 401: the caller is who they say they are and is allowed to be here
  // — this instance simply will not do it. `code` lets the UI branch on it
  // without matching prose.
  return res.status(403).json({ error: DEMO_REFUSAL, code: 'demo_mode' });
}
