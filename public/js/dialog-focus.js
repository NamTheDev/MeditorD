(() => {
  const focusableSelector = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  function focusableWithin(dialog) {
    return [...dialog.querySelectorAll(focusableSelector)].filter((element) =>
      !element.closest("[hidden], [inert]") &&
      element.getClientRects().length > 0 &&
      window.getComputedStyle(element).visibility !== "hidden"
    );
  }

  function trap(event, dialog) {
    if (event.key !== "Tab" || event.defaultPrevented) return;
    // A confirmation/prompt can open above a page-specific dialog.
    const appDialog = document.getElementById("appDialog");
    if (appDialog && !appDialog.hidden && dialog !== appDialog) return;

    const controls = focusableWithin(dialog);
    if (!controls.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = controls[0];
    const last = controls[controls.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || !dialog.contains(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (current === last || !dialog.contains(current))) {
      event.preventDefault();
      first.focus();
    }
  }

  function restore(element) {
    if (element?.isConnected && typeof element.focus === "function") {
      element.focus({ preventScroll: true });
    }
  }

  window.meditordDialogFocus = { trap, restore };
})();
