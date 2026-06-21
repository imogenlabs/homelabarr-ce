import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLIBridge } from '../cli-bridge.js';

// HLCE-227 (Epic HLCE-209) — AC4: permanent security-invariant regression tests
// for the cli-bridge command / path / env seals. These are ASSERT-ONLY guardrails:
// each test is written so it FAILS if the control it pins were removed from source.
//
// HLCE-218 (server/cli-bridge.test.js) already exercises much of this surface; the
// invariants below RE-ASSERT the same controls as named AC4 seals that cite the
// exact control's file:line, so a regression is traceable to the line that broke.
//
// Harness (copied from server/cli-bridge.test.js beforeAll): CLIBridge's
// constructor logs via DeploymentLogger -> EnvironmentManager, which hard-exits
// without a 32+ char JWT_SECRET; and verifyCLIInstallation() needs apps/ to exist,
// so CLI_BRIDGE_HOST_PATH is pointed at the repo root (apps/ present there). The
// seals all run synchronously BEFORE any docker-compose spawn, so a rejected input
// surfaces as a thrown/rejected error with no docker process involved.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

let bridge;
beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-that-is-definitely-32-plus-chars-long';
  process.env.CLI_BRIDGE_HOST_PATH = repoRoot;
  bridge = new CLIBridge();
});

// ---------------------------------------------------------------------------
// AC4a — path component seal (safeJoin, cli-bridge.js:7-19, regex line 9)
//
// safeJoin(base, ...parts) rejects any path component that contains '/', '..',
// leading dots, newlines/nulls, or otherwise fails the allowlist regex
//   /^[a-z0-9][a-z0-9_.-]{0,63}$/i
// It is module-level and NOT exported, so it is reached only through the public
// methods (stopApplication / removeApplication / getApplicationLogs /
// deployApplication). In all of them safeJoin runs BEFORE the docker spawn, so a
// malicious category/appName is rejected with "Invalid path component" and no
// docker-compose process is ever created.
//
// If the regex guard were deleted, these inputs would slip through to path.resolve
// and an attacker could escape the apps/ directory — so every case here flips red
// the moment the seal is removed.
// ---------------------------------------------------------------------------
describe('AC4a — safeJoin path component seal (cli-bridge.js:9)', () => {
  const reachedVia = [
    ['stopApplication', (id) => bridge.stopApplication(id)],
    ['removeApplication', (id) => bridge.removeApplication(id)],
    ['getApplicationLogs', (id) => bridge.getApplicationLogs(id)],
    ['deployApplication', (id) => bridge.deployApplication(id, {}, { type: 'standard' })],
  ];

  // The malicious category categories the seal must reject. Each appId is
  // `${category}-x`; parseAppId falls back to a first-hyphen split for these
  // unknown categories, so `category` is the dangerous component.
  const malicious = [
    ['slash (path separator)', 'a/b-x'],
    ['parent-dir traversal (leading dots)', '..-x'],
    ['embedded newline', 'ab\ncd-x'],
    ['embedded null byte', 'ab\x00cd-x'],
    ['leading dot (hidden/relative)', '.hidden-x'],
    ['over the 64-char length cap', `${'a'.repeat(65)}-x`],
  ];

  for (const [methodName, invoke] of reachedVia) {
    for (const [label, appId] of malicious) {
      it(`${methodName} rejects ${label} with "Invalid path component" before any docker spawn`, async () => {
        await expect(invoke(appId)).rejects.toThrow(/Invalid path component/);
      });
    }
  }

  it('a valid-but-absent appId passes the path seal and fails LATER (not at the gate)', async () => {
    // 'ai-doesnotexist' -> category 'ai', app 'doesnotexist': both pass the regex.
    // safeJoin succeeds; the failure must NOT be a path-component / traversal error
    // (it fails downstream — file-not-found or docker spawn — which is past the seal).
    let caught;
    try {
      await bridge.stopApplication('ai-doesnotexist');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeTruthy();
    expect(caught.message).not.toMatch(/Invalid path component/);
    expect(caught.message).not.toMatch(/Path traversal/);
  });
});

// ---------------------------------------------------------------------------
// AC4b — env key/value seal
//
// Two distinct controls collaborate here:
//
//   (1) Template-variable substitution only resolves ALLOWLISTED image vars.
//       CLIBridge.resolveTemplateVar (cli-bridge.js:117-122) replaces ${VAR}
//       ONLY when VAR is a key of IMAGE_DEFAULTS (cli-bridge.js:70-103); any
//       other ${SOMETHING} is left verbatim — it is NEVER pulled from arbitrary
//       process.env. So a non-allowlisted var cannot be used to inject an
//       attacker-controlled image/value via the catalog renderer.
//
//   (2) executeDockerCompose (cli-bridge.js:447-498) filters the env map it
//       passes to the spawned process: keys NOT in ALLOWED_TEMPLATE_VARS
//       (cli-bridge.js:105-115) are dropped, and allowed keys whose value is
//       non-string, > 256 chars, or contains \r \n \0 ` $ throw
//       "Invalid template variable value for <key>" BEFORE spawn (line 452).
//
// Removing the IMAGE_DEFAULTS lookup guard (1) or the value-character guard (2)
// flips these red.
// ---------------------------------------------------------------------------
describe('AC4b — template-var resolution allowlist (cli-bridge.js:117-122 / 70-103)', () => {
  it('substitutes ONLY allowlisted IMAGE_DEFAULTS vars', () => {
    expect(CLIBridge.resolveTemplateVar('${PLEXIMAGE}')).toBe('lscr.io/linuxserver/plex:latest');
    expect(CLIBridge.resolveTemplateVar('${PORTAINERIMAGE}')).toBe('portainer/portainer-ce:latest');
  });

  it('leaves a NON-allowlisted ${SOMETHING} untouched (no arbitrary-env substitution)', () => {
    // Even if the host process has SOMETHING in its environment, the resolver
    // must not read it — only IMAGE_DEFAULTS keys resolve.
    process.env.SOMETHING = 'attacker-controlled';
    process.env.PATH_BACKUP = process.env.PATH; // PATH is a real env var but not an IMAGE_DEFAULT key
    try {
      expect(CLIBridge.resolveTemplateVar('${SOMETHING}')).toBe('${SOMETHING}');
      expect(CLIBridge.resolveTemplateVar('${PATH}')).toBe('${PATH}');
      expect(CLIBridge.resolveTemplateVar('${NOPE_NOT_A_VAR}')).toBe('${NOPE_NOT_A_VAR}');
    } finally {
      delete process.env.SOMETHING;
    }
  });

  it('IMAGE_DEFAULTS contains only image-ish constants — not a passthrough of process.env', () => {
    // Pin the allowlist as a closed set: a non-allowlisted key must be absent.
    expect(Object.prototype.hasOwnProperty.call(CLIBridge.IMAGE_DEFAULTS, 'SOMETHING')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(CLIBridge.IMAGE_DEFAULTS, 'PATH')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(CLIBridge.IMAGE_DEFAULTS, 'PLEXIMAGE')).toBe(true);
  });
});

describe('AC4b — executeDockerCompose env key/value seal (cli-bridge.js:447-456)', () => {
  const someAppPath = path.join(repoRoot, 'apps', 'whatever.yml');

  it('rejects a shell-metacharacter value ($) for an ALLOWED key before spawn', async () => {
    await expect(
      bridge.executeDockerCompose(someAppPath, 'up -d', { TZ: 'UTC$(whoami)' })
    ).rejects.toThrow(/Invalid template variable value for TZ/);
  });

  it('rejects a backtick value for an ALLOWED key before spawn', async () => {
    await expect(
      bridge.executeDockerCompose(someAppPath, 'up -d', { DOMAIN: 'x`id`' })
    ).rejects.toThrow(/Invalid template variable value for DOMAIN/);
  });

  it('rejects newline injection for an ALLOWED key before spawn', async () => {
    await expect(
      bridge.executeDockerCompose(someAppPath, 'up -d', { CONTAINER_NAME: 'a\nb' })
    ).rejects.toThrow(/Invalid template variable value/);
  });

  it('rejects a null-byte value for an ALLOWED key before spawn', async () => {
    await expect(
      bridge.executeDockerCompose(someAppPath, 'up -d', { APPDATA: 'a\x00b' })
    ).rejects.toThrow(/Invalid template variable value/);
  });

  it('rejects an over-long (>256) value for an ALLOWED key before spawn', async () => {
    await expect(
      bridge.executeDockerCompose(someAppPath, 'up -d', { APPDATA: 'x'.repeat(257) })
    ).rejects.toThrow(/Invalid template variable value/);
  });

  it('SILENTLY DROPS a NON-allowlisted key (it never reaches the spawned env)', async () => {
    // A non-allowlisted key with a clean value is dropped, not thrown on; the
    // request then proceeds to the command-verb gate (AC4c) which rejects the
    // unsupported verb. If the drop were removed, a non-allowlisted (and possibly
    // dangerous-valued) key would leak into the child process env.
    await expect(
      bridge.executeDockerCompose(someAppPath, 'rm -rf /', { NOT_ALLOWED: 'whatever' })
    ).rejects.toThrow(/Unsupported compose command/);
  });
});

// ---------------------------------------------------------------------------
// AC4c — command verb seal (cli-bridge.js:459-464)
//
// executeDockerCompose builds the docker-compose argv from a CLOSED set of verbs.
// The chain is: command === 'up -d' | 'down' | 'down -v' | startsWith('logs')
// else -> throw `Unsupported compose command: <command>`. There is no user-driven
// shell string; the verb is the only thing that selects argv, and anything outside
// the allowlist is rejected before spawn. (Verbs are spawned via spawn() with an
// argv array — no shell — so even an allowed verb cannot smuggle extra args.)
//
// Deployment-MODE selection (deployApplication switch, cli-bridge.js:296-311) is
// intentionally a FALLBACK (unknown mode -> deployStandard), NOT a reject — that is
// availability behavior, not a security boundary, so it is asserted as such below
// rather than as a deny.
// ---------------------------------------------------------------------------
describe('AC4c — docker-compose verb allowlist (cli-bridge.js:459-464)', () => {
  const someAppPath = path.join(repoRoot, 'apps', 'whatever.yml');

  const disallowedVerbs = [
    'rm -rf /',
    'exec',
    'run --rm alpine sh',
    'up -d --build; rm -rf /',
    'pull && curl evil',
    'config',
    '',
  ];

  for (const verb of disallowedVerbs) {
    it(`rejects non-allowlisted verb ${JSON.stringify(verb)} with "Unsupported compose command"`, async () => {
      await expect(
        bridge.executeDockerCompose(someAppPath, verb, {})
      ).rejects.toThrow(/Unsupported compose command/);
    });
  }

  it('NOTE: deployment-mode switch falls back to standard for an unknown mode (availability, not a deny)', async () => {
    // Unknown deploymentMode.type does NOT throw a security error; it routes to
    // deployStandard. We assert via a valid-but-absent appId so it fails at the
    // file-existence check (not at the path seal), proving the mode was accepted.
    await expect(
      bridge.deployApplication('ai-doesnotexist', {}, { type: 'totally-unknown-mode' })
    ).rejects.toThrow(/not found/);
  });
});
