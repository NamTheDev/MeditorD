import { test, expect } from "bun:test";
import "../public/js/archive-utils.js";

const { archiveDisplayTitle, archivePostDate } = globalThis.MeditorDArchiveUtils;

test("archive title displays only the final path segment", () => {
  expect(archiveDisplayTitle("folder/subfolder/post")).toBe("post");
  expect(archiveDisplayTitle("post")).toBe("post");
  expect(archiveDisplayTitle("folder/")).toBe("");
});

test("archive dates preserve UTC timestamps and tolerate invalid data", () => {
  expect(archivePostDate({ created_at: "2026-01-02 03:04:05" }))
    .toBe(Date.parse("2026-01-02T03:04:05Z"));
  expect(archivePostDate({ created_at: "2026-01-02T03:04:05Z" }))
    .toBe(Date.parse("2026-01-02T03:04:05Z"));
  expect(archivePostDate({ created_at: "invalid" })).toBe(0);
  expect(archivePostDate(null)).toBe(0);
});
