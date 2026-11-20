import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const posthog = vi.hoisted(() => ({ init: vi.fn(), register: vi.fn(), capture: vi.fn() }));
vi.mock('posthog-js', () => ({ default: posthog }));
const toast = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast }));

import { startAnalytics, track, scrub, resetAnalyticsForTests } from './analytics';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function addTag(key = 'phc_test') {
  const meta = document.createElement('meta');
  meta.name = 'hl-analytics';
  meta.content = key;
  document.head.appendChild(meta);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetAnalyticsForTests();
  localStorage.clear();
});

afterEach(() => {
  document.querySelector('meta[name="hl-analytics"]')?.remove();
});

describe('usage analytics', () => {
  it('does nothing when the server did not add the tag (ANALYTICS=off)', async () => {
    const instance = vi.fn();
    startAnalytics(instance);
    track('signed_in');
    await flush();
    expect(instance).not.toHaveBeenCalled();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('does nothing inside the mobile app, whose store page says no data is collected', async () => {
    addTag();
    (window as unknown as Record<string, unknown>).ReactNativeWebView = { postMessage: () => {} };
    try {
      const instance = vi.fn();
      startAnalytics(instance);
      track('signed_in');
      await flush();
      expect(instance).not.toHaveBeenCalled();
      expect(posthog.init).not.toHaveBeenCalled();
    } finally {
      delete (window as unknown as Record<string, unknown>).ReactNativeWebView;
    }
  });

  it('does nothing when the backend gives no install id', async () => {
    addTag();
    startAnalytics(async () => ({ install: null, demo: false }));
    track('signed_in');
    await flush();
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('reports an install under its install id, through /ingest, storing nothing', async () => {
    addTag('phc_abc');
    startAnalytics(async () => ({ install: 'install-1', demo: false }));
    await flush();
    const [token, config] = posthog.init.mock.calls[0];
    expect(token).toBe('phc_abc');
    expect(config).toMatchObject({
      api_host: '/ingest',
      persistence: 'memory',
      bootstrap: { distinctID: 'install-1' },
      person_profiles: 'never',
      mask_all_text: true,
      mask_all_element_attributes: true,
      disable_session_recording: true,
      disable_external_dependency_loading: true,
    });
    expect(posthog.register).toHaveBeenCalledWith(
      expect.objectContaining({ product: 'homelabarr', install_id: 'install-1', demo: false }),
    );
  });

  it('lets each demo visitor keep their own id', async () => {
    addTag();
    startAnalytics(async () => ({ install: 'demo', demo: true }));
    await flush();
    const config = posthog.init.mock.calls[0][1];
    expect(config.persistence).toBe('localStorage');
    expect(config.bootstrap).toBeUndefined();
    expect(posthog.register).toHaveBeenCalledWith(expect.objectContaining({ install_id: 'demo', demo: true }));
  });

  it('tells a real install once, and never the demo', async () => {
    addTag();
    startAnalytics(async () => ({ install: 'install-1', demo: false }));
    await flush();
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][1].description).toContain('ANALYTICS=off');

    resetAnalyticsForTests();
    startAnalytics(async () => ({ install: 'install-1', demo: false }));
    await flush();
    expect(toast).toHaveBeenCalledTimes(1);

    resetAnalyticsForTests();
    localStorage.clear();
    startAnalytics(async () => ({ install: 'demo', demo: true }));
    await flush();
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it('sends named events with only what the caller passed', async () => {
    addTag();
    startAnalytics(async () => ({ install: 'install-1', demo: false }));
    track('deploy_started', { template: 'self-hosted-it-tools', mode: 'standard' });
    await flush();
    expect(posthog.capture).toHaveBeenCalledWith('deploy_started', { template: 'self-hosted-it-tools', mode: 'standard' });
  });

  it('survives PostHog failing to load', async () => {
    addTag();
    startAnalytics(async () => { throw new Error('offline'); });
    track('signed_in');
    await flush();
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});

describe('scrub', () => {
  it('drops anything naming a host, URL or referrer and keeps the path', () => {
    const event = scrub({
      properties: {
        $current_url: 'https://nas.example.lan:8443/settings',
        $host: 'nas.example.lan:8443',
        $referrer: 'https://nas.example.lan/',
        $referring_domain: 'nas.example.lan',
        $initial_current_url: 'https://nas.example.lan/',
        $session_entry_url: 'https://nas.example.lan/',
        $pathname: '/settings',
        template: 'plex',
      },
      $set: { $initial_referrer: 'x' },
      $set_once: { $initial_host: 'x' },
    });
    expect(event).toEqual({ properties: { $pathname: '/settings', template: 'plex' } });
  });

  it('passes a dropped event through', () => {
    expect(scrub(null)).toBeNull();
  });
});
