import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, firefox } from "playwright";

const BASE = "http://127.0.0.1:3000";
const ARTIFACTS = "test-results/ui";

function near(actual, expected, message, tolerance = 1.5) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

async function snapshot(page, name) {
  await mkdir(ARTIFACTS, { recursive: true });
  await page.screenshot({ path: `${ARTIFACTS}/${name}.png`, fullPage: false });
}

async function frameGeometry(page, selector) {
  const data = await page.locator(selector).evaluate((node) => {
    const css = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    return {
      left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      paddingLeft: Number.parseFloat(css.paddingLeft),
      paddingRight: Number.parseFloat(css.paddingRight),
      paddingTop: Number.parseFloat(css.paddingTop),
      paddingBottom: Number.parseFloat(css.paddingBottom),
    };
  });
  near(data.left, 20, "master left margin");
  near(data.right, page.viewportSize().width - 20, "master right margin");
  near(data.top, 20, "master top margin");
  near(data.bottom, page.viewportSize().height - 20, "master bottom margin");
  for (const key of ["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"]) {
    assert.ok(data[key] >= 8, `${key}: ${data[key]} is below 8px`);
  }
  return data;
}

async function assertInsideFrame(page, frameSelector, scrollSelector) {
  const boxes = await page.evaluate(([frame, scroll]) => {
    const master = document.querySelector(frame)?.getBoundingClientRect();
    const child = document.querySelector(scroll)?.getBoundingClientRect();
    return master && child ? {
      master: { left: master.left, right: master.right, top: master.top, bottom: master.bottom },
      child: { left: child.left, right: child.right, top: child.top, bottom: child.bottom },
    } : null;
  }, [frameSelector, scrollSelector]);
  assert.ok(boxes, `missing ${frameSelector} or ${scrollSelector}`);
  assert.ok(boxes.child.left >= boxes.master.left + 7, `${scrollSelector} escapes master on left`);
  assert.ok(boxes.child.right <= boxes.master.right - 7, `${scrollSelector} escapes master on right`);
  assert.ok(boxes.child.top >= boxes.master.top + 7, `${scrollSelector} escapes master on top`);
  assert.ok(boxes.child.bottom <= boxes.master.bottom - 7, `${scrollSelector} escapes master on bottom`);
}

async function assertNativeWheel(page, scrollSelector) {
  const locator = page.locator(scrollSelector);
  await locator.evaluate((node) => {
    const filler = document.createElement("div");
    filler.style.cssText = "display:block;flex:0 0 1800px;height:1800px;min-height:1800px;width:1px";
    node.appendChild(filler);
    node.scrollTop = 0;
  });
  const before = await locator.evaluate(node => ({
    height: node.clientHeight, content: node.scrollHeight, top: node.scrollTop,
  }));
  assert.ok(before.content > before.height, `${scrollSelector} did not become scrollable`);
  await locator.hover();
  await page.mouse.wheel(0, 480);
  await page.waitForTimeout(220);
  const after = await locator.evaluate(node => node.scrollTop);
  assert.ok(after > before.top, `${scrollSelector} failed native mouse-wheel scrolling`);
  await locator.evaluate(node => { node.scrollTop = 0; });
}

// Chromium exposes the rendered native scrollbar pseudo-element's computed
// style. Assert that arrow buttons are gone, rather than merely testing wheel
// scrolling, which previously missed duplicate buttons at both ends.
async function assertNoNativeArrowButtons(page, scrollSelector) {
  const button = await page.locator(scrollSelector).evaluate((node) => {
    const style = getComputedStyle(node, "::-webkit-scrollbar-button");
    return { display: style.display, width: style.width, height: style.height };
  });
  assert.equal(button.display, "none", `${scrollSelector} native scrollbar button must be hidden`);
  assert.equal(button.width, "0px", `${scrollSelector} scrollbar button width must be zero`);
  assert.equal(button.height, "0px", `${scrollSelector} scrollbar button height must be zero`);
}

async function checkNavigation(page, expectedHeight) {
  const nav = await page.locator("#backButton, #databaseButton, #newPostButton").evaluateAll(nodes =>
    nodes.map(node => ({
      id: node.id,
      height: node.getBoundingClientRect().height,
      top: node.getBoundingClientRect().top,
      bottom: node.getBoundingClientRect().bottom,
    }))
  );
  assert.equal(nav.length, 3);
  for (const item of nav) near(item.height, expectedHeight, `${item.id} height`, 1);
  near(nav[0].top, nav[1].top, "HOME and DATABASE top alignment");
  near(nav[1].top, nav[2].top, "DATABASE and SUBMISSION top alignment");
  near(nav[0].bottom, nav[1].bottom, "HOME and DATABASE bottom alignment");
}

async function pageHasNoDocumentScroll(page) {
  const state = await page.evaluate(() => ({
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
    bodyOverflow: getComputedStyle(document.body).overflow,
    widthOverflow: document.documentElement.scrollWidth > innerWidth + 2,
  }));
  assert.equal(state.htmlOverflow, "hidden");
  assert.equal(state.bodyOverflow, "hidden");
  assert.equal(state.widthOverflow, false, "unexpected horizontal document overflow");
}

async function openApp(page, route) {
  const response = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
  assert.equal(response?.status(), 200, `HTTP response for ${route}`);
  await page.waitForTimeout(400);
}

async function runBrowser(browserType, name, mobile) {
  const browser = await browserType.launch({ headless: true });
  const settings = mobile
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: name === "chromium" }
    : { viewport: { width: 1440, height: 900 }, hasTouch: false };
  const context = await browser.newContext(settings);
  const page = await context.newPage();
  try {
    await openApp(page, "/archive.html");
    await frameGeometry(page, "#fullscreenApp");
    await checkNavigation(page, mobile ? 44 : 30);
    await pageHasNoDocumentScroll(page);
    await assertInsideFrame(page, "#fullscreenApp", "#archiveFolderTree");
    await assertInsideFrame(page, "#fullscreenApp", "#galleryViewport");
    if (name === "chromium") {
      await assertNoNativeArrowButtons(page, "#archiveFolderTree");
      await assertNoNativeArrowButtons(page, "#galleryViewport");
    }
    if (!mobile) {
      await assertNativeWheel(page, "#archiveFolderTree");
      await assertNativeWheel(page, "#galleryViewport");
    }
    await snapshot(page, `${name}-${mobile ? "touch" : "desktop"}-archive`);

    await openApp(page, "/database.html");
    await frameGeometry(page, "#databaseApp");
    await pageHasNoDocumentScroll(page);
    await assertInsideFrame(page, "#databaseApp", ".database-table-wrap");
    if (name === "chromium") await assertNoNativeArrowButtons(page, ".database-table-wrap");
    const actions = await page.locator(".database-actions button").evaluateAll(nodes =>
      nodes.map(node => node.getBoundingClientRect().height)
    );
    assert.equal(actions.length, 5);
    for (const height of actions) near(height, mobile ? 44 : 30, "database navigation height");
    if (!mobile) await assertNativeWheel(page, ".database-table-wrap");
    await snapshot(page, `${name}-${mobile ? "touch" : "desktop"}-database`);

    await openApp(page, "/edit.html");
    await frameGeometry(page, "#fullscreenApp");
    await pageHasNoDocumentScroll(page);
    await assertInsideFrame(page, "#fullscreenApp", ".editor-layout");
    if (name === "chromium") await assertNoNativeArrowButtons(page, ".editor-textarea");
    if (!mobile) {
      await assertInsideFrame(page, "#fullscreenApp", ".editor-left-pane");
      await assertInsideFrame(page, "#fullscreenApp", ".editor-textarea");
      const field = page.locator(".editor-textarea");
      await field.fill(Array.from({ length: 260 }, (_, i) => `Line ${i}: a long passage for the native scrolling regression`).join("\n"));
      const textarea = await field.evaluate(node => {
        node.scrollTop = node.scrollHeight;
        return { client: node.clientHeight, scroll: node.scrollHeight, top: node.scrollTop };
      });
      assert.ok(textarea.scroll > textarea.client && textarea.top > 0, "Editor textarea native scrolling broken");
    }
    await snapshot(page, `${name}-${mobile ? "touch" : "desktop"}-editor`);
  } finally {
    await context.close();
    await browser.close();
  }
}

test("Chromium desktop: frames, navigation, native scrolling", { timeout: 120000 }, async () => {
  await runBrowser(chromium, "chromium", false);
});
test("Chromium 390px touch: frame containment and 44px controls", { timeout: 120000 }, async () => {
  await runBrowser(chromium, "chromium", true);
});
test("Firefox desktop: frame containment and native scrolling", { timeout: 120000 }, async () => {
  await runBrowser(firefox, "firefox", false);
});
