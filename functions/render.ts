import { ROOT } from "../config";
import { join } from "path";
import MarkdownIt from "markdown-it";
import { getAllDocuments, type DocumentRecord } from "./database/documents";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

interface CachedPage {
  html: string;
  etag: string;
}

const pageCache = new Map<string, CachedPage>();

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

  const renderedMarkdown = md.render(post.content || "_No description._");
  const formattedDate = formatPostDate(post.created_at);
  const username = post.username ? `@${escapeHtml(post.username)}` : "";

  return `<article class="gallery-card raised" data-title="${escapeHtml(post.title)}">
    ${mediaHtml}
    <div class="card-info">
      <div class="card-title">${escapeHtml(post.title)}</div>
      <div class="card-description">${renderedMarkdown}</div>
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
  let cached = isArchive ? undefined : pageCache.get(cacheKey);

  if (!cached) {
    const [layout, rawContent] = await Promise.all([
      Bun.file(join(process.cwd(), ROOT, "global.html")).text(),
      Bun.file(join(process.cwd(), ROOT, `${file}.html`)).text(),
    ]);

    let content = rawContent;
    if (isArchive) {
      const posts = getAllDocuments();
      const cardsHtml = posts.map(renderCard).join("\n");
      const postsJson = JSON.stringify(posts);
      content = content
        .replace("{{archive_posts}}", () => cardsHtml)
        .replace("{{archive_posts_json}}", () => postsJson);
    }

    const html = layout
      .replaceAll("{{title}}", () => title)
      .replace("{{body}}", () => content);

    const etag = `W/"${Bun.hash(html).toString(16)}"`;
    cached = { html, etag };
    if (!isArchive) {
      pageCache.set(cacheKey, cached);
    }
  }

  if (req?.headers.get("if-none-match") === cached.etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: cached.etag,
        "Cache-Control": "no-cache",
      },
    });
  }

  return new Response(cached.html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      ETag: cached.etag,
    },
  });
}

export { renderPage };
