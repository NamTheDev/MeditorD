import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function cssFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? cssFiles(path) : path.endsWith(".css") ? [path] : [];
  });
}

test("no dotted or dashed outlines remain in application CSS", () => {
  for (const path of cssFiles("public/css")) {
    const css = readFileSync(path, "utf8");
    expect(css).not.toMatch(/outline\s*:\s*[^;]*\b(?:dotted|dashed)\b/i);
  }
});

test("close buttons retain pressed bevel without an active outline", () => {
  const css = readFileSync("public/css/global/chrome.css", "utf8");
  const selector = "body.global-workspace :is(.global-dialog-close, .editor-dialog-close, .global-modal-close-button, .database-modal-close):active:not(:disabled)";
  expect(css).not.toContain(selector + " {\n    outline:");
  expect(css).toContain(selector + " {");
  expect(css).toContain("box-shadow: var(--global-chrome-sunken)");
});

test("keyboard controls still expose non-dotted focus treatment", () => {
  const buttons = readFileSync("public/css/global/buttons.css", "utf8");
  expect(buttons).toContain(".global-action-button:focus-visible");
  expect(buttons).toMatch(/outline: 1px solid var\(--global-accent\)/);
});

test("selection dropdowns never draw focus or click outlines", () => {
  const forms = readFileSync("public/css/global/forms.css", "utf8");
  const chrome = readFileSync("public/css/global/chrome.css", "utf8");
  const archive = readFileSync("public/css/pages/archive.css", "utf8");
  const database = readFileSync("public/css/pages/database.css", "utf8");
  expect(chrome).toContain("select:is(:focus, :focus-visible) {\n    outline: none;");
  for (const css of [forms, archive, database]) {
    expect(css).not.toMatch(/select:focus-visible\s*\{\s*outline:/);
  }
  expect(forms).toContain(".global-select > select {");
});
