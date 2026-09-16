const blockedHosts = new Set(["x.com", "twitter.com"]);

export function isSupportedPostUrl(value: string): boolean {
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
}
