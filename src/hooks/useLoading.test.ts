// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useLoading } from "./useLoading";

describe("useLoading", () => {
  it("defaults loading to false and honours the initial state", () => {
    expect(renderHook(() => useLoading()).result.current.loading).toBe(false);
    expect(renderHook(() => useLoading(true)).result.current.loading).toBe(true);
  });

  it("toggles loading around a resolving async fn and returns its result", async () => {
    const { result } = renderHook(() => useLoading());
    const onSuccess = vi.fn();

    let resolve!: (v: string) => void;
    const pending = new Promise<string>((r) => {
      resolve = r;
    });

    let returned: string | undefined;
    let call: Promise<string | undefined>;
    act(() => {
      call = result.current.withLoading(() => pending, onSuccess);
    });

    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => {
      resolve("done");
      returned = await call;
    });

    expect(returned).toBe("done");
    expect(onSuccess).toHaveBeenCalledWith("done");
    expect(result.current.loading).toBe(false);
  });

  it("re-throws, clears loading, and reports the Error to onError", async () => {
    const { result } = renderHook(() => useLoading());
    const onError = vi.fn();
    const boom = new Error("kaboom");

    await act(async () => {
      await expect(
        result.current.withLoading(() => Promise.reject(boom), undefined, onError),
      ).rejects.toThrow("kaboom");
    });

    expect(onError).toHaveBeenCalledWith(boom);
    expect(result.current.loading).toBe(false);
  });

  it("wraps a non-Error rejection into an Error", async () => {
    const { result } = renderHook(() => useLoading());
    const onError = vi.fn();

    await act(async () => {
      await expect(
        result.current.withLoading(
          () => Promise.reject("string failure"),
          undefined,
          onError,
        ),
      ).rejects.toThrow("Unknown error");
    });

    const reported = onError.mock.calls[0][0];
    expect(reported).toBeInstanceOf(Error);
    expect(reported.message).toBe("Unknown error");
  });

  it("exposes setLoading for manual control", () => {
    const { result } = renderHook(() => useLoading());

    act(() => result.current.setLoading(true));
    expect(result.current.loading).toBe(true);

    act(() => result.current.setLoading(false));
    expect(result.current.loading).toBe(false);
  });
});
