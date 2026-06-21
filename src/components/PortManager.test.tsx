// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PortManager } from "./PortManager";
import { checkUsedPorts, findAvailablePort } from "../lib/api";

vi.mock("../lib/api", () => ({
  checkUsedPorts: vi.fn(),
  findAvailablePort: vi.fn(),
}));

const mockedCheckUsedPorts = vi.mocked(checkUsedPorts);
const mockedFindAvailablePort = vi.mocked(findAvailablePort);

beforeEach(() => {
  vi.clearAllMocks();
  mockedCheckUsedPorts.mockResolvedValue({ usedPorts: [80, 443, 8080] });
  mockedFindAvailablePort.mockResolvedValue({ availablePort: 8081 });
});

describe("PortManager", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<PortManager isOpen={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
    expect(mockedCheckUsedPorts).not.toHaveBeenCalled();
  });

  it("fetches used ports on open and renders the returned list", async () => {
    render(<PortManager isOpen onClose={vi.fn()} />);

    expect(mockedCheckUsedPorts).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText("80")).toBeInTheDocument();
    });
    expect(screen.getByText("443")).toBeInTheDocument();
    expect(screen.getByText("8080")).toBeInTheDocument();
    // header reflects the count
    expect(screen.getByText("Currently Used Ports (3)")).toBeInTheDocument();
    // loading indicator is gone once resolved
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("re-invokes the fetch when Refresh is clicked", async () => {
    const user = userEvent.setup();
    render(<PortManager isOpen onClose={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("80")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /refresh/i }));

    expect(mockedCheckUsedPorts).toHaveBeenCalledTimes(2);
  });

  it("shows the suggested port returned by findAvailablePort", async () => {
    const user = userEvent.setup();
    render(<PortManager isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("80")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /find next available port/i }));

    expect(mockedFindAvailablePort).toHaveBeenCalledWith(8000, 9000);
    await waitFor(() => {
      expect(screen.getByText("Suggested:")).toBeInTheDocument();
    });
    expect(screen.getByText("8081")).toBeInTheDocument();
  });

  it("handles a fetch rejection without crashing and surfaces an error message", async () => {
    mockedCheckUsedPorts.mockRejectedValueOnce(new Error("boom"));
    render(<PortManager isOpen onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to fetch port information")).toBeInTheDocument();
    });
    // still renders the rest of the dialog
    expect(screen.getByText("Port Manager")).toBeInTheDocument();
  });

  it("surfaces an error when findAvailablePort rejects", async () => {
    mockedFindAvailablePort.mockRejectedValueOnce(new Error("none"));
    const user = userEvent.setup();
    render(<PortManager isOpen onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("80")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /find next available port/i }));

    await waitFor(() => {
      expect(
        screen.getByText("No available ports found in range 8000-9000"),
      ).toBeInTheDocument();
    });
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<PortManager isOpen onClose={onClose} />);
    await waitFor(() => expect(screen.getByText("80")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "×" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
