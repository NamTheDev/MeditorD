import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const js = readFileSync("public/js/archive.js", "utf8");
const css = readFileSync("public/css/archive.css", "utf8");

function sampleLayout() {
  const changes = [0, 0, 0];
  const cards = [220, 350, 275].map((height, index) => {
    let gridRowEnd = "";
    const style = {
      display: "",
      get gridRowEnd() { return gridRowEnd; },
      set gridRowEnd(value: string) { changes[index] = (changes[index] ?? 0) + 1; gridRowEnd = value; },
      removeProperty(name: string) {
        if (name === "grid-row-end") { changes[index] = (changes[index] ?? 0) + 1; gridRowEnd = ""; }
      },
    };
    return {
      hidden: false,
      style,
      getBoundingClientRect() { return { height, width: 270 }; },
    };
  });
  const classes = new Set<string>();
  const gallery = {
    querySelectorAll: () => cards,
    classList: {
      toggle(name: string, active: boolean) {
        if (active) classes.add(name);
        else classes.delete(name);
      },
      add(name: string) { classes.add(name); },
    },
  };
  const viewport = { clientWidth: 880 };
  const start = js.indexOf("function layoutMasonry() {");
  const end = js.indexOf("\nfunction queueMasonryLayout()", start);
  const source = js.slice(start, end);
  const context = {
    postsContainer: gallery,
    masonryFrame: 0,
    visibleMasonryCards: () => cards.filter(card => !card.hidden && card.style.display !== "none"),
    showMasonryDiagnostics: () => {},
    getComputedStyle: (element: any) => element === gallery
      ? { display: "grid", gridAutoRows: "8px", rowGap: "16px", gridTemplateColumns: "270px 270px 270px" }
      : { paddingLeft: "12px", paddingRight: "12px" },
    document: { getElementById: () => viewport },
    Math, Number,
  };
  return { changes, cards, classes, layout: () => runInNewContext(source + "\nlayoutMasonry();", context) };
}

test("first layout establishes spans before revealing the gallery", () => {
  expect(css).toContain(".reddit-gallery:not(.masonry-ready) .gallery-card");
  const { cards, classes, layout } = sampleLayout();
  layout();
  expect(classes.has("masonry-ready")).toBe(true);
  expect(cards.every(card => card.style.gridRowEnd.startsWith("span "))).toBe(true);
});

test("stable masonry geometry is not torn down or rewritten on repeated passes", () => {
  const { changes, layout } = sampleLayout();
  layout();
  const initial = [...changes];
  layout();
  expect(changes).toEqual(initial);
});

test("folder filtering removes only hidden cards' stale spans", () => {
  const { cards, changes, layout } = sampleLayout();
  layout();
  const before = [...changes];
  cards[1]!.hidden = true;
  cards[1]!.style.display = "none";
  layout();
  expect(cards[1]!.style.gridRowEnd).toBe("");
  expect(changes[0]).toBe(before[0]);
  expect(changes[2]).toBe(before[2]);
});

test("closing an inspector does not trigger a page reload", () => {
  const start = js.indexOf("function closeModal()");
  const end = js.indexOf("\nfunction stopModalMedia", start);
  const closeModal = js.slice(start, end);
  expect(closeModal).not.toContain("window.location.reload()");
  expect(closeModal).toContain("refreshArchiveFromCacheUpdate()");
});
