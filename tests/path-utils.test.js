import { test, expect } from "bun:test";
import "../public/js/path-utils.js";

const { parentPath, leafName, isValidFolderSegment } = globalThis.MeditorDPathUtils;

test("folder paths preserve nested names, Unicode, and casing", () => {
  for (const [path, parent, leaf] of [
    ["", "", ""], ["Post", "", "Post"],
    ["Art/Thái Tĩnh/Post", "Art/Thái Tĩnh", "Post"],
    ["Art/", "Art", ""],
  ]) {
    expect(parentPath(path)).toBe(parent);
    expect(leafName(path)).toBe(leaf);
  }
});

test("folder segments reject traversal, separators, and control characters", () => {
  for (const value of ["", ".", "..", "a/b", "a\\b", "a\0b", "a\nb", "a\x1fb"]) {
    expect(isValidFolderSegment(value)).toBe(false);
  }
  for (const value of ["Art", "Thái Tĩnh", "my folder", "...", ".hidden"]) {
    expect(isValidFolderSegment(value)).toBe(true);
  }
});
