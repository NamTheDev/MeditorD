const state = {
  items: [],
  filter: "",
  matchMode: "includes",
  sortOrder: "newest",
  folderFilter: "",
  editingTitle: "",
  editingFolder: "",
};

const tableBody = document.getElementById("databaseList");

async function request(path, options = {}) {
  const headers =
    options.body && typeof options.body.append === "function"
      ? {}
      : options.body
        ? { "Content-Type": "application/json" }
        : {};
  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || `Request failed (${response.status})`);
  }
  return body;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(
    value.includes(" ") ? `${value.replace(" ", "T")}Z` : value,
  );
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function toDateTimeInput(value) {
  if (!value) return "";
  const date = new Date(
    value.includes(" ") ? `${value.replace(" ", "T")}Z` : value,
  );
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function renderMessage(message, className = "database-empty-state") {
  tableBody.replaceChildren();
  const count = document.getElementById("databaseResultCount");
  if (count) count.textContent = className === "database-error-state" ? "Unavailable" : message;
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 6;
  cell.className = className;
  cell.textContent = message;
  row.append(cell);
  tableBody.append(row);
}

function folderOf(title) {
  const index = title.lastIndexOf("/");
  return index < 0 ? "" : title.slice(0, index);
}
function leafName(title) {
  return title.slice(title.lastIndexOf("/") + 1);
}
function allFolders() {
  const paths = new Set(
    state.items.filter((i) => i.isDirectory).map((i) => i.title),
  );
  for (const item of state.items) {
    let parent = folderOf(item.title);
    while (parent) {
      paths.add(parent);
      parent = folderOf(parent);
    }
  }
  return [...paths].sort((a, b) => a.localeCompare(b));
}
function populateFolderSelect(selected = "") {
  const select = document.getElementById("editFolder");
  select.replaceChildren();
  for (const folder of ["", ...allFolders()]) {
    const option = document.createElement("option");
    option.value = folder;
    option.textContent = folder || "(Unfiled)";
    select.append(option);
  }
  select.value = selected;
}
async function createFolder() {
  const name = await window.showAppPrompt("Folder path (e.g. Music/Ideas):", {
    title: "New folder",
    inputLabel: "Folder path",
    confirmLabel: "Create",
  });
  if (!name?.trim()) return;
  const title = name
    .trim()
    .split(String.fromCharCode(92))
    .join("/")
    .replace(/^\/+|\/+$/g, "");
  if (!title || title.split("/").some((s) => !s || s === "." || s === "..")) {
    await window.showAppAlert("Invalid folder path.", {
      title: "Invalid folder",
    });
    return;
  }
  if (state.items.some((item) => item.title === title)) {
    await window.showAppAlert("That folder or post already exists.");
    return;
  }
  try {
    await request("/documents", {
      method: "POST",
      body: JSON.stringify({ title, isFolder: true }),
    });
    await loadItems();
  } catch (error) {
    await window.showAppAlert(error.message || "Failed to create folder.");
  }
}

function databasePostTime(item) {
  const value = item.document?.created_at || "";
  const date = new Date(value.includes(" ") ? value.replace(" ", "T") + "Z" : value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function compareDatabaseItems(a, b) {
  // Folders have no post date; keep them together at the top of the list.
  if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
  const titleOrder =
    leafName(a.title).localeCompare(leafName(b.title), undefined, { sensitivity: "base" }) ||
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  if (state.sortOrder === "az") return titleOrder;
  if (state.sortOrder === "za") return -titleOrder;
  if (a.isDirectory) return titleOrder;
  const difference = databasePostTime(a) - databasePostTime(b);
  return (state.sortOrder === "oldest" ? difference : -difference) || titleOrder;
}

function matchesDatabaseSearch(item) {
  const term = state.filter.trim().toLocaleLowerCase();
  if (!term) return true;
  const name = leafName(item.title).toLocaleLowerCase();
  if (state.matchMode === "starts") return name.startsWith(term);
  if (state.matchMode === "ends") return name.endsWith(term);
  // Preserve the previous Database behavior: search folder-qualified paths too.
  return name.includes(term) || item.title.toLocaleLowerCase().includes(term);
}

function matchesDatabaseFolder(item) {
  const folder = state.folderFilter;
  return !folder || item.title === folder || item.title.startsWith(folder + "/");
}

function updateDatabaseFolderOptions() {
  const select = document.getElementById("databaseFolderFilter");
  const selected = state.folderFilter;
  const paths = allFolders();
  select.replaceChildren();
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "All folders";
  select.append(all);
  for (const path of paths) {
    const option = document.createElement("option");
    option.value = path;
    option.textContent = path;
    select.append(option);
  }
  state.folderFilter = paths.includes(selected) ? selected : "";
  select.value = state.folderFilter;
}

function renderTable() {
  const items = state.items
    .filter((item) => matchesDatabaseSearch(item) && matchesDatabaseFolder(item))
    .sort(compareDatabaseItems);
  tableBody.replaceChildren();

  const count = document.getElementById("databaseResultCount");
  if (count) {
    count.textContent =
      items.length === state.items.length
        ? `${items.length} items`
        : `${items.length} of ${state.items.length} items`;
  }

  if (!items.length) {
    renderMessage(
      state.items.length ? "No matching posts or folders." : "No posts saved.",
    );
    if (count) {
      count.textContent =
        state.items.length ? `0 of ${state.items.length} items` : "0 items";
    }
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("tr");
    if (item.isDirectory) row.className = "database-folder-row";

    const title = document.createElement("td");
    title.className = "database-title-cell";
    title.title = item.title;
    const titleContent = document.createElement("span");
    titleContent.className = "database-item";
    if (item.isDirectory) {
      const glyph = document.createElement("span");
      glyph.className = "database-folder-glyph";
      glyph.setAttribute("aria-hidden", "true");
      titleContent.append(glyph);
    }
    const name = document.createElement("span");
    name.className = "database-item-name";
    name.textContent = leafName(item.title);
    titleContent.append(name);
    title.append(titleContent);

    const documentData = item.document;
    const username = document.createElement("td");
    username.textContent = item.isDirectory
      ? "Folder"
      : documentData?.username || "—";
    if (item.isDirectory) username.className = "database-type-cell";

    const url = document.createElement("td");
    if (!item.isDirectory && documentData?.url) {
      const link = document.createElement("a");
      link.href = documentData.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = documentData.url;
      link.title = documentData.url;
      url.append(link);
    } else {
      url.textContent = "—";
    }

    const folder = document.createElement("td");
    folder.textContent = folderOf(item.title) || "—";
    folder.title = folderOf(item.title);

    const created = document.createElement("td");
    created.textContent = item.isDirectory
      ? "—"
      : formatDate(documentData?.created_at);

    const actions = document.createElement("td");
    actions.className = "database-actions-cell";
    const buttons = document.createElement("div");
    buttons.className = "database-row-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = item.isDirectory ? "Rename" : "Edit";
    edit.setAttribute("aria-label", `${edit.textContent} ${item.title}`);
    edit.addEventListener("click", () => editItem(item));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "database-delete-action";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${item.title}`);
    remove.addEventListener("click", () => deleteItem(item));
    buttons.append(edit, remove);
    actions.append(buttons);

    row.append(title, username, url, folder, created, actions);
    tableBody.append(row);
  });
}
async function loadItems() {
  renderMessage("Loading database...");
  try {
    state.items = await request("/documents?database=true");
    updateDatabaseFolderOptions();
    renderTable();

    const editTitle = new URLSearchParams(window.location.search).get("edit");
    if (editTitle) {
      const target = state.items.find(
        (item) => !item.isDirectory && item.title === editTitle,
      );
      if (target) {
        editItem(target);
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("edit");
        window.history.replaceState({}, "", nextUrl);
      }
    }
  } catch (error) {
    state.items = [];
    renderMessage(error.message, "database-error-state");
  }
}

async function editItem(item) {
  if (item.isDirectory) {
    const newTitle = await window.showAppPrompt("New folder title:", {
      title: "Rename folder",
      value: item.title,
      inputLabel: "Folder name",
      confirmLabel: "Save",
    });
    if (!newTitle?.trim() || newTitle.trim() === item.title) return;
    try {
      await request(`/documents/${encodeURIComponent(item.title)}`, {
        method: "PUT",
        body: JSON.stringify({ newTitle: newTitle.trim() }),
      });
      await loadItems();
    } catch (error) {
      await window.showAppAlert(error.message, { title: "Error" });
    }
    return;
  }
  let data = item.document;
  if (!data || !Object.prototype.hasOwnProperty.call(data, "content")) {
    try {
      data = await request(`/documents/${encodeURIComponent(item.title)}`);
      item.document = data;
    } catch (error) {
      await window.showAppAlert(error.message || "Failed to load post.", {
        title: "Error",
      });
      return;
    }
  }

  state.editingTitle = item.title;
  document.getElementById("editModalTitle").textContent = `Edit ${item.title}`;
  document.getElementById("editTitle").value = leafName(item.title);
  state.editingFolder = folderOf(item.title);
  populateFolderSelect(state.editingFolder);
  document.getElementById("editUsername").value = data.username || "";
  document.getElementById("editUrl").value = data.url || "";
  document.getElementById("editCreatedAt").value = toDateTimeInput(
    data.created_at,
  );
  document.getElementById("editContent").value = data.content || "";
  document.getElementById("editMedia").value = "";
  document.getElementById("removeMedia").checked = false;
  document.getElementById("editError").textContent = "";
  document.getElementById("editModal").classList.remove("global-hidden");
  document.getElementById("editTitle").focus();
}

function createPost() {
  state.editingTitle = "";
  document.getElementById("editModalTitle").textContent = "New post";
  document.getElementById("editTitle").value = "";
  state.editingFolder = "";
  populateFolderSelect("");
  document.getElementById("editUsername").value = "";
  document.getElementById("editUrl").value = "";
  document.getElementById("editCreatedAt").value = toDateTimeInput(
    new Date().toISOString(),
  );
  document.getElementById("editContent").value = "";
  document.getElementById("editMedia").value = "";
  document.getElementById("removeMedia").checked = false;
  document.getElementById("removeMedia").closest("label").hidden = true;
  document.getElementById("editError").textContent = "";
  document.getElementById("editModal").classList.remove("global-hidden");
  document.getElementById("editTitle").focus();
}

function closeEditModal() {
  document.getElementById("editModal").classList.add("global-hidden");
  document.getElementById("removeMedia").closest("label").hidden = false;
}

async function saveEdit(event) {
  event.preventDefault();

  const form = new FormData(document.getElementById("editForm"));
  const leaf = document.getElementById("editTitle").value.trim();
  const folder = document.getElementById("editFolder").value;
  if (!leaf || leaf.includes("/") || leaf.includes(String.fromCharCode(92))) {
    document.getElementById("editError").textContent =
      "Title cannot contain path separators.";
    return;
  }
  form.set("title", folder ? `${folder}/${leaf}` : leaf);
  form.set("username", document.getElementById("editUsername").value);
  form.set("url", document.getElementById("editUrl").value.trim());
  form.set("createdAt", document.getElementById("editCreatedAt").value);
  form.set("content", document.getElementById("editContent").value);
  form.set(
    "removeMedia",
    document.getElementById("removeMedia").checked ? "true" : "false",
  );
  const media = document.getElementById("editMedia").files?.[0];
  if (!media) form.delete("media");
  const errorElement = document.getElementById("editError");
  errorElement.textContent = "";
  const oldTitle = state.editingTitle;
  const existingItem = state.items.find((item) => item.title === oldTitle);
  const hasContent = Boolean(form.get("content")?.toString().trim());
  const hasUrl = Boolean(form.get("url")?.toString().trim());
  const hasMedia =
    Boolean(media) ||
    (Boolean(existingItem?.document?.hasMedia) &&
      !document.getElementById("removeMedia").checked);
  if (!hasUrl && !hasMedia && !hasContent) {
    errorElement.textContent =
      "Either description, URL, or an uploaded media is required.";
    return;
  }
  try {
    if (media?.type?.startsWith("image/") && window.mediaThumbnail) {
      const thumbnail = await window.mediaThumbnail.fromFile(media);
      if (thumbnail) form.set("thumbnail", thumbnail);
    }

    if (oldTitle) {
      await request(`/documents/${encodeURIComponent(oldTitle)}`, {
        method: "PUT",
        body: form,
      });
    } else {
      await request("/documents", { method: "POST", body: form });
    }
    closeEditModal();
    await loadItems();
  } catch (error) {
    errorElement.textContent = error.message;
  }
}

async function deleteItem(item) {
  const confirmed = await window.showAppConfirm(`Delete "${item.title}"?`, {
    title: "Delete item",
    confirmLabel: "Delete",
  });
  if (!confirmed) return;
  try {
    await request(`/documents/${encodeURIComponent(item.title)}`, {
      method: "DELETE",
    });
    await loadItems();
  } catch (error) {
    await window.showAppAlert(error.message, { title: "Error" });
  }
}

document.getElementById("backButton").addEventListener("click", () => {
  window.meditordNavigate("/home.html");
});
document.getElementById("archiveButton").addEventListener("click", () => {
  window.meditordNavigate("/archive.html");
});
document.getElementById("newPostButton").addEventListener("click", createPost);
document
  .getElementById("newFolderButton")
  .addEventListener("click", createFolder);
document.getElementById("refreshButton").addEventListener("click", loadItems);
document.getElementById("searchInput").addEventListener("input", (event) => {
  state.filter = event.target.value;
  renderTable();
});
document.getElementById("databaseSearchMode").addEventListener("change", (event) => {
  state.matchMode = event.target.value;
  renderTable();
});
document.getElementById("databaseSortOrder").addEventListener("change", (event) => {
  state.sortOrder = event.target.value;
  renderTable();
});
document.getElementById("databaseFolderFilter").addEventListener("change", (event) => {
  state.folderFilter = event.target.value;
  renderTable();
});
document.getElementById("editForm").addEventListener("submit", saveEdit);
document
  .getElementById("closeEditButton")
  .addEventListener("click", closeEditModal);
document
  .getElementById("cancelEditButton")
  .addEventListener("click", closeEditModal);
document.getElementById("editModal").addEventListener("click", (event) => {
  if (event.target.id === "editModal") closeEditModal();
});

loadItems();
