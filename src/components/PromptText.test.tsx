import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import PromptText from "./PromptText";

const PROMPT = [
  "Implement `debounce` with **no** libraries.",
  "It keeps the latest arguments.",
  "",
  "Signature:",
  "```ts",
  "debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number): (...a: A) => void",
  "```",
  "",
  "Requirements:",
  "- Reset the timer on every call.",
  "- Pass `args` through.",
  "",
  "1. First step",
  "2. Second step",
  "<img src=x onerror=alert(1)>",
].join("\n");

describe("PromptText", () => {
  it("renders inline code, bold, code blocks, lists and paragraphs", () => {
    const { container } = render(<PromptText text={PROMPT} />);
    const first = container.querySelector("p")!;
    expect(first.querySelector("code")).toHaveTextContent("debounce");
    expect(first.querySelector("strong")).toHaveTextContent("no");
    expect(first.querySelectorAll("br")).toHaveLength(1);

    expect(container.querySelector("pre code")).toHaveTextContent("debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number)");
    expect([...container.querySelectorAll("ul li")].map((li) => li.textContent)).toEqual(["Reset the timer on every call.", "Pass args through."]);
    expect(container.querySelectorAll("ol li")).toHaveLength(2);
  });

  it("shows HTML in the prompt as text, never as markup", () => {
    const { container } = render(<PromptText text={PROMPT} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("<img src=x onerror=alert(1)>");
  });

  it("keeps the indentation inside code blocks", () => {
    const { container } = render(<PromptText text={"```\nif (x) {\n  y();\n}\n```"} />);
    expect(container.querySelector("pre code")!.textContent).toBe("if (x) {\n  y();\n}");
  });
});
