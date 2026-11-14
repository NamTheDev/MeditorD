import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("one native scrollbar stylesheet owns workspace chrome", () => {
  const render = read("functions/render.ts");
  const database = read("public/database.html");
  const chrome = read("public/css/features/chrome-scrollbars.css");
  expect(render).toContain("/css/features/chrome-scrollbars.css");
  expect(render).not.toContain("/css/features/scrollbars.css");
  expect(database).not.toContain("/css/features/scrollbars.css");
  expect(existsSync("public/css/features/scrollbars.css")).toBe(false);
  expect(chrome).toContain("width: 17px;");
  expect(chrome).toContain("height: 17px;");
  expect(chrome).toContain("::-webkit-scrollbar-thumb");
  expect(chrome).toContain("::-webkit-scrollbar-button:single-button:vertical:decrement");
  expect(chrome).toContain("::-webkit-scrollbar-button:single-button:vertical:increment");
});

test("gallery navigation link and buttons have matching touch heights", () => {
  const markup = read("public/archive.html");
  const css = read("public/css/pages/archive-theme.css");
  expect(markup).toContain('id="databaseButton" href="/database.html"');
  const touch = css.slice(css.lastIndexOf("@media (pointer: coarse) {"));
  expect(touch).toContain("#backButton, #databaseButton, #newPostButton");
  expect(touch).toContain("min-height: 44px;");
  expect(touch).toContain("height: 44px;");
  expect(touch).toContain("grid-template-rows: 29px 46px;");
  expect(css).toContain("min-height: 30px;");
});

test("master frames preserve external margins and at least 8px internal clearance", () => {
  const frames = [
    ["public/css/pages/archive-theme.css", ".archive-page #fullscreenApp {"],
    ["public/css/pages/database-theme.css", ".database-page #databaseApp {"],
    ["public/css/pages/editor-theme.css", ".editor-page #fullscreenApp {"],
  ];
  for (const [path, selector] of frames) {
    const css = read(path);
    const rule = css.split(selector).slice(1)
      .map((block) => block.slice(0, block.indexOf("}")))
      .find((block) => block.includes("max(8px, var(--safe-top))"));
    expect(rule).toBeDefined();
    expect(css).toContain("width: calc(100% - 40px);");
    expect(css).toContain("height: calc(100dvh - 40px);");
    expect(css).toContain("margin: 20px;");
    expect(rule).toContain("max(8px, var(--safe-top))");
    expect(rule).toContain("max(8px, var(--safe-right))");
    expect(rule).toContain("max(8px, var(--safe-bottom))");
    expect(rule).toContain("max(8px, var(--safe-left))");
  }
});

test("archive post scrollport retains its native scrolling layout", () => {
  const archive = read("public/css/pages/archive-theme.css");
  const chrome = read("public/css/features/chrome-scrollbars.css");
  expect(archive).toMatch(/\.archive-page \.archive-gallery-viewport \{[^}]*overflow: auto;/);
  expect(chrome).toContain("background-color: #585b70;");
  expect(chrome).toContain("background: #313244;");
  expect(chrome).toContain("background: var(--ctp-mantle);");
  expect(chrome).toContain("box-shadow: inset 1px 1px var(--global-border-lightest);");
});
