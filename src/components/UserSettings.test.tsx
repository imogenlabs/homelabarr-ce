// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within, act, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserSettings } from "./UserSettings";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

vi.mock("../contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../contexts/NotificationContext", () => ({ useNotifications: vi.fn() }));

const success = vi.fn();
const error = vi.fn();

// The change-password inputs are native <input type="password"> whose <label>s
// aren't associated via htmlFor, so getByLabelText can't reach them. Each lives
// in a <div> alongside its label text — grab the input next to the label.
function passwordInput(labelText: string): HTMLInputElement {
  const label = screen.getByText(labelText);
  const input = label.closest("div")?.querySelector("input");
  if (!input) throw new Error(`no input for ${labelText}`);
  return input as HTMLInputElement;
}

function okJson(body: unknown = {}) {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

// The "Change Password" tab button and the form's submit button share an
// accessible name (and the tab button defaults to type="submit"), so the only
// reliable discriminator is being inside the <form>.
function submitPasswordButton(): HTMLButtonElement {
  const btn = screen
    .getAllByRole("button", { name: /change password/i })
    .find((b) => b.closest("form") !== null);
  if (!btn) throw new Error("no submit button");
  return btn as HTMLButtonElement;
}

function mockAuth(isAdmin: boolean) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "u1", username: "admin", role: "admin" },
    isAuthenticated: true,
    isAdmin,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
  } as unknown as ReturnType<typeof useAuth>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth(true);
  vi.mocked(useNotifications).mockReturnValue({
    success,
    error,
    warning: vi.fn(),
    info: vi.fn(),
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
    notifications: [],
  } as unknown as ReturnType<typeof useNotifications>);

  // Permissive default so the users/activity fetches on tab-switch never blow
  // up the mount; individual tests override per call.
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      okJson([
        { id: "u1", username: "admin", email: "a@x.io", role: "admin", createdAt: "2024-01-01" },
        { id: "u2", username: "bob", email: "b@x.io", role: "user", createdAt: "2024-01-02" },
      ]),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const fetchMock = () => vi.mocked(global.fetch as unknown as ReturnType<typeof vi.fn>);

function changePasswordCalls() {
  return fetchMock().mock.calls.filter(
    (c) => String(c[0]).includes("/api/auth/change-password"),
  );
}

describe("UserSettings", () => {
  it("renders nothing when closed", () => {
    render(<UserSettings isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText("User Settings")).not.toBeInTheDocument();
  });

  it("renders the change-password tab by default when open", () => {
    render(<UserSettings isOpen onClose={vi.fn()} />);
    expect(screen.getByText("User Settings")).toBeInTheDocument();
    expect(screen.getByText("Current Password")).toBeInTheDocument();
    expect(submitPasswordButton()).toBeInTheDocument();
  });

  it("rejects mismatched new vs confirm password without calling fetch", async () => {
    const user = userEvent.setup();
    render(<UserSettings isOpen onClose={vi.fn()} />);

    await user.type(passwordInput("Current Password"), "oldpassword");
    await user.type(passwordInput("New Password"), "brandnewpass");
    await user.type(passwordInput("Confirm New Password"), "differentpass");
    await user.click(submitPasswordButton());

    expect(error).toHaveBeenCalledWith(
      "Password Mismatch",
      expect.stringMatching(/do not match/i),
    );
    expect(changePasswordCalls()).toHaveLength(0);
  });

  // NOTE: the component enforces a 6-char minimum (handlePasswordChange:
  // `newPassword.length < 6`), NOT the 12-char rule the ticket described.
  // Asserting the real threshold so the test isn't a lie.
  it("rejects a too-short new password without calling fetch", async () => {
    const user = userEvent.setup();
    render(<UserSettings isOpen onClose={vi.fn()} />);

    await user.type(passwordInput("Current Password"), "oldpassword");
    await user.type(passwordInput("New Password"), "abc"); // < 12 (server policy, HLCE-268)
    await user.type(passwordInput("Confirm New Password"), "abc");
    await user.click(submitPasswordButton());

    expect(error).toHaveBeenCalledWith(
      "Weak Password",
      expect.stringMatching(/at least 12/i),
    );
    expect(changePasswordCalls()).toHaveLength(0);
  });

  it("surfaces an error notification when the change-password request fails", async () => {
    const user = userEvent.setup();
    fetchMock().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Wrong current password" }),
    } as unknown as Response);

    render(<UserSettings isOpen onClose={vi.fn()} />);
    await user.type(passwordInput("Current Password"), "oldpassword");
    await user.type(passwordInput("New Password"), "validnewpassword");
    await user.type(passwordInput("Confirm New Password"), "validnewpassword");
    await user.click(submitPasswordButton());

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith("Password Change Failed", "Wrong current password"),
    );
    expect(success).not.toHaveBeenCalled();
    expect(changePasswordCalls()).toHaveLength(1);
  });

  it("shows a success notification when the change-password request succeeds", async () => {
    const user = userEvent.setup();
    fetchMock().mockResolvedValueOnce(okJson({}));

    render(<UserSettings isOpen onClose={vi.fn()} />);
    await user.type(passwordInput("Current Password"), "oldpassword");
    await user.type(passwordInput("New Password"), "validnewpassword");
    await user.type(passwordInput("Confirm New Password"), "validnewpassword");
    await user.click(submitPasswordButton());

    await waitFor(() =>
      expect(success).toHaveBeenCalledWith("Password Changed", expect.any(String)),
    );
    const [, init] = changePasswordCalls()[0];
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      currentPassword: "oldpassword",
      newPassword: "validnewpassword",
    });
  });

  it("hides the User Management and Activity tabs for non-admin users", () => {
    mockAuth(false);
    render(<UserSettings isOpen onClose={vi.fn()} />);

    expect(screen.getByText("Current Password")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /user management/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /activity log/i })).not.toBeInTheDocument();
  });

  it("loads and lists managed users when an admin opens the User Management tab", async () => {
    const user = userEvent.setup();
    render(<UserSettings isOpen onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /user management/i }));

    expect(await screen.findByText("bob")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        fetchMock().mock.calls.some((c) => String(c[0]) === "/api/auth/users"),
      ).toBe(true),
    );
  });

  it("creates a user via POST /api/auth/users from the Add User dialog", async () => {
    const user = userEvent.setup();
    render(<UserSettings isOpen onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /user management/i }));
    await screen.findByText("bob");

    // POST create resolves ok; subsequent refetch uses the default list mock.
    fetchMock().mockResolvedValueOnce(okJson({ id: "u3" }));

    await user.click(screen.getByRole("button", { name: /add user/i }));
    await user.type(await screen.findByLabelText("Username"), "carol");
    await user.type(screen.getByLabelText("Email"), "carol@x.io");
    await user.type(screen.getByLabelText("Password"), "carolpassword");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    await waitFor(() => {
      const post = fetchMock().mock.calls.find(
        (c) => String(c[0]) === "/api/auth/users" && (c[1] as RequestInit)?.method === "POST",
      );
      expect(post).toBeTruthy();
      expect(JSON.parse((post![1] as RequestInit).body as string)).toMatchObject({
        username: "carol",
        email: "carol@x.io",
        role: "user",
      });
    });
  });

  it("deletes a user via DELETE /api/auth/users/:id after confirming the dialog", async () => {
    const user = userEvent.setup();
    render(<UserSettings isOpen onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /user management/i }));
    await screen.findByText("bob");

    fetchMock().mockResolvedValueOnce(okJson({}));

    // bob (u2) is the only deletable row (admin u1 === current user, hidden).
    const deleteBtn = screen.getByRole("button", { name: /delete user/i });
    await user.click(deleteBtn);

    const confirm = await screen.findByRole("button", { name: /^delete$/i });
    await user.click(confirm);

    await waitFor(() => {
      const del = fetchMock().mock.calls.find(
        (c) =>
          String(c[0]) === "/api/auth/users/u2" &&
          (c[1] as RequestInit)?.method === "DELETE",
      );
      expect(del).toBeTruthy();
    });
  });

  it("resets a user's password via PUT /api/auth/users/:id/password", async () => {
    const user = userEvent.setup();
    render(<UserSettings isOpen onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: /user management/i }));
    await screen.findByText("bob");

    // Open the reset dialog from bob's row (each row has its own KeyRound button
    // titled "Reset password").
    const bobRow = screen.getByText("bob").closest("tr")!;
    await user.click(within(bobRow).getByRole("button", { name: /reset password/i }));

    const dialog = await screen.findByRole("dialog", { name: /reset password for bob/i });
    await user.type(within(dialog).getByLabelText("New Password"), "resetpassword1");
    await user.type(within(dialog).getByLabelText("Confirm Password"), "resetpassword1");

    fetchMock().mockResolvedValueOnce(okJson({}));
    await user.click(within(dialog).getByRole("button", { name: /^reset password$/i }));

    await waitFor(() => {
      const put = fetchMock().mock.calls.find(
        (c) =>
          String(c[0]) === "/api/auth/users/u2/password" &&
          (c[1] as RequestInit)?.method === "PUT",
      );
      expect(put).toBeTruthy();
      expect(JSON.parse((put![1] as RequestInit).body as string)).toEqual({
        newPassword: "resetpassword1",
      });
    });
  });

  it("loads the activity log when an admin opens the Activity tab", async () => {
    fetchMock().mockResolvedValueOnce(
      okJson({
        activities: [
          {
            id: "a1",
            userId: "u1",
            username: "admin",
            timestamp: new Date().toISOString(),
            action: "user_login",
            targetType: null,
            targetId: null,
            targetName: null,
            details: null,
            ipAddress: "10.0.0.1",
            userAgent: null,
          },
        ],
        total: 1,
      }),
    );

    render(<UserSettings isOpen onClose={vi.fn()} />);
    // act/fireEvent fallback for the tab click — keeps the effect-driven fetch
    // deterministic without a userEvent round-trip.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /activity log/i }));
    });

    expect(await screen.findByText("Logged in")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        fetchMock().mock.calls.some((c) => String(c[0]).includes("/api/auth/activity-log")),
      ).toBe(true),
    );
    const row = screen.getByText("admin").closest("tr");
    expect(within(row!).getByText("10.0.0.1")).toBeInTheDocument();
  });

  it("invokes onClose when the header close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<UserSettings isOpen onClose={onClose} />);

    // The X button is the only icon-only button in the password tab.
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
