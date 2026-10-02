import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import MarkdownIt from "markdown-it";
import { ROOT } from "../config";
import {
  getAllDocuments,
  getArchiveValidator,
  POST_SCHEMA_VERSION,
  type DocumentRecord,
} from "./database/documents";

function resolveBuildId(): string {
  const configured = process.env.BUILD_ID?.trim();
  if (configured) {
    const normalized = configured.replace(/[^A-Za-z0-9._-]/g, "");
    if (normalized) return normalized.slice(0, 64);
  }

  try {
    const gitDirectory = join(process.cwd(), ".git");
    const head = readFileSync(join(gitDirectory, "HEAD"), "utf8").trim();
    if (/^[0-9a-f]{40}$/i.test(head)) {
      return head.slice(0, 12);
    }

    const refMatch = /^ref:\s+(.+)$/.exec(head);
    const refPath = refMatch?.[1];
    if (refPath) {
      const revision = readFileSync(
        join(gitDirectory, refPath),
        "utf8",
      ).trim();
      if (/^[0-9a-f]{40}$/i.test(revision)) {
        return revision.slice(0, 12);
      }
    }
  } catch {}

  return `runtime-${Date.now().toString(36)}`;
}

export const BUILD_ID = resolveBuildId();

const assetFingerprintCache = new Map<string, string>();

export async function getAssetFingerprint(
  assetPath: string,
): Promise<string | null> {
  const normalizedPath = (assetPath.split("?", 1)[0] ?? "").replace(
    /^\/+/, 
    "",
  );
  if (!/\.(?:js|css)$/i.test(normalizedPath)) return null;

  const cached = assetFingerprintCache.get(normalizedPath);
  if (cached) return cached;

  const asset = Bun.file(join(process.cwd(), ROOT, normalizedPath));
  if (!(await asset.exists())) return null;

  const bytes = new Uint8Array(await asset.arrayBuffer());
  const fingerprint = createHash("sha256")
    .update(bytes)
    .digest("hex")
    .slice(0, 10);
  assetFingerprintCache.set(normalizedPath, fingerprint);
  return fingerprint;
}

function escapeRegex(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

async function fingerprintLocalAssets(html: string): Promise<string> {
  const assetPaths = new Set<string>();
  for (const match of html.matchAll(
    /(?:src|href)="(\/[^"]+\.(?:js|css))(?:\?[^"]*)?"/gi,
  )) {
    const assetPath = match[1];
    if (assetPath) assetPaths.add(assetPath);
  }

  for (const assetPath of assetPaths) {
    const fingerprint = await getAssetFingerprint(assetPath);
    if (!fingerprint) continue;
    const escapedPath = escapeRegex(assetPath);
    html = html.replace(
      new RegExp(`(["'])${escapedPath}(?:\\?[^"']*)?\\1`, "g"),
      `$1${assetPath}?v=${fingerprint}$1`,
    );
  }

  return html;
}

function ifNoneMatchMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  const target = etag.replace(/^W\//, "");
  return header
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === "*" || value.replace(/^W\//, "") === target);
}

function getArchivePageEtag(archiveValidator: string): string {
  const validator = archiveValidator
    .replace(/^W\/"|"$/g, "")
    .replace(/[^A-Za-z0-9._-]/g, "");
  return `W/"b${BUILD_ID}-${validator}"`;
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

interface CachedPage {
  html: string;
  etag: string;
}

interface CachedArchivePage extends CachedPage {
  archiveValidator: string;
}

const pageCache = new Map<string, CachedPage>();
let archivePageCache: CachedArchivePage | undefined;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPostDate(value: string): string {
  if (!value) return "";
  const normalizedValue = value.includes(" ")
    ? value.replace(" ", "T") + "Z"
    : value;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function stripMarkdownForPlainText(value: string): string {
  return (value || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCollapsedDescriptionHtml(value: string): string {
  const content = (value || "").trim();
  const plainText = stripMarkdownForPlainText(content);
  const words = plainText.split(/\s+/).filter(Boolean);
  if (words.length <= 200) {
    return md.render(content || "_No description._");
  }

  const excerpt = words.slice(0, 200).join(" ");
  return `<p>${escapeHtml(excerpt)} … <button type="button" class="read-more-toggle" data-action="toggle-description">more</button></p>`;
}

function renderDownloadActions(post: DocumentRecord): string {
  const hasDescription = Boolean(post.content?.trim());
  const hasMedia = Boolean(post.hasMedia);
  const mediaLabel = post.mediaType?.startsWith("video/")
    ? "Download video"
    : "Download image";
  const mediaAction = post.mediaType?.startsWith("video/")
    ? "download-video"
    : "download-image";
  if (hasMedia && hasDescription) {
    return `<div class="card-menu-item">
        <button type="button" data-action="toggle-download-menu">Download ›</button>
        <div class="card-submenu hidden" role="menu" aria-label="Download options">
          <button type="button" data-action="${mediaAction}">${mediaLabel}</button>
          <button type="button" data-action="download-markdown">Download .md</button>
          <button type="button" data-action="download-both">Download both</button>
        </div>
      </div>`;
  }
  if (hasMedia) {
    return `<button type="button" data-action="${mediaAction}">${mediaLabel}</button>`;
  }
  if (hasDescription) {
    return `<button type="button" data-action="download-markdown">Download .md</button>`;
  }
  return "";
}

function getYouTubeEmbedUrl(value: string): string | null {
  if (!value) return null;
  try {
    const parsedUrl = new URL(value);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = "";
    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      videoId = parsedUrl.searchParams.get("v") || "";
    } else if (hostname === "youtu.be") {
      videoId = parsedUrl.pathname.slice(1);
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function getYouTubeThumbnailUrl(value: string): string | null {
  const embedUrl = getYouTubeEmbedUrl(value);
  if (!embedUrl) return null;
  const videoId = embedUrl.split("/").pop();
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

function renderCard(post: DocumentRecord): string {
  const youtubeThumbnailUrl = getYouTubeThumbnailUrl(post.url);
  let mediaHtml = "";
  if (youtubeThumbnailUrl) {
    mediaHtml = `<div class="gallery-media thin-sunken embed-thumbnail youtube-thumbnail">
      <img src="${youtubeThumbnailUrl}" alt="YouTube thumbnail for ${escapeHtml(post.title)}" loading="lazy" />
    </div>`;
  } else if (post.hasMedia) {
    mediaHtml = `<div class="gallery-media thin-sunken">
      <img src="/api/media/${encodeURIComponent(post.title)}" alt="" loading="lazy" />
    </div>`;
  }

  const formattedDate = formatPostDate(post.created_at);
  const username = post.username ? `@${escapeHtml(post.username)}` : "";
  const downloadActions = renderDownloadActions(post);

  return `<article class="gallery-card raised" data-title="${escapeHtml(post.title)}">
    <div class="card-actions">
      <button type="button" class="card-menu-button" aria-label="Open actions for ${escapeHtml(post.title)}" data-action="toggle-menu">⋯</button>
      <div class="card-menu hidden" role="menu" aria-label="Post actions">
        <button type="button" data-action="edit">Edit</button>
        ${downloadActions}
        <button type="button" data-action="delete">Delete</button>
      </div>
    </div>
    ${mediaHtml}
    <div class="card-info">
      <div class="card-title">${escapeHtml(post.title)}</div>
      <div class="card-description" data-title="${escapeHtml(post.title)}">${getCollapsedDescriptionHtml(post.content || "")}</div>
      <div class="card-meta">
        <span>${username}</span>
        <span class="card-date">${formattedDate}</span>
      </div>
    </div>
  </article>`;
}

async function renderPage(
  file: string,
  title: string,
  status = 200,
  req?: Request,
): Promise<Response> {
  const isArchive = file === "archive";
  const cacheKey = `${file}:${title}`;
  const archiveValidator = isArchive ? getArchiveValidator() : null;
  const etag =
    isArchive && archiveValidator
      ? getArchivePageEtag(archiveValidator)
      : `"${BUILD_ID}"`;

  if (
    status === 200 &&
    ifNoneMatchMatches(req?.headers.get("if-none-match") ?? null, etag)
  ) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "no-cache",
        "X-MeditorD-Build": BUILD_ID,
      },
    });
  }

  let cached: CachedPage | undefined;
  if (isArchive && archiveValidator) {
    if (archivePageCache?.archiveValidator === archiveValidator) {
      cached = archivePageCache;
    }
  } else {
    cached = pageCache.get(cacheKey);
  }

  if (!cached || cached.etag !== etag) {
    const [layout, rawContent] = await Promise.all([
      Bun.file(join(process.cwd(), ROOT, "global.html")).text(),
      Bun.file(join(process.cwd(), ROOT, `${file}.html`)).text(),
    ]);

    let content = rawContent;
    if (isArchive && archiveValidator) {
      const posts = getAllDocuments();
      const cardsHtml = posts.map(renderCard).join("\n");
      const postsJson = JSON.stringify(posts);
      content = content
        .replace("{{archive_posts}}", () => cardsHtml)
        .replace("{{archive_posts_json}}", () => postsJson)
        .replace("{{archive_etag}}", () => escapeHtml(archiveValidator))
        .replace(
          "{{post_schema_version}}",
          () => String(POST_SCHEMA_VERSION),
        );
    }

    let html = layout
      .replaceAll("{{title}}", () => title)
      .replaceAll("{{build_id}}", () => escapeHtml(BUILD_ID))
      .replace("{{body}}", () => content);
    html = await fingerprintLocalAssets(html);

    cached = { html, etag };
    if (isArchive && archiveValidator) {
      archivePageCache = {
        ...cached,
        archiveValidator,
      };
    } else {
      pageCache.set(cacheKey, cached);
    }
  }

  return new Response(cached.html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      ETag: cached.etag,
      "X-MeditorD-Build": BUILD_ID,
    },
  });
}

export { renderPage };
