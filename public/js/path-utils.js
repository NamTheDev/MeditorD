// Folder paths use forward slashes; names retain their original casing.
(function (root) {
  function parentPath(path) {
    const index = path.lastIndexOf("/");
    return index < 0 ? "" : path.slice(0, index);
  }

  function leafName(path) {
    return path.slice(path.lastIndexOf("/") + 1);
  }

  function isValidFolderSegment(value) {
    return Boolean(value && value !== "." && value !== ".." &&
      !/[\\/\u0000-\u001f]/.test(value));
  }

  root.MeditorDPathUtils = { parentPath, leafName, isValidFolderSegment };
})(globalThis);
