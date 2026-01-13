/// <reference lib="dom" />
import { expect, test } from "bun:test";
import { render, screen } from "@testing-library/preact";
import { Sidebar } from "../src/components/Sidebar";

test("Sidebar renders with title and children", () => {
  render(
    <Sidebar title="Test Title">
      <div data-testid="child">Child Content</div>
    </Sidebar>,
  );
  expect(screen.getByText("Test Title")).toBeTruthy();
  expect(screen.getByTestId("child")).toBeTruthy();
  expect(screen.getByText("Child Content")).toBeTruthy();
});
