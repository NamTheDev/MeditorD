import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const archiveHtml = readFileSync("public/archive.html", "utf8");
const archiveJs = readFileSync("public/js/archive.js", "utf8");
const renderTs = readFileSync("functions/render.ts", "utf8");

type FakeNode = {
  type: string;
  textContent: string;
  dataset: Record<string, string>;
  children: FakeNode[];
  append(...nodes: FakeNode[]): void;
  replaceChildren(...nodes: FakeNode[]): void;
  replacements: number;
};

function node(type: string): FakeNode {
  return {
    type,
    textContent: "",
    dataset: {},
    children: [],
    replacements: 0,
    append(...nodes) {
      for (const child of nodes) {
        if (child.type === "fragment") this.children.push(...child.children);
        else this.children.push(child);
      }
    },
    replaceChildren(...nodes) {
      this.replacements++;
      this.children = [];
      this.append(...nodes);
    },
  };
}

function breadcrumbForUrl(search: string) {
  const nav = node("nav");
  nav.dataset.currentFolder = "";
  const allPosts = node("button");
  allPosts.dataset.archivePath = "";
  allPosts.textContent = "All posts";
  nav.append(allPosts);

  const inlineScript = archiveHtml.match(
    /id="archiveBreadcrumbs"[\s\S]*?<\/nav>\s*<script>([\s\S]*?)<\/script>/,
  )?.[1];
  expect(inlineScript).toBeTruthy();

  const doc = {
    getElementById(id: string) {
      if (id !== "archiveBreadcrumbs") throw new Error("Unexpected element");
      return nav;
    },
    createDocumentFragment: () => node("fragment"),
    createElement: (tag: string) => node(tag),
  };
  runInNewContext(inlineScript!, {
    document: doc,
    window: { location: { search } },
    URLSearchParams,
  });
  return { nav, doc };
}

function labels(nav: FakeNode) {
  return nav.children.map(child => child.textContent).join("");
}

function refresh(nav: FakeNode, doc: unknown, folder: string) {
  const start = archiveJs.indexOf("function refreshArchiveFolderView() {");
  const end = archiveJs.indexOf("\nfunction syncArchiveFolderUrl(", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const fn = archiveJs.slice(start, end);
  runInNewContext(fn + "\nrefreshArchiveFolderView();", {
    archiveCrumbs: nav,
    postsContainer: { querySelectorAll: () => [] },
    activeArchiveFolder: folder,
    masonryInitialized: false,
    queueMasonryLayout: () => {},
    document: doc,
  });
}

test("breadcrumb is present in initial HTML and folder CSS loads in the head", () => {
  expect(archiveHtml).toContain('data-current-folder=""');
  expect(archiveHtml).toContain('data-archive-path="">All posts</button>');
  expect(archiveHtml).not.toContain('<link rel="stylesheet" href="/css/archive-explorer.css" />');
  expect(renderTs).toContain('...(isArchive ? [');
  expect(renderTs).toContain('"/css/archive-explorer.css"');
});

test("All posts appears immediately, without a directory fetch or DOM replacement", () => {
  const { nav, doc } = breadcrumbForUrl("");
  expect(labels(nav)).toBe("All posts");
  expect(nav.replacements).toBe(0);
  refresh(nav, doc, "");
  expect(nav.replacements).toBe(0);
});

test("nested or encoded folder breadcrumb is ready before async JavaScript", () => {
  const folder = "Art/2026/Thái Tĩnh";
  const { nav, doc } = breadcrumbForUrl("?folder=" + encodeURIComponent(folder));
  expect(labels(nav)).toBe("All posts / Art / 2026 / Thái Tĩnh");
  expect(nav.dataset.currentFolder).toBe(folder);
  const initialNodes = [...nav.children];
  const initialReplacements = nav.replacements;
  refresh(nav, doc, folder);
  expect(nav.replacements).toBe(initialReplacements);
  expect(nav.children.every((item, index) => item === initialNodes[index])).toBe(true);
});

test("switching folders updates the breadcrumb once and same-folder refresh preserves nodes", () => {
  const { nav, doc } = breadcrumbForUrl("?folder=Art");
  const before = nav.replacements;
  refresh(nav, doc, "Art/Photography");
  expect(nav.replacements).toBe(before + 1);
  expect(labels(nav)).toBe("All posts / Art / Photography");
  expect(nav.dataset.currentFolder).toBe("Art/Photography");
  const buttons = nav.children.filter(item => item.type === "button");
  expect(buttons.map(item => item.dataset.archivePath)).toEqual(["", "Art", "Art/Photography"]);
  refresh(nav, doc, "Art/Photography");
  expect(nav.replacements).toBe(before + 1);
});
