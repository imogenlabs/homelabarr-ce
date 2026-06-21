import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { CLIBridge, parseAppId, APP_CATEGORIES } from './cli-bridge.js';

// HLCE-218 — security-load-bearing PURE logic in the CLI bridge.
//
// safeJoin() is module-level and NOT exported, so it is exercised indirectly
// through the public methods that call it (stopApplication / removeApplication /
// getApplicationLogs / deployApplication). In all of those, safeJoin runs
// synchronously BEFORE any docker-compose spawn, so a rejected path component
// surfaces as a thrown/rejected error with no docker involved.
//
// The repo root contains an apps/ directory, so pointing CLI_BRIDGE_HOST_PATH at
// it lets verifyCLIInstallation() pass and a real CLIBridge be constructed. We
// never call a method whose happy path would actually spawn docker-compose.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

let bridge;
beforeAll(() => {
  // CLIBridge's constructor logs via DeploymentLogger -> EnvironmentManager,
  // which hard-exits unless a 32+ char JWT_SECRET is present.
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-that-is-definitely-32-plus-chars-long';
  process.env.CLI_BRIDGE_HOST_PATH = repoRoot;
  bridge = new CLIBridge();
});

describe('CLIBridge construction', () => {
  it('constructs against the repo root (apps/ present) and resolves appsPath', () => {
    expect(bridge.cliPath).toBe(repoRoot);
    expect(bridge.appsPath).toBe(path.join(repoRoot, 'apps'));
  });

  it('verifyCLIInstallation throws when apps/ is missing', () => {
    process.env.CLI_BRIDGE_HOST_PATH = path.join(repoRoot, 'definitely', 'not', 'here');
    expect(() => new CLIBridge()).toThrow(/apps directory not found/);
    // restore for any later constructions
    process.env.CLI_BRIDGE_HOST_PATH = repoRoot;
  });
});

// ---- safeJoin path gate (reached via stopApplication) ----------------------
// stopApplication(appId): [category, appName] = appId.split('-');
// safeJoin(appsPath, category, appName + '.yml')  <-- gate runs here, sync.
describe('safeJoin path gate (via stopApplication)', () => {
  it('rejects a category that fails the allowlist regex (contains slash)', async () => {
    // 'a/b-x'.split('-') => ['a/b', 'x']; category 'a/b' fails the regex.
    await expect(bridge.stopApplication('a/b-x')).rejects.toThrow(/Invalid path component/);
  });

  it('rejects a traversal-style category (leading dots fail the regex)', async () => {
    // '..-x'.split('-') => ['..', 'x']; '..' fails the leading-char rule.
    await expect(bridge.stopApplication('..-x')).rejects.toThrow(/Invalid path component/);
  });

  it('rejects an embedded-newline category', async () => {
    await expect(bridge.stopApplication('ab\ncd-x')).rejects.toThrow(/Invalid path component/);
  });

  it('rejects an embedded-null category', async () => {
    await expect(bridge.stopApplication('ab\x00cd-x')).rejects.toThrow(/Invalid path component/);
  });

  it('rejects a category exceeding the 64-char length cap', async () => {
    const tooLong = 'a'.repeat(65);
    await expect(bridge.stopApplication(`${tooLong}-x`)).rejects.toThrow(/Invalid path component/);
  });

  it('accepts valid components and fails later (not at the path gate) for a nonexistent app', async () => {
    // 'ai-doesnotexist' splits cleanly to category 'ai', app 'doesnotexist'.
    // safeJoin succeeds; the failure must NOT be an Invalid-path-component error.
    // It will fail trying to run docker-compose (down) since the app file is
    // absent — that's past the security gate, which is what we are asserting.
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

// ---- deployApplication path gate -------------------------------------------
describe('deployApplication path gate', () => {
  it('rejects a malicious appId before any deployment work', async () => {
    await expect(
      bridge.deployApplication('a/b-x', {}, { type: 'standard' })
    ).rejects.toThrow(/Invalid path component/);
  });

  it('reports "not found" (not a path error) for a valid-but-absent appId', async () => {
    await expect(
      bridge.deployApplication('ai-doesnotexist', {}, { type: 'standard' })
    ).rejects.toThrow(/not found/);
  });
});

// ---- executeDockerCompose env-value filter ---------------------------------
// The filter runs synchronously inside the Promise executor BEFORE spawn:
//   - keys not in ALLOWED_TEMPLATE_VARS are dropped
//   - allowed keys with a value > 256 chars or containing \r \n \0 ` $ throw
// We only assert the throw path (the accept path would spawn docker-compose).
describe('executeDockerCompose env-value filter', () => {
  const someAppPath = path.join(repoRoot, 'apps', 'whatever.yml');

  it('rejects a shell-metacharacter value ($) for an allowed key', async () => {
    await expect(
      bridge.executeDockerCompose(someAppPath, 'up -d', { TZ: 'UTC$(whoami)' })
    ).rejects.toThrow(/Invalid template variable value for TZ/);
  });

  it('rejects a backtick value for an allowed key', async () => {
    await expect(
      bridge.executeDockerCompose(someAppPath, 'up -d', { DOMAIN: 'x`id`' })
    ).rejects.toThrow(/Invalid template variable value for DOMAIN/);
  });

  it('rejects newline injection for an allowed key', async () => {
    await expect(
      bridge.executeDockerCompose(someAppPath, 'up -d', { CONTAINER_NAME: 'a\nb' })
    ).rejects.toThrow(/Invalid template variable value/);
  });

  it('rejects an over-long (>256) value for an allowed key', async () => {
    await expect(
      bridge.executeDockerCompose(someAppPath, 'up -d', { APPDATA: 'x'.repeat(257) })
    ).rejects.toThrow(/Invalid template variable value/);
  });

  it('rejects an unsupported compose command (arg-builder gate)', async () => {
    // No disallowed env values, so the filter passes; the command allowlist
    // throws before spawn. Drops the non-allowlisted key silently first.
    await expect(
      bridge.executeDockerCompose(someAppPath, 'rm -rf /', { NOT_ALLOWED: 'whatever' })
    ).rejects.toThrow(/Unsupported compose command/);
  });
});

// ---- injectDockerGid (pure, no spawn) --------------------------------------
describe('injectDockerGid', () => {
  it('adds group_add with DOCKER_GID to services that mount docker.sock', () => {
    process.env.DOCKER_GID = '4242';
    const doc = {
      services: {
        app: { volumes: ['/var/run/docker.sock:/var/run/docker.sock:ro'] },
      },
    };
    bridge.injectDockerGid(doc);
    expect(doc.services.app.group_add).toContain('4242');
  });

  it('defaults to gid 999 when DOCKER_GID is unset', () => {
    delete process.env.DOCKER_GID;
    const doc = { services: { app: { volumes: ['/var/run/docker.sock:/var/run/docker.sock'] } } };
    bridge.injectDockerGid(doc);
    expect(doc.services.app.group_add).toContain('999');
  });

  it('does NOT add group_add to services that do not mount the socket', () => {
    process.env.DOCKER_GID = '4242';
    const doc = { services: { app: { volumes: ['/data:/data'] } } };
    bridge.injectDockerGid(doc);
    expect(doc.services.app.group_add).toBeUndefined();
  });

  it('does not duplicate the gid if already present', () => {
    process.env.DOCKER_GID = '4242';
    const doc = {
      services: {
        app: { volumes: ['/var/run/docker.sock:/var/run/docker.sock'], group_add: ['4242'] },
      },
    };
    bridge.injectDockerGid(doc);
    expect(doc.services.app.group_add.filter((g) => g === '4242')).toHaveLength(1);
  });

  it('is a no-op for a doc with no services', () => {
    const doc = { networks: {} };
    expect(() => bridge.injectDockerGid(doc)).not.toThrow();
    expect(bridge.injectDockerGid(doc)).toBe(doc);
  });
});

// ---- resolveTemplateVar (static, pure) -------------------------------------
describe('CLIBridge.resolveTemplateVar (static)', () => {
  it('substitutes known image template vars', () => {
    expect(CLIBridge.resolveTemplateVar('${PLEXIMAGE}')).toBe('lscr.io/linuxserver/plex:latest');
  });

  it('leaves unknown vars untouched', () => {
    expect(CLIBridge.resolveTemplateVar('${NOPE}')).toBe('${NOPE}');
  });

  it('passes through non-strings', () => {
    expect(CLIBridge.resolveTemplateVar(undefined)).toBeUndefined();
    expect(CLIBridge.resolveTemplateVar(42)).toBe(42);
  });
});

// ---- HLCE-228 (AC2) regression — parseAppId handles hyphenated categories ---
// The old `appId.split('-')` destructured to [category, appName] and mis-parsed
// hyphenated categories: for 'media-servers-plex' it yielded category='media',
// appName='servers' and silently dropped 'plex', pointing at the wrong file.
// parseAppId now matches the known category prefix so the remainder is the app.
describe('HLCE-228: parseAppId handles hyphenated categories and app names', () => {
  it('parses a single-word category', () => {
    expect(parseAppId('downloads-qbittorrent')).toEqual({
      category: 'downloads',
      appName: 'qbittorrent',
    });
  });

  it('parses a hyphenated category, keeping the trailing app segment', () => {
    expect(parseAppId('media-servers-plex')).toEqual({
      category: 'media-servers',
      appName: 'plex',
    });
  });

  it('parses a hyphenated category AND a hyphenated app name', () => {
    expect(parseAppId('self-hosted-nginx-proxy-manager')).toEqual({
      category: 'self-hosted',
      appName: 'nginx-proxy-manager',
    });
  });

  it('keeps every known category resolvable', () => {
    for (const category of APP_CATEGORIES) {
      expect(parseAppId(`${category}-myapp`)).toEqual({ category, appName: 'myapp' });
    }
  });

  it('falls back to a first-hyphen split for an unknown category (preserves app name)', () => {
    expect(parseAppId('unknown-foo-bar')).toEqual({ category: 'unknown', appName: 'foo-bar' });
  });

  it('returns an undefined appName for an id with no hyphen', () => {
    expect(parseAppId('downloads')).toEqual({ category: 'downloads', appName: undefined });
  });

  it('still routes a malicious category to the path gate (rejected by safeJoin)', async () => {
    // 'a/b-x' has no known category prefix → fallback yields category='a/b',
    // which the path gate rejects, so the security behavior is unchanged.
    await expect(bridge.stopApplication('a/b-x')).rejects.toThrow(/Invalid path component/);
  });
});
