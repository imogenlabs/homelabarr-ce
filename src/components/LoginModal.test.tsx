// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginModal } from "./LoginModal";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { apiFetch } from "../lib/api";

vi.mock("../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../contexts/NotificationContext", () => ({ useNotifications: vi.fn() }));
vi.mock("../lib/api", () => ({ apiFetch: vi.fn() }));

const login = vi.fn();
const success = vi.fn();
const error = vi.fn();
const onClose = vi.fn();
const reload = vi.fn();

function mockResponse(ok: boolean, body: unknown = {}) {
  return { ok, json: () => Promise.resolve(body) } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    login,
    logout: vi.fn(),
    isAuthenticated: false,
    isAdmin: false,
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
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload },
    writable: true,
  });
});

describe("LoginModal", () => {
  it("renders nothing when closed", () => {
    render(<LoginModal isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
  });

  it("renders the Sign In form when open", () => {
    render(<LoginModal isOpen onClose={onClose} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Sign In to HomelabARR")).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("rejects empty credentials without calling login", async () => {
    const user = userEvent.setup();
    render(<LoginModal isOpen onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(error).toHaveBeenCalledWith(
      "Missing Credentials",
      "Please enter both username and password",
    );
    expect(login).not.toHaveBeenCalled();
  });

  it("logs in and closes on the happy path", async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({});
    render(<LoginModal isOpen onClose={onClose} />);
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "pw123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(login).toHaveBeenCalledWith("alice", "pw123");
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Login Successful", "Welcome back, alice!"),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<LoginModal isOpen onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("switches to the Two-Factor step when MFA is required", async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({ mfa_required: true, ticket: "t1" });
    render(<LoginModal isOpen onClose={onClose} />);
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "pw123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(await screen.findByText("Two-Factor Authentication")).toBeInTheDocument();
    expect(screen.getByLabelText("Authentication Code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
  });

  async function reachMfaStep(user: ReturnType<typeof userEvent.setup>) {
    login.mockResolvedValue({ mfa_required: true, ticket: "t1" });
    render(<LoginModal isOpen onClose={onClose} />);
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "pw123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    await screen.findByText("Two-Factor Authentication");
  }

  it("rejects an empty MFA code", async () => {
    const user = userEvent.setup();
    await reachMfaStep(user);
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(error).toHaveBeenCalledWith(
      "Missing Code",
      "Please enter your authentication code",
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("verifies the MFA code, closes, and reloads", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(mockResponse(true));
    await reachMfaStep(user);
    await user.type(screen.getByLabelText("Authentication Code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/auth/login/mfa", expect.anything()));
    const [, init] = vi.mocked(apiFetch).mock.calls[0];
    expect(JSON.parse(init!.body as string)).toEqual({ ticket: "t1", code: "123456" });
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Login Successful", "Welcome back!"),
    );
    expect(onClose).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
  });

  it("sends backup_code after toggling 'Use a backup code'", async () => {
    const user = userEvent.setup();
    vi.mocked(apiFetch).mockResolvedValue(mockResponse(true));
    await reachMfaStep(user);
    await user.type(screen.getByLabelText("Authentication Code"), "shouldclear");
    await user.click(screen.getByRole("button", { name: "Use a backup code" }));
    const field = screen.getByLabelText("Backup Code");
    expect(field).toHaveValue("");
    await user.type(field, "BACKUP1");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    const [, init] = vi.mocked(apiFetch).mock.calls[0];
    expect(JSON.parse(init!.body as string)).toEqual({ ticket: "t1", backup_code: "BACKUP1" });
  });

  it("reports a failed login and shows the loading state while pending", async () => {
    const user = userEvent.setup();
    let reject!: (e: Error) => void;
    login.mockReturnValue(new Promise((_, r) => { reject = r; }));
    render(<LoginModal isOpen onClose={onClose} />);
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Password"), "pw123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    const button = screen.getByRole("button", { name: "Verifying..." });
    expect(button).toBeDisabled();

    reject(new Error("bad creds"));
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith("Login Failed", "bad creds"),
    );
  });
});
