import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// Harness smoke test: proves jsdom + @testing-library/react + jest-dom + the
// setup file all load and work. Delete once real component tests exist.
function Hello() {
  return <div role="status">harness ok</div>;
}

describe("frontend test harness", () => {
  it("renders a component in jsdom and applies jest-dom matchers", () => {
    render(<Hello />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("harness ok")).toBeVisible();
  });

  it("has a matchMedia polyfill available", () => {
    expect(typeof window.matchMedia).toBe("function");
    expect(window.matchMedia("(min-width: 1px)").matches).toBe(false);
  });
});
