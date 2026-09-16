window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    document.getElementById("exit-btn")?.click();
  } else if (event.key === "ArrowRight") {
    document.getElementById("edit-btn")?.click();
  }
});
