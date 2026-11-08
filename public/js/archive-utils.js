// Pure archive helpers shared by the archive page and its regression tests.
(function (root) {
  function archiveDisplayTitle(path) {
    return path.slice(path.lastIndexOf("/") + 1);
  }

  function archivePostDate(post) {
    const value = post?.created_at || "";
    const date = new Date(value.includes(" ") ? value.replace(" ", "T") + "Z" : value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  root.MeditorDArchiveUtils = { archiveDisplayTitle, archivePostDate };
})(globalThis);
