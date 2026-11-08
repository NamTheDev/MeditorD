const titleInput = document.getElementById("doc-title");
const usernameInput = document.getElementById("doc-username");
const folderSelect = document.getElementById("doc-folder");
const createFolderValue = "__meditord_create_folder__";
let pendingFolder = "";
let selectedFolder = "";

function isValidFolderSegment(value) {
  return Boolean(value && value !== "." && value !== ".." &&
    !/[\\/\u0000-\u001f]/.test(value));
}

function appendFolderOption(value, label = value) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  folderSelect.append(option);
}

async function loadEditorFolders() {
  const requestedFolder = new URLSearchParams(window.location.search).get("folder") || "";
  const available = new Set();
  try {
    const entries = await window.database.listDocuments();
    for (const entry of entries) {
      if (entry.isDirectory) available.add(entry.title);
      let path = entry.title;
      while (path.includes("/")) {
        path = path.slice(0, path.lastIndexOf("/"));
        if (path) available.add(path);
      }
    }
  } catch (error) {
    console.warn("Could not load folders:", error);
  }
  folderSelect.replaceChildren();
  appendFolderOption("", "(Unfiled)");
  [...available].sort((a, b) => a.localeCompare(b)).forEach((folder) => {
    appendFolderOption(folder);
  });
  appendFolderOption(createFolderValue, "+ Create new folder...");
  if (available.has(requestedFolder)) folderSelect.value = requestedFolder;
  selectedFolder = folderSelect.value;
}

folderSelect.addEventListener("change", async () => {
  if (folderSelect.value !== createFolderValue) {
    selectedFolder = folderSelect.value;
    pendingFolder = "";
    folderSelect.querySelector('option[data-pending-folder="true"]')?.remove();
    return;
  }
  const parent = selectedFolder;
  const name = await window.showAppPrompt(
    parent ? "New subfolder in " + parent + ":" : "New folder name:",
    { title: "New folder", inputLabel: "Folder name", confirmLabel: "Use folder" },
  );
  if (name == null) {
    folderSelect.value = selectedFolder;
    return;
  }
  const leaf = name.trim();
  if (!isValidFolderSegment(leaf)) {
    await window.showAppAlert("Use a folder name without slashes or control characters.", {
      title: "Invalid folder name",
    });
    folderSelect.value = selectedFolder;
    return;
  }
  const path = parent ? parent + "/" + leaf : leaf;
  if ([...folderSelect.options].some((option) => option.value === path)) {
    await window.showAppAlert("A folder with this name already exists.", {
      title: "Folder exists",
    });
    folderSelect.value = selectedFolder;
    return;
  }
  folderSelect.querySelector('option[data-pending-folder="true"]')?.remove();
  const option = document.createElement("option");
  option.value = path;
  option.textContent = "New: " + path + " (on save)";
  option.dataset.pendingFolder = "true";
  folderSelect.insertBefore(option, folderSelect.lastElementChild);
  pendingFolder = path;
  folderSelect.value = path;
  selectedFolder = path;
});
const urlInput = document.getElementById("doc-url");
const contentInput = document.querySelector(".editor-textarea");
const previewButton = document.getElementById("preview-button");
const writeViewButton = document.getElementById("write-view-button");
const previewViewButton = document.getElementById("preview-view-button");
const markdownPreview = document.querySelector(".editor-markdown-preview");
const textareaWrapper = document.querySelector(".editor-textarea-wrapper");
const mobileMarkdownToolbar = document.querySelector(
  ".editor-mobile-markdown-toolbar",
);
const editorContainer = document.querySelector(".editor-container");
const editorLayout = document.getElementById("editor-layout");
const mediaInput = document.getElementById("doc-media");
const previewBox = document.querySelector(".editor-preview-box");
const saveButton = document.getElementById("save-button");
const archiveButton = document.getElementById("archive-button");
const resetButton = document.getElementById("reset-button");
const featureModal = document.getElementById("feature-modal");
const featureModalTitle = document.getElementById("feature-modal-title");
const featureModalMessage = document.getElementById("feature-modal-message");
const featureModalClose = featureModal.querySelector(".editor-dialog-close");
const featureModalOk = featureModal.querySelector(".global-button");
let modalReturnFocus = null;
let previewUrl = null;
let narrowEditorLayout = false;
const markdown = window.markdownit({
  html: false,
  linkify: true,
  typographer: true,
});

function updateMarkdownPreview() {
  markdownPreview.innerHTML = markdown.render(
    contentInput.value || "_Nothing to preview yet._",
  );
}

function resizeMobileTextarea() {
  if (!narrowEditorLayout) {
    contentInput.style.height = "";
    return;
  }

  contentInput.style.height = "auto";
  contentInput.style.height = `${Math.max(320, contentInput.scrollHeight)}px`;
}

function syncEditorLayoutMode() {
  narrowEditorLayout = editorContainer.clientWidth <= 839;
  resizeMobileTextarea();
}

function setDescriptionView(view) {
  const previewing = view === "preview";
  if (previewing) updateMarkdownPreview();

  contentInput.classList.toggle("global-hidden", previewing);
  markdownPreview.classList.toggle("global-hidden", !previewing);
  textareaWrapper.dataset.view = previewing ? "preview" : "write";
  previewButton.textContent = previewing ? "Edit" : "Preview";

  writeViewButton.classList.toggle("active", !previewing);
  previewViewButton.classList.toggle("active", previewing);
  writeViewButton.setAttribute("aria-selected", String(!previewing));
  previewViewButton.setAttribute("aria-selected", String(previewing));

  resizeMobileTextarea();
}

function applyMarkdownAction(action) {
  const start = contentInput.selectionStart;
  const end = contentInput.selectionEnd;
  const selected = contentInput.value.slice(start, end);
  const actions = {
    heading: { prefix: "# ", suffix: "", fallback: "Heading" },
    bold: { prefix: "**", suffix: "**", fallback: "bold text" },
    italic: { prefix: "_", suffix: "_", fallback: "italic text" },
    code: { prefix: "`", suffix: "`", fallback: "code" },
    list: { prefix: "- ", suffix: "", fallback: "List item" },
    link: { prefix: "[", suffix: "](https://)", fallback: "link text" },
  };
  const config = actions[action];
  if (!config) return;

  const body = selected || config.fallback;
  const replacement = `${config.prefix}${body}${config.suffix}`;
  contentInput.setRangeText(replacement, start, end, "end");
  contentInput.focus();

  if (!selected) {
    const selectionStart = start + config.prefix.length;
    contentInput.setSelectionRange(
      selectionStart,
      selectionStart + config.fallback.length,
    );
  }

  updateMarkdownPreview();
  resizeMobileTextarea();
}

function setStatus(message) {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  previewBox.textContent = message;
}

function renderMediaPreview(file) {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  previewBox.replaceChildren();

  if (!file) {
    previewBox.textContent = "No Media Selected";
    return;
  }

  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    previewBox.textContent = file.name;
    return;
  }

  previewUrl = URL.createObjectURL(file);
  const media = document.createElement(
    file.type.startsWith("video/") ? "video" : "img",
  );
  media.className = "editor-media-preview";
  media.src = previewUrl;
  media.setAttribute("aria-label", file.name);
  if (media instanceof HTMLVideoElement) {
    media.controls = true;
  }
  previewBox.append(media);
}

async function saveCurrentDocument() {
  const title = titleInput.value.trim();
  const folder = folderSelect.value;
  const username = usernameInput.value.trim();
  if (title.includes("/") || title.includes(String.fromCharCode(92)) ||
    title === "." || title === "..") {
    showFeatureNotice("Cannot Save Document", "Title cannot contain path separators.", titleInput);
    return;
  }
  const url = urlInput.value.trim();
  const media = mediaInput.files?.[0];
  if (!title) {
    showFeatureNotice("Cannot Save Document", "Title is required.", titleInput);
    return;
  }
  if (!url && !media && !contentInput.value.trim()) {
    showFeatureNotice(
      "Cannot Save Document",
      "Either description, URL, or an uploaded media is required.",
      urlInput,
    );
    return;
  }
  if (url && !window.isSupportedPostUrl(url)) {
    showFeatureNotice(
      "Cannot Save Document",
      "Supported URL types are HTTP(S) websites and YouTube URLs.",
      urlInput,
    );
    return;
  }

  try {
    const thumbnail =
      media?.type?.startsWith("image/") && window.mediaThumbnail
        ? await window.mediaThumbnail.fromFile(media)
        : null;

    await window.database.saveDocument(
      folder ? folder + "/" + title : title,
      username,
      contentInput.value,
      url,
      media,
      thumbnail,
      folder === pendingFolder ? pendingFolder : "",
    );
    if (pendingFolder && folder === pendingFolder) {
      folderSelect.querySelector('option[data-pending-folder="true"]')?.remove();
      pendingFolder = "";
      appendFolderOption(folder, folder);
      folderSelect.value = folder;
    }
    showFeatureNotice(
      "Upload Complete",
      "Content uploaded to database.",
      saveButton,
    );
  } catch (error) {
    setStatus(error.message);
  }
}

function resetEditor() {
  // Reset the whole draft, including a folder created only for this post.
  titleInput.value = "";
  usernameInput.value = "";
  urlInput.value = "";
  contentInput.value = "";
  mediaInput.value = "";

  folderSelect.querySelector('option[data-pending-folder="true"]')?.remove();
  pendingFolder = "";
  selectedFolder = "";
  folderSelect.value = "";

  // renderMediaPreview also revokes any temporary object URL.
  renderMediaPreview(null);
  updateMarkdownPreview();
  setDescriptionView("write");
  editorLayout.scrollTop = 0;
  titleInput.focus();
}

function showFeatureNotice(title, message, returnFocus = null) {
  featureModalTitle.textContent = title;
  featureModalMessage.textContent = message;
  modalReturnFocus = returnFocus;
  featureModal.classList.remove("global-hidden");
  featureModalOk.focus();
}

function closeFeatureNotice() {
  featureModal.classList.add("global-hidden");
  modalReturnFocus?.focus();
  modalReturnFocus = null;
}

mediaInput.addEventListener("change", () => {
  renderMediaPreview(mediaInput.files?.[0]);
});

saveButton.addEventListener("click", saveCurrentDocument);
archiveButton.addEventListener("click", () => {
  window.meditordNavigate("/archive.html");
});
resetButton.addEventListener("click", resetEditor);
previewButton.addEventListener("click", () => {
  const isPreviewing = !markdownPreview.classList.contains("global-hidden");
  setDescriptionView(isPreviewing ? "write" : "preview");
});
writeViewButton.addEventListener("click", () => setDescriptionView("write"));
previewViewButton.addEventListener("click", () =>
  setDescriptionView("preview"),
);
mobileMarkdownToolbar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-markdown-action]");
  if (!button) return;
  applyMarkdownAction(button.dataset.markdownAction);
});
contentInput.addEventListener("input", () => {
  updateMarkdownPreview();
  resizeMobileTextarea();
});
if ("ResizeObserver" in window) {
  const editorResizeObserver = new ResizeObserver(() => {
    syncEditorLayoutMode();
  });
  editorResizeObserver.observe(editorContainer);
  editorResizeObserver.observe(document.querySelector(".editor-left-pane"));
  editorResizeObserver.observe(document.querySelector(".editor-right-pane"));
}

window.addEventListener("resize", syncEditorLayoutMode, { passive: true });

featureModalClose.addEventListener("click", closeFeatureNotice);
featureModalOk.addEventListener("click", closeFeatureNotice);

featureModal.addEventListener("click", (event) => {
  if (event.target === featureModal) {
    closeFeatureNotice();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !featureModal.classList.contains("global-hidden")) {
    closeFeatureNotice();
  }
});

syncEditorLayoutMode();
updateMarkdownPreview();
setDescriptionView("write");

void loadEditorFolders();
