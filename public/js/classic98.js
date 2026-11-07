/* Classic '98 taskbar: usable keyboard-accessible Start menu + live clock. */
(() => {
  const startButton = document.getElementById("classicStartButton");
  const menu = document.getElementById("classicStartMenu");
  const clock = document.getElementById("classicClock");
  const current = document.getElementById("classicCurrentPage");
  if (!startButton || !menu) return;

  const page = {
    "/": ["MeditorD - Home", "/home.html"],
    "/home.html": ["MeditorD - Home", "/home.html"],
    "/edit.html": ["Editor", "/edit.html"],
    "/archive.html": ["Gallery", "/archive.html"],
    "/database.html": ["Database", "/database.html"],
    "/exit.html": ["Exit", "/exit.html"]
  }[location.pathname] || ["MeditorD", "/home.html"];
  if (current) {
    current.textContent = page[0];
    current.setAttribute("href", page[1]);
    current.setAttribute("aria-current", "page");
  }
  const close = () => { menu.hidden = true; startButton.setAttribute("aria-expanded", "false"); };
  const open = () => { menu.hidden = false; startButton.setAttribute("aria-expanded", "true"); menu.querySelector("a")?.focus(); };
  startButton.addEventListener("click", () => menu.hidden ? open() : close());
  document.addEventListener("pointerdown", event => {
    if (!event.target.closest(".classic-start-wrap")) close();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !menu.hidden) { close(); startButton.focus(); }
  });
  menu.addEventListener("click", event => { if (event.target.closest("a")) close(); });

  const updateClock = () => {
    if (!clock) return;
    const now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    clock.dateTime = now.toISOString();
    clock.title = now.toLocaleString();
  };
  updateClock();
  setInterval(updateClock, 30000);
})();