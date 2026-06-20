import { describe, it, expect } from 'vitest';
import { getAppIconPath, getCdnFallbackUrl } from './iconMap';

const CDN = 'https://cdn.jsdelivr.net/gh/selfhst/icons/png/';

describe('getAppIconPath', () => {
  it('resolves a known icon to a local light webp path', () => {
    expect(getAppIconPath('sonarr', 'light')).toBe('/icons/apps/light/sonarr.webp?v=2');
  });

  it('always returns the local light path even when dark is requested', () => {
    expect(getAppIconPath('plex', 'dark')).toBe('/icons/apps/light/plex.webp?v=2');
  });

  it('normalizes spaces to dashes and lowercases', () => {
    // "Home Assistant" -> "home-assistant" -> mapped to "homeassistant" (a known icon)
    expect(getAppIconPath('Home Assistant', 'light')).toBe('/icons/apps/light/homeassistant.webp?v=2');
  });

  it('applies the nameToIconFile alias map', () => {
    // "home-assistant" maps to "homeassistant"
    expect(getAppIconPath('home-assistant', 'light')).toBe('/icons/apps/light/homeassistant.webp?v=2');
  });

  it('falls back to the CDN url for an unknown icon', () => {
    expect(getAppIconPath('totally-unknown-app', 'light')).toBe(`${CDN}totally-unknown-app.png`);
  });
});

describe('getCdnFallbackUrl', () => {
  it('returns a CDN url for a known app', () => {
    expect(getCdnFallbackUrl('sonarr')).toBe(`${CDN}sonarr.png`);
  });

  it('returns a CDN url for an unknown app', () => {
    expect(getCdnFallbackUrl('whatever')).toBe(`${CDN}whatever.png`);
  });

  it('normalizes the name before building the url', () => {
    expect(getCdnFallbackUrl('Home Assistant')).toBe(`${CDN}homeassistant.png`);
  });
});
