// Small, dependency-free helpers for permanent post links.
// The stored title is mutable (folder moves); shareId is not.
(() => {
  const SHARE_PARAM = "post";
  const VALID_ID = /^[a-f0-9]{32}$/i;

  function getShareId() {
    return new URL(window.location.href).searchParams.get(SHARE_PARAM);
  }

  function linkFor(shareId) {
    if (!VALID_ID.test(shareId || "")) {
      throw new Error("This post does not have a valid share ID.");
    }
    const url = new URL("/archive.html", window.location.origin);
    url.searchParams.set(SHARE_PARAM, shareId);
    return url.href;
  }

  function clearShareId() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(SHARE_PARAM)) return;
    url.searchParams.delete(SHARE_PARAM);
    window.history.replaceState(window.history.state, "", url);
  }

  async function copyLink(shareId) {
    const url = linkFor(shareId);
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        return { copied: true, url };
      } catch {
        // HTTP and permission-restricted contexts need a legacy fallback.
      }
    }

    const field = document.createElement("textarea");
    field.value = url;
    field.readOnly = true;
    field.setAttribute("aria-label", "Post link");
    field.style.cssText =
      "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0";
    document.body.append(field);
    field.focus();
    field.select();
    let copied = false;
    try {
      copied = Boolean(document.execCommand?.("copy"));
    } catch {
      // Caller can expose the link in the existing menu for manual copying.
    }
    field.remove();
    return { copied, url };
  }

  window.meditordPostSharing = {
    getShareId,
    linkFor,
    clearShareId,
    copyLink,
    validId: (id) => VALID_ID.test(id || ""),
  };
})();
