// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { EnhancedMountManager } from "./EnhancedMountManager";

// RcloneAuthWizard is a heavy child; stub it so we only exercise the manager.
vi.mock("./RcloneAuthWizard", () => ({
  RcloneAuthWizard: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="auth-wizard" /> : null,
}));

const successPayload = {
  success: true,
  data: {
    providers: {
      gdrive: { enabled: true, status: "connected", quota: "750GB/day" },
      backblaze: { enabled: false, status: "disabled" },
    },
    costs: { monthly: 20, budget: 100, current_provider: "gdrive" },
    performance: {
      upload_speed: "10 MB/s",
      download_speed: "30 MB/s",
      cache_usage: "10GB / 100GB",
      active_transfers: 7,
    },
    mounts: { unionfs: true, rclone: true },
  },
};

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EnhancedMountManager", () => {
  it("renders tabs and the default overview tab once stats resolve", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(successPayload)));

    render(<EnhancedMountManager containerId="c1" containerName="Plex" />);

    // initial loading state
    expect(screen.getByText(/Loading enhanced mount statistics/i)).toBeInTheDocument();

    await vi.waitFor(() => {
      expect(screen.getByText("Enhanced Cloud Mount - Plex")).toBeInTheDocument();
    });

    // all four tabs present
    expect(screen.getByRole("button", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /providers/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /costs/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /performance/i })).toBeInTheDocument();

    // overview content from the resolved payload
    expect(screen.getByText("$20.00")).toBeInTheDocument();
    expect(screen.getByText("of $100 budget")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("switches tabs to render the other tab's content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(successPayload)));

    render(<EnhancedMountManager containerId="c1" containerName="Plex" />);
    await vi.waitFor(() =>
      expect(screen.getByText("Enhanced Cloud Mount - Plex")).toBeInTheDocument(),
    );

    act(() => fireEvent.click(screen.getByRole("button", { name: /providers/i })));
    expect(screen.getByText("Google Drive")).toBeInTheDocument();
    expect(screen.getByText("Backblaze B2")).toBeInTheDocument();

    act(() => fireEvent.click(screen.getByRole("button", { name: /performance/i })));
    expect(screen.getByText("Transfer Speeds")).toBeInTheDocument();
    expect(screen.getByText("Cache Performance")).toBeInTheDocument();

    act(() => fireEvent.click(screen.getByRole("button", { name: /costs/i })));
    expect(screen.getByText("Cost Analysis")).toBeInTheDocument();
    expect(screen.getByText("Provider Breakdown")).toBeInTheDocument();
  });

  it("falls back to built-in mock data when the api call rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<EnhancedMountManager containerId="c1" containerName="Sonarr" />);

    await vi.waitFor(() => {
      expect(screen.getByText("Enhanced Cloud Mount - Sonarr")).toBeInTheDocument();
    });

    // known values from the component's hardcoded mock fallback
    expect(screen.getByText("$12.50")).toBeInTheDocument();
    expect(screen.getByText("of $50 budget")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // active_transfers
    errSpy.mockRestore();
  });

  it("also falls back to mock data when the api returns success:false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(okResponse({ success: false, error: "nope" })),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<EnhancedMountManager containerId="c1" containerName="Radarr" />);

    await vi.waitFor(() => {
      expect(screen.getByText("Enhanced Cloud Mount - Radarr")).toBeInTheDocument();
    });
    expect(screen.getByText("$12.50")).toBeInTheDocument();
    errSpy.mockRestore();
  });

  it("sets up a polling interval and clears it on unmount", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(successPayload)));
    const clearSpy = vi.spyOn(global, "clearInterval");

    const { unmount } = render(
      <EnhancedMountManager containerId="c1" containerName="Plex" />,
    );
    await vi.waitFor(() =>
      expect(screen.getByText("Enhanced Cloud Mount - Plex")).toBeInTheDocument(),
    );

    const callsBefore = (fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    // advance past the 30s interval — fetch fires again
    await vi.advanceTimersByTimeAsync(30000);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
      callsBefore,
    );

    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it("re-fetches when the Refresh button is clicked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse(successPayload)));

    render(<EnhancedMountManager containerId="c1" containerName="Plex" />);
    await vi.waitFor(() =>
      expect(screen.getByText("Enhanced Cloud Mount - Plex")).toBeInTheDocument(),
    );

    const before = (fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    act(() => fireEvent.click(screen.getByRole("button", { name: /^refresh$/i })));
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(before);
  });
});
