// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiKeysModal } from "./ApiKeysModal";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

vi.mock("../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../contexts/NotificationContext", () => ({ useNotifications: vi.fn() }));

const success = vi.fn();
const error = vi.fn();
const onClose = vi.fn();

// The modal lists keys on open via GET /api/auth/api-keys → { apiKeys: [...] }.
// Each key is { id, keyPreview, label, createdAt, lastUsed }.
function listResponse(apiKeys: unknown[] = [defaultKey()]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ apiKeys }),
  } as unknown as Response;
}

function defaultKey() {
  return {
    id: "k1",
    keyPreview: "hlk_abc…",
    label: "ci",
    createdAt: new Date().toISOString(),
    lastUsed: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "u1", username: "admin", role: "admin" },
    isAuthenticated: true,
    isAdmin: true,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
  } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(useNotifications).mockReturnValue({
    success,
    error,
    warning: vi.fn(),
    info: vi.fn(),
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    notifications: [],
  } as unknown as ReturnType<typeof useNotifications>);

  // Default fetch returns one listed key. Tests override per-call as needed.
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(listResponse()));

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const fetchMock = () => vi.mocked(fetch);

describe("ApiKeysModal", () => {
  it("lists existing keys on open (GET) and renders them", async () => {
    render(<ApiKeysModal isOpen onClose={onClose} />);

    await waitFor(() => expect(fetchMock()).toHaveBeenCalled());
    expect(fetchMock().mock.calls[0][0]).toBe("/api/auth/api-keys");

    expect(await screen.findByText("ci")).toBeInTheDocument();
    expect(screen.getByText("hlk_abc…")).toBeInTheDocument();
  });

  it("creates a key, shows the one-time secret, and fires success()", async () => {
    const user = userEvent.setup();
    const secret = "hlk_ONE_TIME_SECRET_xyz";
    fetchMock()
      .mockResolvedValueOnce(listResponse([])) // initial list (empty)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ key: secret, id: "k2", name: "new" }),
      } as unknown as Response)
      .mockResolvedValueOnce(listResponse([])); // refetch after create

    render(<ApiKeysModal isOpen onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /generate new key/i }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    expect(await screen.findByText(secret)).toBeInTheDocument();
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        "API Key Created",
        expect.any(String),
      ),
    );

    // POST went to the right endpoint with the label in the body.
    const postCall = fetchMock().mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method === "POST",
    );
    expect(postCall?.[0]).toBe("/api/auth/api-keys");
    expect(JSON.parse((postCall?.[1] as RequestInit).body as string)).toEqual({
      label: "Mobile App",
    });
  });

  it("surfaces an error notification and shows no secret when create fails", async () => {
    const user = userEvent.setup();
    fetchMock()
      .mockResolvedValueOnce(listResponse([])) // initial list
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: "bad" }),
      } as unknown as Response);

    render(<ApiKeysModal isOpen onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /generate new key/i }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith("Error", expect.any(String)),
    );
    // No one-time secret card rendered.
    expect(screen.queryByText(/won't be shown again/i)).not.toBeInTheDocument();
  });

  it("revokes a listed key via DELETE and fires success()", async () => {
    fetchMock()
      .mockResolvedValueOnce(listResponse([defaultKey()])) // initial list
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as unknown as Response) // DELETE
      .mockResolvedValueOnce(listResponse([])); // refetch (now empty)

    render(<ApiKeysModal isOpen onClose={onClose} />);

    // The revoke control is the (icon-only) trash button inside the listed
    // key's card. Walk up from the label text to the card that contains a
    // button. Radix Dialog sets `pointer-events: none` on body in jsdom, so
    // drive the click with fireEvent rather than user-event.
    await screen.findByText("ci");
    let node: HTMLElement | null = screen.getByText("ci");
    let revokeBtn: HTMLButtonElement | null = null;
    while (node && !revokeBtn) {
      revokeBtn = node.querySelector("button");
      node = node.parentElement;
    }
    expect(revokeBtn).not.toBeNull();
    await act(async () => {
      fireEvent.click(revokeBtn!);
    });

    const deleteCall = fetchMock().mock.calls.find(
      (c) => (c[1] as RequestInit | undefined)?.method === "DELETE",
    );
    expect(deleteCall?.[0]).toBe("/api/auth/api-keys/k1");
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Revoked", expect.any(String)),
    );
  });

  it("copies the new secret to the clipboard and shows the copied affordance", async () => {
    const user = userEvent.setup();
    const secret = "hlk_COPY_ME_123";
    fetchMock()
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ key: secret }),
      } as unknown as Response)
      .mockResolvedValueOnce(listResponse([]));

    render(<ApiKeysModal isOpen onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /generate new key/i }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await screen.findByText(secret);

    // userEvent.setup() installs its own clipboard stub; re-apply ours so we
    // can assert on writeText, then drive the click via fireEvent.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    // The copy button is the outline button next to the secret <code>.
    const code = screen.getByText(secret);
    const copyBtn = code.parentElement?.querySelector(
      "button",
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeText).toHaveBeenCalledWith(secret);
    // The check icon swaps in (emerald check) — assert the SVG state changed.
    await waitFor(() =>
      expect(copyBtn.querySelector("svg")?.classList.toString()).toMatch(
        /emerald/,
      ),
    );
  });

  it("falls back to execCommand when clipboard.writeText rejects (no crash)", async () => {
    const user = userEvent.setup();
    const secret = "hlk_FALLBACK_456";
    // Clipboard write rejects → component hits the execCommand fallback path.
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    fetchMock()
      .mockResolvedValueOnce(listResponse([]))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ key: secret }),
      } as unknown as Response)
      .mockResolvedValueOnce(listResponse([]));

    render(<ApiKeysModal isOpen onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /generate new key/i }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await screen.findByText(secret);

    const code = screen.getByText(secret);
    const copyBtn = code.parentElement?.querySelector(
      "button",
    ) as HTMLButtonElement;

    // Must not throw, and the fallback uses document.execCommand("copy").
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith("copy"));
    // Key still visible after the fallback; copied affordance still flips.
    expect(screen.getByText(secret)).toBeInTheDocument();
  });

  it("renders relative 'h ago' / 'd ago' labels and lastUsed", async () => {
    const older = {
      id: "k9",
      keyPreview: "hlk_old…",
      label: "old-key",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // 30h → "1d ago"
      lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3h → "3h ago"
    };
    fetchMock().mockResolvedValue(listResponse([older]));

    render(<ApiKeysModal isOpen onClose={onClose} />);

    expect(await screen.findByText("old-key")).toBeInTheDocument();
    expect(screen.getByText(/created 1d ago/i)).toBeInTheDocument();
    expect(screen.getByText(/used 3h ago/i)).toBeInTheDocument();
  });

  it("renders the empty state when there are no keys", async () => {
    fetchMock().mockResolvedValue(listResponse([]));
    render(<ApiKeysModal isOpen onClose={onClose} />);
    expect(await screen.findByText(/no api keys yet/i)).toBeInTheDocument();
  });

  it("calls onClose from the Done button", async () => {
    const user = userEvent.setup();
    render(<ApiKeysModal isOpen onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /^done$/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
