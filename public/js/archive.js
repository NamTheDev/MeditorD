let postsData = [];
const initialPostsEl = document.getElementById("initialPosts");
if (initialPostsEl) {
  try {
    postsData = JSON.parse(initialPostsEl.textContent || "[]");
  } catch {}
}

const archiveTree = document.getElementById("archiveFolderTree");
const archiveCrumbs = document.getElementById("archiveBreadcrumbs");
const archiveSidebar = document.querySelector(".archive-explorer-sidebar");
const folderMenu = document.getElementById("archiveFolderContextMenu");
let activeArchiveFolder = "";
const openArchiveFolders = new Set();
function archiveParent(path) {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0,index);
}
function archiveFolders(rows) {
  const paths = new Set(rows.filter(row => row.isDirectory).map(row => row.title));
  for (const item of [...rows, ...postsData]) {
    let folder = archiveParent(item.title);
    while (folder) { paths.add(folder); folder = archiveParent(folder); }
  }
  return [...paths].sort((a,b)=>a.localeCompare(b));
}
function refreshArchiveFolderView() {
  const cards = [...postsContainer.querySelectorAll(".gallery-card")];
  for (const card of cards) {
    const path = card.dataset.title || "";
    card.hidden = Boolean(activeArchiveFolder && !path.startsWith(activeArchiveFolder + "/"));
    if (card.hidden) card.style.display = "none";
    else card.style.removeProperty("display");
  }
  archiveCrumbs.replaceChildren();
  const crumbs = [{label:"All posts", path:""}];
  let path = "";
  for(const part of activeArchiveFolder.split("/").filter(Boolean)) {
    path = path ? path + "/" + part : part;
    crumbs.push({label:part,path});
  }
  crumbs.forEach((entry,index)=>{
    if(index) { const separator=document.createElement("span"); separator.textContent=" / "; archiveCrumbs.append(separator); }
    const btn=document.createElement("button");
    btn.type="button";btn.textContent=entry.label;
    btn.addEventListener("click",()=>chooseArchiveFolder(entry.path));
    archiveCrumbs.append(btn);
  });
  queueMasonryLayout();
}
function chooseArchiveFolder(folder) {
  activeArchiveFolder = folder;
  let path = folder;
  while(path) { openArchiveFolders.add(path); path=archiveParent(path); }
  renderArchiveFolders();
  refreshArchiveFolderView();
}
let archiveFolderRows = [];
function renderArchiveFolders() {
  if (!archiveTree) return;
  archiveTree.replaceChildren();
  const folders=archiveFolders(archiveFolderRows);
  const appendRow=(label,path,depth,children)=>{
    const row=document.createElement("div");row.className="archive-folder-row";
    row.dataset.folder = path;
    row.style.paddingLeft=(depth*13+5)+"px";
    if(children) {
      const toggle=document.createElement("button");toggle.type="button";
      toggle.className="archive-folder-toggle";
      toggle.textContent=openArchiveFolders.has(path)?"▾":"▸";
      toggle.setAttribute("aria-label",(openArchiveFolders.has(path)?"Collapse ":"Expand ")+label);
      toggle.addEventListener("click",()=>{if(openArchiveFolders.has(path))openArchiveFolders.delete(path);else openArchiveFolders.add(path);renderArchiveFolders();});
      row.append(toggle);
    } else {
      const spacer=document.createElement("span");spacer.className="archive-folder-spacer";row.append(spacer);
    }
    const button=document.createElement("button");button.type="button";
    button.className="archive-folder-button"+(activeArchiveFolder===path?" active":"");
    button.textContent=(path?"▰ ":"⌂ ")+label;
    button.title=path||"All posts";
    button.addEventListener("click",()=>chooseArchiveFolder(path));
    row.append(button);
    row.addEventListener("dragover", event => {
      if (!event.dataTransfer?.types.includes("application/x-meditord-post")) return;
      event.preventDefault();
      event.dataTransfer.dropEffect="move";
      row.classList.add("drop-target");
    });
    row.addEventListener("dragleave", event => {
      if (!row.contains(event.relatedTarget)) row.classList.remove("drop-target");
    });
    row.addEventListener("drop", async event => {
      event.preventDefault();row.classList.remove("drop-target");
      const title=event.dataTransfer?.getData("application/x-meditord-post");
      if(title) await moveArchivePost(title,path);
    });
    archiveTree.append(row);
  };
  appendRow("All posts","",0,false);
  function appendChildren(parent,depth) {
    for (const folder of folders.filter(path=>archiveParent(path)===parent)) {
      const hasChildren=folders.some(path=>archiveParent(path)===folder);
      appendRow(folder.split("/").pop(),folder,depth,hasChildren);
      if (hasChildren && openArchiveFolders.has(folder)) appendChildren(folder,depth+1);
    }
  }
  appendChildren("",1);
}
async function loadArchiveFolders() {
  try {
    archiveFolderRows = await archiveDocumentRequest("?database=true", { cache: "no-store" });
  } catch(error) {
    archiveFolderRows=[];
    console.warn(error);
  }
  renderArchiveFolders();
  refreshArchiveFolderView();
}
void loadArchiveFolders();

async function archiveDocumentRequest(path, options = {}) {
  const response = await fetch("/api/documents" + path, options);
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || "Folder operation failed.");
  return body;
}
function validateFolderSegment(name) {
  return name && name !== "." && name !== ".." && !name.includes("/") &&
    !name.includes(String.fromCharCode(92)) && !/[\u0000-\u001f]/.test(name);
}
async function createArchiveFolder(parent = "") {
  const name = await window.showAppPrompt(
    parent ? "Create a subfolder in " + parent + ":" : "New folder name:",
    { title: "New folder", inputLabel: "Folder name", confirmLabel: "Create" }
  );
  if (name == null) return;
  const leaf = name.trim();
  if (!validateFolderSegment(leaf)) {
    await window.showAppAlert("Use a name without slashes or control characters.", { title: "Invalid folder name" });
    return;
  }
  const title = parent ? parent + "/" + leaf : leaf;
  if (archiveFolderRows.some(item => item.title === title) ||
      postsData.some(item => item.title === title)) {
    await window.showAppAlert("A post or folder already exists with this name.", { title: "Folder exists" });
    return;
  }
  try {
    await archiveDocumentRequest("", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, isFolder: true })
    });
    await loadArchiveFolders();
    chooseArchiveFolder(title);
  } catch (error) {
    await window.showAppAlert(error.message || "Could not create folder.", { title: "Create folder failed" });
  }
}
async function deleteArchiveFolder(path) {
  if (!path) return;
  const prefix = path + "/";
  const posts = postsData.filter(post => post.title.startsWith(prefix)).length;
  const subfolders = archiveFolders(archiveFolderRows).filter(folder => folder.startsWith(prefix)).length;
  const warning = 'Delete folder "' + path + '"?\n\nThis will permanently delete ' +
    posts + " post(s) and " + subfolders + " subfolder(s), including their contents. This cannot be undone.";
  if (!await window.showAppConfirm(warning, {
    title: "Delete folder and contents", confirmLabel: "Delete folder"
  })) return;
  try {
    await archiveDocumentRequest("/" + encodeURIComponent(path), { method: "DELETE" });
    window.location.reload();
  } catch (error) {
    await window.showAppAlert(error.message || "Could not delete folder.", { title: "Delete folder failed" });
  }
}
let folderMenuPath = null;
function closeFolderContextMenu() {
  folderMenu.hidden = true;
  archiveTree.querySelectorAll(".context-target").forEach(row => row.classList.remove("context-target"));
  folderMenuPath = null;
}
function openFolderContextMenu(event, row) {
  event.preventDefault();
  closeAllMenus();
  closeFolderContextMenu();
  folderMenuPath = row?.dataset.folder || null;
  row?.classList.add("context-target");
  const canUseFolder = Boolean(folderMenuPath || activeArchiveFolder);
  folderMenu.querySelector('[data-folder-action="new-subfolder"]').disabled = !canUseFolder;
  folderMenu.querySelector('[data-folder-action="delete-folder"]').disabled = !folderMenuPath;
  folderMenu.classList.remove("hidden");
  folderMenu.hidden = false;
  const width = folderMenu.offsetWidth, height = folderMenu.offsetHeight;
  folderMenu.style.left = Math.max(5, Math.min(event.clientX, window.innerWidth - width - 5)) + "px";
  folderMenu.style.top = Math.max(5, Math.min(event.clientY, window.innerHeight - height - 5)) + "px";
  folderMenu.querySelector("button:not(:disabled)")?.focus();
}
archiveSidebar.addEventListener("contextmenu", event => {
  const row = event.target.closest(".archive-folder-row");
  openFolderContextMenu(event, row);
});
archiveSidebar.addEventListener("keydown", event => {
  if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
  const row = event.target.closest(".archive-folder-row");
  const rect = (row || archiveSidebar).getBoundingClientRect();
  openFolderContextMenu({preventDefault: () => event.preventDefault(), clientX: rect.left + 12, clientY: rect.top + 12}, row);
});
folderMenu.addEventListener("click", event => {
  const button = event.target.closest("[data-folder-action]");
  if (!button || button.disabled) return;
  const path = folderMenuPath;
  const action = button.dataset.folderAction;
  closeFolderContextMenu();
  if (action === "new-folder") void createArchiveFolder(path ? archiveParent(path) : "");
  if (action === "new-subfolder") void createArchiveFolder(path || activeArchiveFolder);
  if (action === "delete-folder") void deleteArchiveFolder(path);
});
document.getElementById("archiveNewFolderButton").addEventListener("click", () => {
  closeFolderContextMenu();
  void createArchiveFolder(activeArchiveFolder);
});
document.addEventListener("pointerdown", event => {
  if (!folderMenu.hidden && !folderMenu.contains(event.target)) closeFolderContextMenu();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeFolderContextMenu();
});
archiveSidebar.addEventListener("scroll", closeFolderContextMenu, {passive: true});
window.addEventListener("resize", closeFolderContextMenu);


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
  document.querySelectorAll(".gallery-card .card-menu").forEach((menu) => {
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

let masonryFrame = 0;

function layoutMasonry() {
  masonryFrame = 0;
  if (!postsContainer || getComputedStyle(postsContainer).display !== "grid") {
    return;
  }

  const styles = getComputedStyle(postsContainer);
  const rowHeight = Number.parseFloat(styles.gridAutoRows) || 8;
  const rowGap = Number.parseFloat(styles.rowGap) || 0;

  postsContainer.querySelectorAll(".gallery-card").forEach((card) => {
    const height = card.getBoundingClientRect().height;
    const span = Math.max(
      1,
      Math.ceil((height + rowGap) / (rowHeight + rowGap)),
    );
    card.style.gridRowEnd = `span ${span}`;
  });
}

function queueMasonryLayout() {
  if (masonryFrame) return;
  masonryFrame = requestAnimationFrame(layoutMasonry);
}

function initializeMasonry() {
  const cards = postsContainer?.querySelectorAll(".gallery-card") ?? [];
  queueMasonryLayout();

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(queueMasonryLayout);
    cards.forEach((card) => observer.observe(card));
  } else {
    postsContainer?.querySelectorAll("img, video").forEach((media) => {
      media.addEventListener("load", queueMasonryLayout, { passive: true });
      media.addEventListener("loadedmetadata", queueMasonryLayout, {
        passive: true,
      });
    });
  }

  window.addEventListener("resize", queueMasonryLayout, { passive: true });
}

const thumbnailBackfills = new WeakSet();

function scheduleThumbnailBackfill(image) {
  if (
    !image ||
    thumbnailBackfills.has(image) ||
    image.dataset.thumbnailBackfill !== "true"
  ) {
    return;
  }

  thumbnailBackfills.add(image);
  const run = async () => {
    if (
      !image.isConnected ||
      !image.complete ||
      image.naturalWidth <= 0 ||
      !window.mediaThumbnail
    ) {
      return;
    }

    const card = image.closest(".gallery-card");
    const title = card?.dataset.title;
    const sourceHash = image.dataset.mediaHash;
    if (!title || !sourceHash) return;

    try {
      const thumbnail = await window.mediaThumbnail.fromImage(image);
      if (!thumbnail) return;

      const form = new FormData();
      form.set("thumbnail", thumbnail);
      const response = await fetch(
        `/api/media-thumbnail/${encodeURIComponent(title)}?source=${encodeURIComponent(sourceHash)}`,
        {
          method: "PUT",
          body: form,
        },
      );
      if (response.ok) {
        image.dataset.thumbnailBackfill = "false";
      }
    } catch {}
  };

  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => void run(), { timeout: 2500 });
  } else {
    window.setTimeout(() => void run(), 250);
  }
}

function initializeThumbnailBackfill() {
  postsContainer
    ?.querySelectorAll('img[data-thumbnail-backfill="true"]')
    .forEach((image) => {
      if (image.complete && image.naturalWidth > 0) {
        scheduleThumbnailBackfill(image);
      } else {
        image.addEventListener(
          "load",
          () => scheduleThumbnailBackfill(image),
          { once: true, passive: true },
        );
      }
    });
}


async function moveArchivePost(title,folder) {
  const post=postsData.find(item=>item.title===title);
  if(!post) return;
  const leaf=title.split("/").pop();
  const destination=folder?folder+"/"+leaf:leaf;
  if(destination===title) return;
  if(postsData.some(item=>item.title===destination)||archiveFolderRows.some(item=>item.title===destination)){
    await window.showAppAlert("An item with that name already exists in this folder.",{title:"Move failed"});return;
  }
  try {
    await archiveDocumentRequest("/" + encodeURIComponent(title), {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newTitle: destination })
    });
    window.location.reload();
  } catch(error) {await window.showAppAlert(error.message||"Move failed.",{title:"Move failed"});}
}
function showArchiveFolderPicker(post) {
  closeAllMenus();
  const overlay=document.createElement("div");overlay.className="archive-folder-picker";
  const panel=document.createElement("div");panel.className="archive-folder-picker-window raised";
  panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label","Move post to folder");
  const heading=document.createElement("h2");heading.className="archive-folder-picker-title";heading.textContent="ADD TO FOLDER";
  const select=document.createElement("select");select.setAttribute("aria-label","Destination folder");
  for(const folder of ["",...archiveFolders(archiveFolderRows)]) {
    const option=document.createElement("option");option.value=folder;option.textContent=folder||"(Unfiled)";select.append(option);
  }
  select.value=archiveParent(post.title);
  const actions=document.createElement("div");actions.className="archive-folder-picker-actions";
  const cancel=document.createElement("button");cancel.type="button";cancel.textContent="Cancel";
  const move=document.createElement("button");move.type="button";move.textContent="Move";
  const close=()=>{overlay.remove();document.removeEventListener("keydown",onKey);};
  const onKey=event=>{if(event.key==="Escape")close();};
  cancel.addEventListener("click",close);
  move.addEventListener("click",()=>{const destination=select.value;close();void moveArchivePost(post.title,destination);});
  overlay.addEventListener("click",event=>{if(event.target===overlay)close();});
  document.addEventListener("keydown",onKey);
  actions.append(cancel,move);panel.append(heading,select,actions);overlay.append(panel);document.body.append(overlay);select.focus();
}
postsContainer.querySelectorAll(".gallery-card").forEach(card => {
  card.draggable = true;
  card.querySelectorAll("img, video, a").forEach(media => { media.draggable = false; });
});
postsContainer.addEventListener("dragstart", event => {
  const card = event.target.closest(".gallery-card");
  if (!card || event.target.closest(".card-actions") || !event.dataTransfer) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData("application/x-meditord-post", card.dataset.title);
  event.dataTransfer.effectAllowed = "move";
  const bounds = card.getBoundingClientRect();
  event.dataTransfer.setDragImage(card,
    Math.max(0, event.clientX - bounds.left),
    Math.max(0, event.clientY - bounds.top));
  card.classList.add("is-dragging");
});
postsContainer.addEventListener("dragend",()=>{
  postsContainer.querySelectorAll(".is-dragging").forEach(card=>card.classList.remove("is-dragging"));
  archiveTree.querySelectorAll(".drop-target").forEach(row=>row.classList.remove("drop-target"));
});

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
    await archiveDocumentRequest("/" + encodeURIComponent(post.title), { method: "DELETE" });

    postsData = postsData.filter((entry) => entry.title !== post.title);
    card.remove();
    renderArchiveFolders();
    refreshArchiveFolderView();
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

    if (action === "add-to-folder") { showArchiveFolderPicker(post); return; }
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

initializeMasonry();
initializeThumbnailBackfill();

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
