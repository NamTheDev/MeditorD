function generateMochaGraphic(type) {
  if (type === "cat_retro") {
    return `<svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="280" height="180" fill="#181825"/>
          <rect x="25" y="15" width="230" height="130" fill="#313244" stroke="#11111b" stroke-width="2"/>
          <rect x="40" y="25" width="200" height="105" fill="#1e1e2e"/>
          <text x="50" y="50" fill="#a6e3a1" font-family="'IBM Plex Mono', monospace" font-size="11">root@mocha:~# catppuccin --load</text>
          <text x="50" y="72" fill="#b4befe" font-family="'IBM Plex Mono', monospace" font-size="10">&gt; Accent set to Lavender (#b4befe)</text>
          <text x="50" y="90" fill="#f9e2af" font-family="'IBM Plex Mono', monospace" font-size="10">&gt; Palette: Mocha OK</text>
          <rect x="50" y="105" width="180" height="10" fill="#45475a"/>
          <rect x="52" y="107" width="120" height="6" fill="#b4befe"/>
          <rect x="110" y="148" width="60" height="18" fill="#45475a"/>
          <rect x="80" y="166" width="120" height="6" fill="#11111b"/>
        </svg>`;
  } else if (type === "cat_synth") {
    return `<svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="280" height="180" fill="#1e1e2e"/>
          <circle cx="140" cy="85" r="50" fill="#cba6f7"/>
          <rect x="0" y="105" width="280" height="75" fill="#11111b"/>
          <line x1="0" y1="115" x2="280" y2="115" stroke="#b4befe" stroke-width="1"/>
          <line x1="0" y1="130" x2="280" y2="130" stroke="#b4befe" stroke-width="1.5"/>
          <line x1="0" y1="152" x2="280" y2="152" stroke="#b4befe" stroke-width="2"/>
          <line x1="140" y1="105" x2="20" y2="180" stroke="#b4befe" stroke-width="1.5"/>
          <line x1="140" y1="105" x2="80" y2="180" stroke="#b4befe" stroke-width="1.5"/>
          <line x1="140" y1="105" x2="140" y2="180" stroke="#b4befe" stroke-width="1.5"/>
          <line x1="140" y1="105" x2="200" y2="180" stroke="#b4befe" stroke-width="1.5"/>
          <line x1="140" y1="105" x2="260" y2="180" stroke="#b4befe" stroke-width="1.5"/>
        </svg>`;
  } else if (type === "cat_floppy") {
    return `<svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="280" height="180" fill="#181825"/>
          <rect x="80" y="20" width="120" height="140" fill="#313244" stroke="#11111b" stroke-width="2"/>
          <rect x="95" y="20" width="90" height="50" fill="#45475a"/>
          <rect x="110" y="28" width="20" height="34" fill="#11111b"/>
          <rect x="92" y="85" width="96" height="65" fill="#f5e0dc"/>
          <line x1="100" y1="98" x2="178" y2="98" stroke="#b4befe" stroke-width="3"/>
          <text x="100" y="118" font-family="'IBM Plex Mono', monospace" font-size="9" fill="#11111b" font-weight="bold">MOCHA_SRC.TAR</text>
          <text x="100" y="134" font-family="'IBM Plex Mono', monospace" font-size="8" fill="#585b70">1.44 MB Diskette</text>
        </svg>`;
  } else {
    return `<svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="280" height="180" fill="#11111b"/>
          <text x="20" y="40" fill="#b4befe" font-family="'IBM Plex Mono', monospace" font-size="12">0x10: 1E 1E 2E C0</text>
          <text x="20" y="65" fill="#cba6f7" font-family="'IBM Plex Mono', monospace" font-size="12">0x20: B4 BE FE FF</text>
          <text x="20" y="90" fill="#a6e3a1" font-family="'IBM Plex Mono', monospace" font-size="12">0x30: CD D6 F4 00</text>
          <text x="20" y="115" fill="#74c7ec" font-family="'IBM Plex Mono', monospace" font-size="12">0x40: 58 5B 70 89</text>
          <text x="20" y="140" fill="#fab387" font-family="'IBM Plex Mono', monospace" font-size="12">0x50: F3 8B A8 11</text>
          <rect x="180" y="25" width="80" height="130" fill="#1e1e2e" stroke="#585b70" stroke-dasharray="4,4"/>
          <text x="195" y="95" fill="#b4befe" font-family="monospace" font-size="11">READY.</text>
        </svg>`;
  }
}

let postsData = [];
const CACHE_KEY = "meditord_archive_posts_v1";

const initialPostsEl = document.getElementById("initialPosts");
if (initialPostsEl) {
  try {
    postsData = JSON.parse(initialPostsEl.textContent || "[]");
  } catch {}
}
const markdown = window.markdownit({
  html: false,
  linkify: true,
  typographer: true,
});

function formatPostDate(value) {
  if (!value) return "";

  // SQLite returns CURRENT_TIMESTAMP as "YYYY-MM-DD HH:MM:SS".
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

function getYouTubeEmbedUrl(value) {
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

function getYouTubeThumbnailUrl(value) {
  const embedUrl = getYouTubeEmbedUrl(value);
  if (!embedUrl) return null;
  const videoId = embedUrl.split("/").pop();
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

function stripMarkdownForPlainText(value) {
  return (value || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~\-]+/g, " ")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCollapsedDescription(content) {
  const source = content || "_No description._";
  const plainText = stripMarkdownForPlainText(source);
  const words = plainText.split(/\s+/).filter(Boolean);

  if (words.length <= 200) {
    return markdown.render(source);
  }

  const excerpt = words.slice(0, 200).join(" ");
  return `<p>${escapeHtml(excerpt)} … <button type="button" class="read-more-toggle" data-action="toggle-description">more</button></p>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getDownloadActions(post) {
  const hasDescription = Boolean(post.content?.trim());
  const hasMedia = Boolean(post.hasMedia);
  const mediaAction = post.mediaType?.startsWith("video/")
    ? "download-video"
    : "download-image";
  const mediaLabel = post.mediaType?.startsWith("video/")
    ? "Download video"
    : "Download image";
  if (hasMedia && hasDescription) {
    return `
      <div class="card-menu-item">
        <button type="button" data-action="toggle-download-menu">Download ›</button>
        <div class="card-submenu hidden" role="menu" aria-label="Download options">
          <button type="button" data-action="${mediaAction}">${mediaLabel}</button>
          <button type="button" data-action="download-markdown">Download .md</button>
          <button type="button" data-action="download-both">Download both</button>
        </div>
      </div>
    `;
  }
  if (hasMedia) {
    return `<button type="button" data-action="${mediaAction}">${mediaLabel}</button>`;
  }
  if (hasDescription) {
    return `<button type="button" data-action="download-markdown">Download .md</button>`;
  }
  return "";
}

function renderPosts() {
  const container = document.getElementById("postsContainer");
  container.replaceChildren();

  postsData.forEach((post) => {
    const card = document.createElement("article");
    card.className = "gallery-card raised";
    card.dataset.title = post.title;

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "card-menu-button";
    menuButton.setAttribute("aria-label", `Open actions for ${post.title}`);
    menuButton.textContent = "⋯";
    menuButton.dataset.action = "toggle-menu";
    const menu = document.createElement("div");
    menu.className = "card-menu hidden";
    menu.setAttribute("role", "menu");
    menu.innerHTML = `<button type="button" data-action="edit">Edit</button>
      ${getDownloadActions(post)}
      <button type="button" data-action="delete">Delete</button>`;
    actions.append(menuButton, menu);
    card.append(actions);

    const youtubeThumbnailUrl = getYouTubeThumbnailUrl(post.url);
    if (youtubeThumbnailUrl) {
      const media = document.createElement("div");
      media.className = "gallery-media thin-sunken";
      const thumbnail = document.createElement("img");
      thumbnail.src = youtubeThumbnailUrl;
      thumbnail.alt = `YouTube thumbnail for ${post.title}`;
      thumbnail.loading = "lazy";
      media.append(thumbnail);
      media.classList.add("embed-thumbnail", "youtube-thumbnail");
      card.append(media);
    } else if (post.hasMedia) {
      const media = document.createElement("div");
      media.className = "gallery-media thin-sunken";
      const thumbnail = document.createElement("img");
      thumbnail.src = `/api/media/${encodeURIComponent(post.title)}`;
      thumbnail.alt = "";
      thumbnail.loading = "lazy";
      media.append(thumbnail);
      card.append(media);
    }

    const info = document.createElement("div");
    info.className = "card-info";
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = post.title;
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const username = document.createElement("span");
    username.textContent = post.username ? `@${post.username}` : "";
    const dateAdded = document.createElement("span");
    dateAdded.className = "card-date";
    dateAdded.textContent = formatPostDate(post.createdAt || post.created_at);
    meta.append(username, dateAdded);
    const excerpt = document.createElement("div");
    excerpt.className = "card-description";
    excerpt.dataset.title = post.title;
    excerpt.innerHTML = buildCollapsedDescription(post.content || "");
    info.append(title, excerpt, meta);
    card.append(info);
    container.append(card);
  });
}

function historyBack() {
  const modal = document.getElementById("postModal");
  if (modal.classList.contains("active")) {
    closeModal();
    return;
  }
  window.location.href = "/home.html";
}

function openPostModal(post) {
  document.getElementById("modalTitle").textContent = post.title;
  const body = document.getElementById("modalBody");
  stopModalMedia(body);
  body.replaceChildren();
  const description = document.createElement("div");
  description.className = "modal-post-description";
  description.innerHTML = markdown.render(
    post.content || "_This post has no description._",
  );
  body.append(description);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(post.url);
  if (youtubeEmbedUrl) {
    const embed = document.createElement("iframe");
    embed.className = "modal-embed";
    embed.src = youtubeEmbedUrl;
    embed.title = post.title;
    embed.loading = "lazy";
    embed.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    embed.referrerPolicy = "strict-origin-when-cross-origin";
    embed.allowFullscreen = true;
    body.prepend(embed);
  } else if (post.hasMedia) {
    const media = document.createElement("img");
    media.className = "modal-media";
    media.src = `/api/media/${encodeURIComponent(post.title)}`;
    media.alt = post.title;
    body.prepend(media);
  }
  const modal = document.getElementById("postModal");
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  const modal = document.getElementById("postModal");
  stopModalMedia(document.getElementById("modalBody"));
  document.getElementById("modalBody").replaceChildren();
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

function stopModalMedia(container) {
  container.querySelectorAll("audio, video").forEach((media) => {
    media.pause();
    media.currentTime = 0;
  });
  container.querySelectorAll("iframe").forEach((frame) => {
    frame.src = "about:blank";
  });
}

function closeModalOnBg(event) {
  if (event.target.id === "postModal") closeModal();
}

async function loadPosts() {
  try {
    const response = await fetch("/api/documents?full=true");
    if (!response.ok) throw new Error("Failed to load posts");
    const freshPosts = await response.json();
    const freshKey = JSON.stringify(freshPosts);
    const currentKey = JSON.stringify(postsData);

    if (freshKey !== currentKey) {
      postsData = freshPosts;
      try {
        sessionStorage.setItem(CACHE_KEY, freshKey);
      } catch {}
      renderPosts();
    }
  } catch (error) {
    if (!postsData.length) {
      const container = document.getElementById("postsContainer");
      container.textContent = error.message;
    }
  }
}

document.getElementById("backButton").addEventListener("click", historyBack);
document.getElementById("newPostButton").addEventListener("click", () => {
  window.location.href = "/edit.html";
});
document
  .querySelector(".modal-close-button")
  .addEventListener("click", closeModal);
document.getElementById("postModal").addEventListener("click", closeModalOnBg);

function closeAllMenus() {
  document.querySelectorAll(".card-menu").forEach((menu) => {
    menu.classList.add("hidden");
  });
}

function toggleDescription(card, description) {
  const post = postsData.find((p) => p.title === card.dataset.title);
  if (!post) return;

  const plainText = stripMarkdownForPlainText(post.content || "");
  const words = plainText.split(/\s+/).filter(Boolean);
  if (words.length <= 200) return;

  if (description.dataset.expanded === "true") {
    description.dataset.expanded = "false";
    description.innerHTML = buildCollapsedDescription(post.content || "");
    return;
  }

  description.dataset.expanded = "true";
  description.innerHTML = markdown.render(post.content || "_No description._");
  const less = document.createElement("button");
  less.type = "button";
  less.className = "read-more-toggle";
  less.dataset.action = "toggle-description";
  less.textContent = "less";
  description.append(less);
}

function exportMarkdown(post) {
  const title = post.title || "untitled";
  const username = post.username ? `@${post.username}` : "";
  const createdAt = formatPostDate(post.createdAt || post.created_at);
  const summary = [
    `# ${title}`,
    "",
    `Username: ${username}`,
    `Date: ${createdAt}`,
    `URL: ${post.url || ""}`,
    "",
    (post.content || "").trim(),
  ].join("\n");

  return new Blob([summary], { type: "text/markdown;charset=utf-8" });
}

function sanitizedFilename(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim() || "untitled";
}

function triggerBlobDownload(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadMedia(post) {
  const response = await fetch(
    `/api/media/${encodeURIComponent(post.title)}?download=true`,
  );
  if (!response.ok) throw new Error("Media could not be downloaded.");
  const blob = await response.blob();
  if (!post.mediaName) throw new Error("The original media filename is unavailable.");
  triggerBlobDownload(blob, post.mediaName);
}

function downloadMarkdown(post) {
  const blob = exportMarkdown(post);
  const filename = `${sanitizedFilename(post.title)}.md`;
  triggerBlobDownload(blob, filename);
}

async function downloadPost(post, action) {
  try {
    if (
      action === "download-image" ||
      action === "download-video" ||
      action === "download-media"
    ) {
      await downloadMedia(post);
    } else if (action === "download-markdown") {
      downloadMarkdown(post);
    } else if (action === "download-both") {
      await downloadMedia(post);
      await new Promise((resolve) => window.setTimeout(resolve, 200));
      downloadMarkdown(post);
    }
  } catch (error) {
    await window.showAppAlert(error.message || "Download failed.");
  }
}

const postsContainer = document.getElementById("postsContainer");
function toggleCardMenu(card) {
  const menu = card.querySelector(".card-menu");
  if (!menu) return;
  const shouldOpen = menu.classList.contains("hidden");
  closeAllMenus();
  menu.querySelector(".card-submenu")?.classList.add("hidden");
  menu.querySelector(".card-submenu")?.classList.remove("open-left");
  if (shouldOpen) menu.classList.remove("hidden");
}

function toggleDownloadMenu(button) {
  const wrapper = button.closest(".card-menu-item");
  const submenu = wrapper?.querySelector(".card-submenu");
  if (!submenu) return;

  const opening = submenu.classList.contains("hidden");
  document
    .querySelectorAll(".card-submenu")
    .forEach((item) => item.classList.add("hidden"));
  if (!opening) return;

  submenu.classList.remove("hidden");
  submenu.classList.remove("open-left");
  const rect = submenu.getBoundingClientRect();
  if (rect.right > window.innerWidth - 8) {
    submenu.classList.add("open-left");
  }
}

async function deletePost(post) {
  const confirmed = await window.showAppConfirm(`Delete "${post.title}"?`, {
    confirmLabel: "Delete",
    title: "Delete post",
  });
  if (!confirmed) return;
  try {
    await window.database.deleteDocument(post.title);
    postsData = postsData.filter((entry) => entry.title !== post.title);
    renderPosts();
  } catch (error) {
    await window.showAppAlert(error.message || "Delete failed.");
  }
}

postsContainer.addEventListener("click", async (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    event.preventDefault();
    event.stopPropagation();
    const card = actionButton.closest(".gallery-card");
    if (!card) return;
    const post = postsData.find((item) => item.title === card.dataset.title);
    if (!post) return;
    const action = actionButton.dataset.action;

    if (action === "toggle-menu") {
      toggleCardMenu(card);
      return;
    }

    if (action === "toggle-download-menu") {
      toggleDownloadMenu(actionButton);
      return;
    }

    if (action === "toggle-description") {
      const description = event.target.closest(".card-description");
      if (description) toggleDescription(card, description);
      return;
    }

    if (action === "edit") {
      closeAllMenus();
      window.location.href = `/database.html?edit=${encodeURIComponent(post.title)}`;
      return;
    }

    if (
      action === "download-image" ||
      action === "download-video" ||
      action === "download-media" ||
      action === "download-markdown" ||
      action === "download-both"
    ) {
      closeAllMenus();
      await downloadPost(post, action);
      return;
    }

    if (action === "delete") {
      closeAllMenus();
      await deletePost(post);
      return;
    }
    return;
  }

  if (event.target.closest(".card-actions")) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  closeAllMenus();
  const card = event.target.closest(".gallery-card");
  if (!card) return;
  const title = card.dataset.title;
  const post = postsData.find((p) => p.title === title);
  if (post) openPostModal(post);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeAllMenus();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".card-actions")) closeAllMenus();
});

if (!postsContainer.children.length && postsData.length > 0) {
  renderPosts();
}
