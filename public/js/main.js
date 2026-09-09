import * as editor from "./editor.js";
import * as sidebar from "./sidebar.js";
import * as palette from "./palette.js";
import * as ui from "./ui.js";

const isMac = /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent || navigator.platform);
const isLinux = /Linux/i.test(navigator.userAgent || navigator.platform) && !/Android/i.test(navigator.userAgent);
const modKey = isMac ? "Cmd" : (isLinux ? "Ctrl/Meta" : "Ctrl");

const toggleSidebarBtn = document.getElementById("toggle-sidebar");
const saveBtn = document.getElementById("save-btn");
const deleteBtn = document.getElementById("delete-btn");
const addFileBtn = document.getElementById("add-file-btn");
const addFolderBtn = document.getElementById("add-folder-btn");
const cmdPaletteBtn = document.getElementById("cmd-palette-btn");
const helpBtn = document.getElementById("help-btn");
const helpCloseBtn = document.getElementById("help-close-btn");
const settingsBtn = document.getElementById("settings-btn");

saveBtn.title = `Save (${modKey}+S)`;
cmdPaletteBtn.title = `Command Palette (${modKey}+P)`;
helpBtn.title = `Help & Shortcuts (${modKey}+H)`;

document.querySelectorAll(".context-menu-item .shortcut[data-key]").forEach((el) => {
  el.innerText = `${modKey}+${el.getAttribute("data-key")}`;
});

const ACTIONS = [
  { label: "File: Save Document", shortcut: `${modKey}+S`, run: () => sidebar.saveCurrentDocument(true) },
  { label: "File: New Document", shortcut: "", run: () => sidebar.createNewDocument("") },
  { label: "File: New Folder", shortcut: "", run: () => sidebar.createNewFolder() },
  { label: "File: Delete Selected", shortcut: "Del", run: () => sidebar.deleteSelectedDocuments() },
  { label: "View: Toggle Explorer Sidebar", shortcut: "", run: () => sidebar.sidebar.classList.toggle("collapsed") },
  { label: "Help: Show Help Documentation", shortcut: `${modKey}+H`, run: () => palette.openHelp() },
  { label: "Format: Bold", shortcut: `${modKey}+B`, run: () => editor.wrapSelection("**", "**") },
  { label: "Format: Italic", shortcut: `${modKey}+I`, run: () => editor.wrapSelection("*", "*") },
  { label: "Format: Inline Code", shortcut: "`", run: () => editor.wrapSelection("`", "`") },
  { label: "Format: Insert Link", shortcut: `${modKey}+K`, run: () => editor.wrapSelection("[", "](https://)") },
  { label: "Format: Toggle Blockquote", shortcut: `${modKey}+/`, run: () => editor.togglePrefix("> ") },
  { label: "Edit: Duplicate Line", shortcut: `${modKey}+D`, run: () => editor.duplicateCurrentLine() },
  { label: "Edit: Delete Line", shortcut: `${modKey}+Shift+K`, run: () => editor.deleteCurrentLine() },
  {
    label: "Edit: Clear All Text",
    shortcut: "",
    run: () => {
      editor.input.value = "";
      editor.updateLineNumbers();
      editor.renderMarkdown();
      ui.showToast("Cleared editor", "info");
    },
  },
];

palette.initPalette(ACTIONS);

toggleSidebarBtn.addEventListener("click", () => {
  sidebar.sidebar.classList.toggle("collapsed");
});

saveBtn.addEventListener("click", () => sidebar.saveCurrentDocument(true));
deleteBtn.addEventListener("click", () => sidebar.deleteSelectedDocuments());
addFileBtn.addEventListener("click", () => sidebar.createNewDocument(""));
addFolderBtn.addEventListener("click", () => sidebar.createNewFolder());
cmdPaletteBtn.addEventListener("click", palette.openCommandPalette);
helpBtn.addEventListener("click", palette.openHelp);
helpCloseBtn.addEventListener("click", palette.closeHelp);

settingsBtn.addEventListener("click", (e) => {
  e.preventDefault();
  ui.showToast("Settings feature coming soon", "info");
});

editor.input.addEventListener("input", () => {
  editor.updateLineNumbers();
  editor.renderMarkdown();
});

window.addEventListener("keydown", (e) => {
  const isInput = ["INPUT", "TEXTAREA"].includes(e.target.tagName) || e.target.isContentEditable;
  const isCmd = isMac ? e.metaKey : e.ctrlKey;

  if (!isInput && (e.key === "Backspace" || e.key === "Delete")) {
    e.preventDefault();
    sidebar.deleteSelectedDocuments();
    return;
  }

  if (isCmd && e.key.toLowerCase() === "h") {
    e.preventDefault();
    if (palette.helpBackdrop.style.display === "flex") palette.closeHelp();
    else palette.openHelp();
    return;
  }

  if (isCmd && e.key.toLowerCase() === "p") {
    e.preventDefault();
    if (palette.paletteBackdrop.style.display === "flex") palette.closeCommandPalette();
    else palette.openCommandPalette();
    return;
  }

  if (e.key === "Escape") {
    palette.closeCommandPalette();
    palette.closeHelp();
    editor.contextMenu.style.display = "none";
    sidebar.sidebarContextMenu.style.display = "none";
  }

  if (isCmd && e.key.toLowerCase() === "s") {
    e.preventDefault();
    sidebar.saveCurrentDocument(true);
  } else if (isCmd && e.key.toLowerCase() === "b") {
    e.preventDefault();
    editor.wrapSelection("**", "**");
  } else if (isCmd && e.key.toLowerCase() === "i") {
    e.preventDefault();
    editor.wrapSelection("*", "*");
  } else if (isCmd && e.key.toLowerCase() === "k") {
    e.preventDefault();
    editor.wrapSelection("[", "](https://)");
  } else if (isCmd && e.key === "/") {
    e.preventDefault();
    editor.togglePrefix("> ");
  } else if (isCmd && e.key.toLowerCase() === "d") {
    e.preventDefault();
    editor.duplicateCurrentLine();
  } else if (isCmd && e.shiftKey && e.key.toLowerCase() === "k") {
    e.preventDefault();
    editor.deleteCurrentLine();
  }
});

editor.updateLineNumbers();
sidebar.loadDocumentList();
