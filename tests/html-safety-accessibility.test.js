import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { serializeJsonForHtml } from "../functions/html.ts";

const read = (path) => readFileSync(path, "utf8");

test("archive JSON cannot escape its script element and round-trips", () => {
  const posts = [{
    title: '</script><img src=x onerror=alert(1)>',
    content: '<!-- comment --><script>bad</script> & "quotes"',
    username: "Artist 🖌️",
  }];
  const serialized = serializeJsonForHtml(posts);
  expect(serialized).not.toContain("<");
  expect(serialized).not.toContain("</script>");
  expect(JSON.parse(serialized)).toEqual(posts);
  expect(read("functions/render.ts")).toContain("const postsJson = serializeJsonForHtml(posts)");
});

test("global loading progress uses the same class in HTML and JavaScript", () => {
  expect(read("public/global.html")).toContain('class="global-loading-fill"');
  expect(read("public/js/app-shell.js")).toContain('overlay.querySelector(".global-loading-fill")');
});

test("all dialogs use keyboard focus management", () => {
  expect(read("public/global.html")).toContain('/js/dialog-focus.js');
  for (const file of ["public/js/app-dialog.js", "public/js/archive.js", "public/js/database.js", "public/js/edit.js"]) {
    expect(read(file)).toContain("window.meditordDialogFocus.trap(event,");
  }
  expect(read("public/archive.html")).toContain('aria-labelledby="modalTitle"');
  expect(read("public/js/app-dialog.js")).toContain("event.stopImmediatePropagation()");
  expect(read("public/js/archive.js")).toContain('?.querySelector(".archive-card-open-button") || trigger');
  expect(read("public/database.html")).toContain('aria-labelledby="editModalTitle"');
});

test("archive inspector opens with focus on the dialog, not its close button", () => {
  const markup = read("public/archive.html");
  const script = read("public/js/archive.js");
  expect(markup).toMatch(/id="postModal"[^>]*tabindex="-1"/);
  expect(script).toContain("modal.focus({ preventScroll: true });");
  expect(script).not.toContain('modal.querySelector(".global-modal-close-button")?.focus(');
  expect(script).toContain("window.meditordDialogFocus.trap(event, modal)");
  expect(script).toContain("window.meditordDialogFocus.restore(returnFocus)");
  expect(read("public/css/global/dialogs.css")).toContain("#postModal:focus");
});

test("archive post cards and editor media upload have native keyboard buttons", () => {
  expect(read("functions/render.ts")).toContain('type="button" class="archive-card-open-button"');
  expect(read("public/css/pages/archive.css")).toContain(".archive-card-open-button:focus-visible");
  expect(read("public/edit.html")).toContain('id="doc-media-trigger"');
  expect(read("public/js/edit.js")).toContain('mediaUploadButton.addEventListener("click"');
});

test("mobile view buttons form a named toggle group rather than incomplete ARIA tabs", () => {
  const html = read("public/edit.html");
  expect(html).toContain('role="group"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).not.toContain('role="tablist"');
  expect(read("public/js/edit.js")).toContain('setAttribute("aria-pressed"');
});
