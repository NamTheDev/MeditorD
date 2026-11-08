import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Preserve button interaction on :active and :focus-visible; never reintroduce
// hover-only visual changes on buttons or button-like navigation links.
const cssRoot = "public/css";
function stylesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? stylesIn(path) : path.endsWith(".css") ? [path] : [];
  });
}
test("buttons and button-like links have no hover CSS anywhere", () => {
  const hoverSelectors = [];
  for (const path of stylesIn(cssRoot)) {
    const css = readFileSync(path, "utf8");
    for (const match of css.matchAll(/:hover/g)) {
      const selectorStart = Math.max(css.lastIndexOf("}", match.index), css.lastIndexOf("{", match.index)) + 1;
      const selector = css.slice(selectorStart, css.indexOf("{", match.index)).trim();
      hoverSelectors.push({ path, selector });
    }
  }
  // The sole remaining hover belongs to ordinary database text links, not buttons.
  expect(hoverSelectors).toEqual([
    {
      path: "public/css/pages/database.css",
      selector: ".database-table-wrap td a:hover,\n.database-table-wrap td a:focus-visible",
    },
  ]);
});

test("pressed and keyboard focus styling are retained", () => {
  const chrome = readFileSync("public/css/global/chrome.css", "utf8");
  expect(chrome).toContain(":focus-visible");
  expect(chrome).toContain(":active:not(:disabled)");
  expect(chrome).toContain("outline: 1px dotted var(--ctp-red)");
  expect(readFileSync("public/css/pages/editor.css", "utf8"))
    .toContain(".editor-upload-button:active");
});
