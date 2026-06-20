import { describe, it, expect } from 'vitest';
import { Video, Film } from 'lucide-react';
import {
  getDisplayCategoryId,
  getAppIcon,
  getDisplayCategory,
  APP_ICON_MAP,
  DISPLAY_CATEGORIES,
} from './app-metadata';

describe('getDisplayCategoryId', () => {
  it('maps a CLI category to its display id', () => {
    expect(getDisplayCategoryId('media-servers')).toBe('media');
    expect(getDisplayCategoryId('media-management')).toBe('media');
    expect(getDisplayCategoryId('downloads')).toBe('downloads');
    expect(getDisplayCategoryId('ai')).toBe('ai');
  });

  it('falls back to "system" for an unknown CLI category', () => {
    expect(getDisplayCategoryId('nonexistent-category')).toBe('system');
  });
});

describe('getAppIcon', () => {
  it('returns the explicit icon for a mapped app', () => {
    expect(getAppIcon('plex', 'media-servers')).toBe(Video);
    expect(getAppIcon('radarr', 'media-management')).toBe(APP_ICON_MAP['radarr']);
  });

  it('falls back to the display category icon when the app is unmapped', () => {
    // unknown app in a media CLI category -> media display category icon (Film)
    expect(getAppIcon('some-unknown-media-app', 'media-servers')).toBe(Film);
  });

  it('falls back to Package when category is also unknown (-> system has an icon, so use truly missing)', () => {
    // Unknown app + unknown CLI category -> getDisplayCategoryId returns 'system',
    // which resolves to the Settings icon, NOT Package. Verify it returns the
    // system display category icon rather than undefined.
    const systemCat = DISPLAY_CATEGORIES.find(dc => dc.id === 'system');
    expect(getAppIcon('unknown-app', 'unknown-cat')).toBe(systemCat!.icon);
  });

  it('never returns undefined', () => {
    expect(getAppIcon('x', 'y')).toBeDefined();
  });
});

describe('getDisplayCategory', () => {
  it('returns the matching category object', () => {
    const cat = getDisplayCategory('media');
    expect(cat).toBeDefined();
    expect(cat!.name).toBe('Media & Entertainment');
  });

  it('returns undefined for an unknown id', () => {
    expect(getDisplayCategory('not-a-real-id')).toBeUndefined();
  });
});
