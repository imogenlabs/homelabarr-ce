// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "./use-mobile";

// useIsMobile reads window.innerWidth and reacts to a matchMedia "change"
// event. We install a controllable matchMedia that captures the change handler
// so we can simulate a viewport crossing the 768px breakpoint.
let changeHandler: (() => void) | null = null;
const removeListener = vi.fn();

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
}

beforeEach(() => {
  changeHandler = null;
  removeListener.mockClear();
  window.matchMedia = vi.fn(
    () =>
      ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: (_: string, h: () => void) => {
          changeHandler = h;
        },
        removeEventListener: removeListener,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useIsMobile", () => {
  it("is true below the 768px breakpoint", () => {
    setWidth(500);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("is false at and above the 768px breakpoint", () => {
    setWidth(768);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("is true at 767px (one below the breakpoint)", () => {
    setWidth(767);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("reacts when the viewport crosses the breakpoint", () => {
    setWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWidth(500);
      changeHandler?.();
    });
    expect(result.current).toBe(true);
  });

  it("removes the matchMedia listener on unmount", () => {
    setWidth(500);
    const { unmount } = renderHook(() => useIsMobile());
    unmount();
    expect(removeListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
