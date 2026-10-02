const titleInput = document.getElementById("doc-title");
const usernameInput = document.getElementById("doc-username");
const urlInput = document.getElementById("doc-url");
const contentInput = document.querySelector(".editor-textarea");
const previewButton = document.getElementById("preview-button");
const writeViewButton = document.getElementById("write-view-button");
const previewViewButton = document.getElementById("preview-view-button");
const markdownPreview = document.querySelector(".markdown-preview");
const textareaWrapper = document.querySelector(".textarea-wrapper");
const mobileMarkdownToolbar = document.querySelector(".mobile-markdown-toolbar");
const mediaInput = document.getElementById("doc-media");
const previewBox = document.querySelector(".preview-box");
const saveButton = document.querySelector(".action-btn");
const archiveButton = document.getElementById("archive-button");
const settingsButton = document.querySelector(".settings-btn");
const featureModal = document.getElementById("feature-modal");
const featureModalTitle = document.getElementById("feature-modal-title");
const featureModalMessage = document.getElementById("feature-modal-message");
const featureModalClose = featureModal.querySelector(".win98-modal-close");
const featureModalOk = featureModal.querySelector(".win98-button");
let modalReturnFocus = null;
let previewUrl = null;
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

function setDescriptionView(view) {
  const previewing = view === "preview";
  if (previewing) updateMarkdownPreview();

  contentInput.classList.toggle("hidden", previewing);
  markdownPreview.classList.toggle("hidden", !previewing);
  textareaWrapper.dataset.view = previewing ? "preview" : "write";
  previewButton.textContent = previewing ? "Edit" : "Preview";

  writeViewButton.classList.toggle("active", !previewing);
  previewViewButton.classList.toggle("active", previewing);
  writeViewButton.setAttribute("aria-selected", String(!previewing));
  previewViewButton.setAttribute("aria-selected", String(previewing));
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
  media.className = "media-preview";
  media.src = previewUrl;
  media.setAttribute("aria-label", file.name);
  if (media instanceof HTMLVideoElement) {
    media.controls = true;
  }
  previewBox.append(media);
}

async function saveCurrentDocument() {
  const title = titleInput.value.trim();
  const username = usernameInput.value.trim();
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
    await window.database.saveDocument(
      title,
      username,
      contentInput.value,
      url,
      media,
    );
    showFeatureNotice(
      "Upload Complete",
      "Content uploaded to database.",
      saveButton,
    );
  } catch (error) {
    setStatus(error.message);
  }
}

function showSettingsNotice() {
  showFeatureNotice("Settings", "Feature coming soon.");
}

function showFeatureNotice(title, message, returnFocus = null) {
  featureModalTitle.textContent = title;
  featureModalMessage.textContent = message;
  modalReturnFocus = returnFocus;
  featureModal.classList.remove("hidden");
  featureModalOk.focus();
}

function closeFeatureNotice() {
  featureModal.classList.add("hidden");
  modalReturnFocus?.focus();
  modalReturnFocus = null;
}

mediaInput.addEventListener("change", () => {
  renderMediaPreview(mediaInput.files?.[0]);
});

saveButton.addEventListener("click", saveCurrentDocument);
archiveButton.addEventListener("click", () => {
  window.location.href = "/archive.html";
});
settingsButton.addEventListener("click", showSettingsNotice);
previewButton.addEventListener("click", () => {
  const isPreviewing = !markdownPreview.classList.contains("hidden");
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
contentInput.addEventListener("input", updateMarkdownPreview);
featureModalClose.addEventListener("click", closeFeatureNotice);
featureModalOk.addEventListener("click", closeFeatureNotice);

featureModal.addEventListener("click", (event) => {
  if (event.target === featureModal) {
    closeFeatureNotice();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !featureModal.classList.contains("hidden")) {
    closeFeatureNotice();
  }
});


setDescriptionView("write");
