let postsData = [];
const initialPostsEl = document.getElementById("initialPosts");
if (initialPostsEl) {
  try {
    postsData = JSON.parse(initialPostsEl.textContent || "[]");
  } catch {}
}
const MARKDOWN_IT_URL = "/vendor/markdown-it.js?v=15.0.2";
let markdownPromise;

function getMarkdown() {
  if (markdownPromise) return markdownPromise;

  markdownPromise = new Promise((resolve, reject) => {
    const createInstance = () =>
      window.markdownit({
        html: false,
        linkify: true,
        typographer: true,
      });

    if (typeof window.markdownit === "function") {
      resolve(createInstance());
      return;
    }

    const script = document.createElement("script");
    script.src = MARKDOWN_IT_URL;
    script.async = true;
    script.onload = () => resolve(createInstance());
    script.onerror = () =>
      reject(new Error("Markdown renderer could not be loaded."));
    document.head.append(script);
  });

  return markdownPromise;
}

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

function getMediaUrl(post, { download = false } = {}) {
  const base = `/api/media/${encodeURIComponent(post.title)}`;
  const params = new URLSearchParams();
  if (post.mediaHash) params.set("v", post.mediaHash);
  if (download) params.set("download", "true");
  const query = params.toString();
  return query ? `${base}?${query}` : base;
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
  description.textContent = post.content || "This post has no description.";
  body.append(description);

  void getMarkdown()
    .then((markdown) => {
      if (!description.isConnected) return;
      description.innerHTML = markdown.render(
        post.content || "_This post has no description._",
      );
    })
    .catch(() => {});
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
    const media = document.createElement(
      post.mediaType?.startsWith("video/") ? "video" : "img",
    );
    media.className = "modal-media";
    media.src = getMediaUrl(post);
    media.setAttribute("aria-label", post.title);
    if (media instanceof HTMLVideoElement) {
      media.controls = true;
      media.playsInline = true;
      media.preload = "auto";
    } else {
      media.alt = post.title;
      media.decoding = "async";
      media.loading = "eager";
      media.fetchPriority = "high";
    }
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

  if (archiveRefreshPending) {
    archiveRefreshPending = false;
    window.location.reload();
  }
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

function appendLessButton(description) {
  const less = document.createElement("button");
  less.type = "button";
  less.className = "read-more-toggle";
  less.dataset.action = "toggle-description";
  less.textContent = "less";
  description.append(less);
}

function toggleDescription(card, description) {
  const post = postsData.find((p) => p.title === card.dataset.title);
  if (!post) return;

  if (description.dataset.expanded === "true") {
    description.dataset.expanded = "false";
    if (description.dataset.collapsedHtml) {
      description.innerHTML = description.dataset.collapsedHtml;
    }
    return;
  }

  description.dataset.collapsedHtml ||= description.innerHTML;
  description.dataset.expanded = "true";
  description.textContent = post.content || "No description.";
  appendLessButton(description);

  void getMarkdown()
    .then((markdown) => {
      if (
        !description.isConnected ||
        description.dataset.expanded !== "true"
      ) {
        return;
      }

      description.innerHTML = markdown.render(
        post.content || "_No description._",
      );
      appendLessButton(description);
    })
    .catch(() => {});
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
  const response = await fetch(getMediaUrl(post, { download: true }));
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

async function deletePost(post, card) {
  const confirmed = await window.showAppConfirm(`Delete "${post.title}"?`, {
    confirmLabel: "Delete",
    title: "Delete post",
  });
  if (!confirmed) return;

  try {
    const response = await fetch(
      `/api/documents/${encodeURIComponent(post.title)}`,
      { method: "DELETE" },
    );
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.error || `Delete failed (${response.status}).`);
    }

    postsData = postsData.filter((entry) => entry.title !== post.title);
    card.remove();
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
      await deletePost(post, card);
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
let archiveRefreshPending = false;

function refreshArchiveFromCacheUpdate() {
  const modal = document.getElementById("postModal");
  if (
    document.visibilityState !== "visible" ||
    modal?.classList.contains("active")
  ) {
    archiveRefreshPending = true;
    return;
  }

  window.location.reload();
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (
      event.data?.type === "meditord-page-cache-updated" &&
      event.data.path === window.location.pathname
    ) {
      refreshArchiveFromCacheUpdate();
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (archiveRefreshPending && document.visibilityState === "visible") {
      archiveRefreshPending = false;
      refreshArchiveFromCacheUpdate();
    }
  });
}
