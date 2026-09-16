const titleInput = document.getElementById("doc-title");
const urlInput = document.getElementById("doc-url");
const contentInput = document.querySelector(".editor-textarea");
const mediaInput = document.getElementById("doc-media");
const previewBox = document.querySelector(".preview-box");
const saveButton = document.querySelector(".action-btn");
const archiveButton = document.querySelectorAll(".action-btn")[1];
const settingsButton = document.querySelector(".settings-btn");
const featureModal = document.getElementById("feature-modal");
const featureModalTitle = document.getElementById("feature-modal-title");
const featureModalMessage = document.getElementById("feature-modal-message");
const featureModalClose = featureModal.querySelector(".win98-modal-close");
const featureModalOk = featureModal.querySelector(".win98-button");
let modalReturnFocus = null;
let previewUrl = null;

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
  const media = document.createElement(file.type.startsWith("video/") ? "video" : "img");
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
  if (!title) {
    showFeatureNotice("Cannot Save Document", "Title is required.", titleInput);
    return;
  }

  try {
    await window.database.saveDocument(
      title,
      contentInput.value,
      urlInput.value.trim(),
      mediaInput.files?.[0],
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

function showArchiveNotice() {
  showFeatureNotice("Access The Archive", "Feature coming soon.");
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
archiveButton.addEventListener("click", showArchiveNotice);
settingsButton.addEventListener("click", showSettingsNotice);
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
