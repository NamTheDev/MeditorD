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
const editorContainer = document.querySelector(".editor-container");
const editorLayout = document.getElementById("editor-layout");
const mobileScrollbar = document.getElementById("editor-mobile-scrollbar");
const mobileScrollbarTrack = document.getElementById(
  "editor-mobile-scrollbar-track",
);
const mobileScrollbarThumb = document.getElementById(
  "editor-mobile-scrollbar-thumb",
);
const mobileScrollbarArrows = mobileScrollbar.querySelectorAll(
  "[data-scroll-direction]",
);
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
let narrowEditorLayout = false;
let scrollbarFrame = 0;
let scrollbarDragPointer = null;
let scrollbarDragStartY = 0;
let scrollbarDragStartScrollTop = 0;
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

function syncMobileScrollbar() {
  scrollbarFrame = 0;

  if (!narrowEditorLayout) {
    mobileScrollbar.hidden = true;
    return;
  }

  const scrollRange = Math.max(
    0,
    editorLayout.scrollHeight - editorLayout.clientHeight,
  );
  if (scrollRange <= 1) {
    mobileScrollbar.hidden = true;
    mobileScrollbarTrack.setAttribute("aria-valuenow", "0");
    return;
  }

  mobileScrollbar.hidden = false;
  const trackHeight = mobileScrollbarTrack.clientHeight;
  if (trackHeight <= 0) return;

  const thumbHeight = Math.min(
    trackHeight,
    Math.max(
      44,
      Math.round(
        trackHeight * (editorLayout.clientHeight / editorLayout.scrollHeight),
      ),
    ),
  );
  const thumbTravel = Math.max(0, trackHeight - thumbHeight);
  const scrollRatio = editorLayout.scrollTop / scrollRange;
  const thumbTop = thumbTravel * scrollRatio;

  mobileScrollbarThumb.style.height = `${thumbHeight}px`;
  mobileScrollbarThumb.style.transform = `translateY(${thumbTop}px)`;
  mobileScrollbarTrack.setAttribute(
    "aria-valuenow",
    String(Math.round(scrollRatio * 100)),
  );
}

function queueMobileScrollbarSync() {
  if (scrollbarFrame) return;
  scrollbarFrame = requestAnimationFrame(syncMobileScrollbar);
}

function syncEditorLayoutMode() {
  narrowEditorLayout = editorContainer.clientWidth <= 839;
  resizeMobileTextarea();
  queueMobileScrollbarSync();
}

function scrollEditorBy(amount) {
  editorLayout.scrollTop += amount;
  queueMobileScrollbarSync();
}

function stopScrollbarDrag(event) {
  if (
    scrollbarDragPointer === null ||
    (event && event.pointerId !== scrollbarDragPointer)
  ) {
    return;
  }

  if (
    event &&
    mobileScrollbarThumb.hasPointerCapture?.(scrollbarDragPointer)
  ) {
    mobileScrollbarThumb.releasePointerCapture(scrollbarDragPointer);
  }

  scrollbarDragPointer = null;
  mobileScrollbarThumb.classList.remove("dragging");
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

  resizeMobileTextarea();
  queueMobileScrollbarSync();
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
  queueMobileScrollbarSync();
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
    const thumbnail =
      media?.type?.startsWith("image/") && window.mediaThumbnail
        ? await window.mediaThumbnail.fromFile(media)
        : null;

    await window.database.saveDocument(
      title,
      username,
      contentInput.value,
      url,
      media,
      thumbnail,
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
  requestAnimationFrame(queueMobileScrollbarSync);
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
contentInput.addEventListener("input", () => {
  updateMarkdownPreview();
  resizeMobileTextarea();
  queueMobileScrollbarSync();
});
mobileScrollbarArrows.forEach((button) => {
  button.addEventListener("click", () => {
    const direction = Number(button.dataset.scrollDirection) || 0;
    const step = Math.max(96, Math.round(editorLayout.clientHeight * 0.18));
    scrollEditorBy(direction * step);
  });
});

mobileScrollbarTrack.addEventListener("pointerdown", (event) => {
  if (event.target !== mobileScrollbarTrack) return;
  event.preventDefault();

  const trackRect = mobileScrollbarTrack.getBoundingClientRect();
  const thumbRect = mobileScrollbarThumb.getBoundingClientRect();
  const clickY = event.clientY - trackRect.top;
  const thumbTop = thumbRect.top - trackRect.top;
  const thumbBottom = thumbRect.bottom - trackRect.top;
  const direction = clickY < thumbTop ? -1 : clickY > thumbBottom ? 1 : 0;

  if (direction) {
    scrollEditorBy(direction * Math.round(editorLayout.clientHeight * 0.8));
  }
});

mobileScrollbarThumb.addEventListener("pointerdown", (event) => {
  if (mobileScrollbar.hidden) return;
  event.preventDefault();

  scrollbarDragPointer = event.pointerId;
  scrollbarDragStartY = event.clientY;
  scrollbarDragStartScrollTop = editorLayout.scrollTop;
  mobileScrollbarThumb.classList.add("dragging");
  mobileScrollbarThumb.setPointerCapture(event.pointerId);
});

mobileScrollbarThumb.addEventListener("pointermove", (event) => {
  if (event.pointerId !== scrollbarDragPointer) return;
  event.preventDefault();

  const trackHeight = mobileScrollbarTrack.clientHeight;
  const thumbHeight = mobileScrollbarThumb.offsetHeight;
  const thumbTravel = Math.max(1, trackHeight - thumbHeight);
  const scrollRange = Math.max(
    0,
    editorLayout.scrollHeight - editorLayout.clientHeight,
  );
  const scrollPerPixel = scrollRange / thumbTravel;

  editorLayout.scrollTop =
    scrollbarDragStartScrollTop +
    (event.clientY - scrollbarDragStartY) * scrollPerPixel;
  queueMobileScrollbarSync();
});

mobileScrollbarThumb.addEventListener("pointerup", stopScrollbarDrag);
mobileScrollbarThumb.addEventListener("pointercancel", stopScrollbarDrag);
mobileScrollbarThumb.addEventListener("lostpointercapture", stopScrollbarDrag);

mobileScrollbarTrack.addEventListener("keydown", (event) => {
  const pageStep = Math.max(96, Math.round(editorLayout.clientHeight * 0.8));

  if (event.key === "ArrowUp") {
    event.preventDefault();
    scrollEditorBy(-80);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    scrollEditorBy(80);
  } else if (event.key === "PageUp") {
    event.preventDefault();
    scrollEditorBy(-pageStep);
  } else if (event.key === "PageDown") {
    event.preventDefault();
    scrollEditorBy(pageStep);
  } else if (event.key === "Home") {
    event.preventDefault();
    editorLayout.scrollTop = 0;
    queueMobileScrollbarSync();
  } else if (event.key === "End") {
    event.preventDefault();
    editorLayout.scrollTop = editorLayout.scrollHeight;
    queueMobileScrollbarSync();
  }
});

editorLayout.addEventListener("scroll", queueMobileScrollbarSync, {
  passive: true,
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
  if (event.key === "Escape" && !featureModal.classList.contains("hidden")) {
    closeFeatureNotice();
  }
});


syncEditorLayoutMode();
updateMarkdownPreview();
resizeMobileTextarea();
setDescriptionView("write");
queueMobileScrollbarSync();
