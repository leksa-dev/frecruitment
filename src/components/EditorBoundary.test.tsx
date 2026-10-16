import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EditorBoundary from "./EditorBoundary";

function MissingChunk(): never {
  throw new Error("Failed to fetch dynamically imported module");
}

describe("EditorBoundary", () => {
  it("shows a reload prompt instead of blanking the page when the editor fails to load", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <p>Task prompt</p>
        <EditorBoundary>
          <MissingChunk />
        </EditorBoundary>
      </div>,
    );
    expect(screen.getByText("Task prompt")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("The editor could not load");
    expect(screen.getByText("Reload the page")).toBeInTheDocument();
  });
});
