import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

const files = [
  "global/variables.css", "global/base.css", "global/forms.css",
  "global/buttons.css", "global/dialogs.css", "global/responsive.css",
  "global/chrome.css", "pages/editor.css", "pages/editor-theme.css",
  "pages/archive.css", "pages/archive-explorer.css", "pages/archive-theme.css",
  "pages/database.css", "pages/database-theme.css", "pages/home.css",
  "pages/exit.css", "pages/not-found.css", "features/fonts.css",
  "features/scrollbars.css", "features/chrome-scrollbars.css",
];
const at = (p) => readFileSync(p, "utf8");

test("all organized stylesheets exist", () => {
  for (const file of files) expect(existsSync(`public/css/${file}`)).toBe(true);
});

test("legacy stylesheet paths are no longer referenced", () => {
  const sourceFiles = [
    "functions/render.ts", "public/global.html", "public/sw.js",
    "public/database.html",
  ];
  for (const file of sourceFiles) {
    const text = at(file);
    expect(text).not.toMatch(/\/css\/(?:workspace98|win98-scrollbars|global|edit|archive|database|home|exit|not-found|fonts)\.css/);
  }
});

test("stylesheet selectors have no legacy visual-style prefixes", () => {
  for (const file of files.filter((file) => !file.endsWith("fonts.css"))) {
    const css = at(`public/css/${file}`);
    expect(css).not.toMatch(/\.(?:workspace98|win98-)/);
    expect(css).not.toMatch(/--(?:win98-|w98-|scroll98-)/);
  }
});

test("page HTML and rendering use the renamed shared controls", () => {
  expect(at("public/edit.html")).toContain("editor-dialog");
  expect(at("public/archive.html")).toContain("global-select");
  expect(at("functions/render.ts")).toContain("archive-gallery-card");
  expect(at("public/global.html")).toContain("global-dialog-window");
  expect(at("public/global.html")).toContain("global-loading-track");
  expect(at("public/global.html")).toContain("global-loading-fill");
});
