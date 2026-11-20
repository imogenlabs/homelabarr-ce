import { toast } from 'sonner';
import type { PostHog } from 'posthog-js';

// Anonymous usage analytics. On unless the operator starts the frontend with
// ANALYTICS=off, in which case nginx never adds the meta tag below and none of
// this loads. PRIVACY.md is the public statement of what is sent; keep the two
// in step.

type Props = Record<string, string | number | boolean>;
export interface Instance {
  install: string | null;
  demo: boolean;
}

const PRIVACY_URL = 'https://github.com/imogenlabs/homelabarr-ce/blob/main/PRIVACY.md';
const NOTICE_KEY = 'hl_analytics_notice';

// An install's own address would say where it lives, so nothing naming a host,
// a URL or a referrer leaves the browser. The path alone stays.
const LOCATION_KEY = /url|host|referr|domain/i;

export function scrub<T extends { properties: Record<string, unknown>; $set?: unknown; $set_once?: unknown }>(event: T | null): T | null {
  if (!event) return event;
  for (const key of Object.keys(event.properties)) {
    if (LOCATION_KEY.test(key)) delete event.properties[key];
  }
  delete event.$set;
  delete event.$set_once;
  return event;
}

let client: Promise<PostHog | null> | null = null;

function showNoticeOnce() {
  try {
    if (localStorage.getItem(NOTICE_KEY)) return;
    localStorage.setItem(NOTICE_KEY, '1');
  } catch {
    return;
  }
  toast('HomelabARR now shares anonymous usage data', {
    description: 'It helps us see what gets used. No names, addresses or settings are sent. Start the frontend with ANALYTICS=off to turn it off.',
    duration: Infinity,
    action: { label: 'What is sent', onClick: () => window.open(PRIVACY_URL, '_blank', 'noopener') },
  });
}

export function startAnalytics(instance: () => Promise<Instance>) {
  const token = document.querySelector('meta[name="hl-analytics"]')?.getAttribute('content');
  if (!token || client) return;
  // The mobile app shows this dashboard in a web view and its App Store page
  // says the app collects no data. Keep that true: nothing is sent from it.
  if ('ReactNativeWebView' in window) return;
  client = (async () => {
    const [{ default: posthog }, { install, demo }] = await Promise.all([import('posthog-js'), instance()]);
    // No id means the backend could not be reached or predates this feature.
    if (!install) return null;
    posthog.init(token, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      // An install is one "user": every browser on it reports the install id
      // and nothing is stored. Demo visitors each keep their own id instead,
      // so the demo still shows how many people looked.
      persistence: demo ? 'localStorage' : 'memory',
      bootstrap: demo ? undefined : { distinctID: install },
      person_profiles: 'never',
      autocapture: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      rageclick: false,
      capture_pageleave: false,
      capture_heatmaps: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_product_tours: true,
      disable_conversations: true,
      disable_web_experiments: true,
      disable_external_dependency_loading: true,
      before_send: scrub,
    });
    // $geoip_disable: PostHog would otherwise place the server's address on a map.
    posthog.register({ product: 'homelabarr', app_version: __APP_VERSION__, install_id: install, demo, $geoip_disable: true });
    if (!demo) showNoticeOnce();
    return posthog;
  })().catch(() => null);
}

export function track(event: string, props: Props = {}) {
  void client?.then((posthog) => posthog?.capture(event, props));
}

export function resetAnalyticsForTests() {
  client = null;
}
