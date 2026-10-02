(() => {
  const overlay = document.getElementById("appDialog");
  const titleElement = document.getElementById("appDialogTitle");
  const messageElement = document.getElementById("appDialogMessage");
  const inputWrap = document.getElementById("appDialogInputWrap");
  const input = document.getElementById("appDialogInput");
  const inputLabel = document.getElementById("appDialogInputLabel");
  const cancelButton = document.getElementById("appDialogCancel");
  const confirmButton = document.getElementById("appDialogConfirm");
  const closeButton = document.getElementById("appDialogClose");
  const dialogWindow = overlay.querySelector(".app-dialog-window");

  let activeDialog = null;

  function closeDialog(value) {
    if (!activeDialog) return;
    const { resolve, returnFocus } = activeDialog;
    activeDialog = null;
    overlay.hidden = true;
    resolve(value);
    returnFocus?.focus();
  }

  function showDialog({
    title = "Message",
    message = "",
    type = "alert",
    value = "",
    confirmLabel,
    cancelLabel = "Cancel",
    inputLabel: label = "Value",
  } = {}) {
    if (activeDialog) closeDialog(null);
    const returnFocus = document.activeElement;
    titleElement.textContent = title;
    messageElement.textContent = message;
    input.value = value;
    inputLabel.textContent = label;
    inputWrap.hidden = type !== "prompt";
    dialogWindow.setAttribute(
      "role",
      type === "prompt" ? "dialog" : "alertdialog",
    );
    cancelButton.hidden = type === "alert";
    cancelButton.textContent = cancelLabel;
    confirmButton.textContent =
      confirmLabel || (type === "confirm" ? "Confirm" : "OK");
    overlay.hidden = false;

    return new Promise((resolve) => {
      activeDialog = { resolve, returnFocus, type };
      if (type === "prompt") input.focus();
      else confirmButton.focus();
    });
  }

  function cancelDialog() {
    if (!activeDialog) return;
    const type = activeDialog.type;
    closeDialog(type === "prompt" ? null : false);
  }

  confirmButton.addEventListener("click", () => {
    if (!activeDialog) return;
    const type = activeDialog.type;
    closeDialog(type === "prompt" ? input.value : true);
  });
  cancelButton.addEventListener("click", cancelDialog);
  closeButton.addEventListener("click", cancelDialog);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) cancelDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (!activeDialog) return;
    if (event.key === "Escape") {
      event.preventDefault();
      cancelDialog();
    } else if (event.key === "Enter" && activeDialog?.type === "prompt") {
      event.preventDefault();
      closeDialog(input.value);
    }
  });

  window.showAppAlert = (message, options = {}) =>
    showDialog({ ...options, message, type: "alert" });
  window.showAppConfirm = (message, options = {}) =>
    showDialog({ ...options, message, type: "confirm" });
  window.showAppPrompt = (message, options = {}) =>
    showDialog({ ...options, message, type: "prompt" });
})();
