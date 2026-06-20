// Vitest global setup. This file runs for BOTH the node (server/**) and jsdom
// (src/**) projects, so anything that touches the DOM is guarded behind a
// `typeof window` check and loaded lazily — importing @testing-library/react in
// a node environment would otherwise throw.
import { afterEach } from "vitest";

if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());

  // jsdom does not implement matchMedia; ThemeContext / use-mobile / lib/theme need it.
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
  }

  // Reset persisted browser state between tests (best-effort; jsdom storage
  // support varies, so never let cleanup fail a test).
  afterEach(() => {
    try {
      window.localStorage?.clear?.();
      window.sessionStorage?.clear?.();
    } catch {
      /* ignore */
    }
    try {
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date(0).toUTCString() + ";path=/");
      });
    } catch {
      /* ignore */
    }
  });
}
