(function () {
  const blockedHosts = new Set(["x.com", "twitter.com"]);

  window.isSupportedPostUrl = function (value) {
    try {
      const parsedUrl = new URL(value);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return false;
      }

      const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
      return !blockedHosts.has(hostname);
    } catch {
      return false;
    }
  };
})();
