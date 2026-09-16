function generateMochaGraphic(type) {
                if (type === "cat_retro") {
                    return `<svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="280" height="180" fill="#181825"/>
          <rect x="25" y="15" width="230" height="130" fill="#313244" stroke="#11111b" stroke-width="2"/>
          <rect x="40" y="25" width="200" height="105" fill="#1e1e2e"/>
          <text x="50" y="50" fill="#a6e3a1" font-family="'IBM Plex Mono', monospace" font-size="11">root@mocha:~# catppuccin --load</text>
          <text x="50" y="72" fill="#b4befe" font-family="'IBM Plex Mono', monospace" font-size="10">&gt; Accent set to Lavender (#b4befe)</text>
          <text x="50" y="90" fill="#f9e2af" font-family="'IBM Plex Mono', monospace" font-size="10">&gt; Palette: Mocha OK</text>
          <rect x="50" y="105" width="180" height="10" fill="#45475a"/>
          <rect x="52" y="107" width="120" height="6" fill="#b4befe"/>
          <rect x="110" y="148" width="60" height="18" fill="#45475a"/>
          <rect x="80" y="166" width="120" height="6" fill="#11111b"/>
        </svg>`;
                } else if (type === "cat_synth") {
                    return `<svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="280" height="180" fill="#1e1e2e"/>
          <circle cx="140" cy="85" r="50" fill="#cba6f7"/>
          <rect x="0" y="105" width="280" height="75" fill="#11111b"/>
          <line x1="0" y1="115" x2="280" y2="115" stroke="#b4befe" stroke-width="1"/>
          <line x1="0" y1="130" x2="280" y2="130" stroke="#b4befe" stroke-width="1.5"/>
          <line x1="0" y1="152" x2="280" y2="152" stroke="#b4befe" stroke-width="2"/>
          <line x1="140" y1="105" x2="20" y2="180" stroke="#b4befe" stroke-width="1.5"/>
          <line x1="140" y1="105" x2="80" y2="180" stroke="#b4befe" stroke-width="1.5"/>
          <line x1="140" y1="105" x2="140" y2="180" stroke="#b4befe" stroke-width="1.5"/>
          <line x1="140" y1="105" x2="200" y2="180" stroke="#b4befe" stroke-width="1.5"/>
          <line x1="140" y1="105" x2="260" y2="180" stroke="#b4befe" stroke-width="1.5"/>
        </svg>`;
                } else if (type === "cat_floppy") {
                    return `<svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="280" height="180" fill="#181825"/>
          <rect x="80" y="20" width="120" height="140" fill="#313244" stroke="#11111b" stroke-width="2"/>
          <rect x="95" y="20" width="90" height="50" fill="#45475a"/>
          <rect x="110" y="28" width="20" height="34" fill="#11111b"/>
          <rect x="92" y="85" width="96" height="65" fill="#f5e0dc"/>
          <line x1="100" y1="98" x2="178" y2="98" stroke="#b4befe" stroke-width="3"/>
          <text x="100" y="118" font-family="'IBM Plex Mono', monospace" font-size="9" fill="#11111b" font-weight="bold">MOCHA_SRC.TAR</text>
          <text x="100" y="134" font-family="'IBM Plex Mono', monospace" font-size="8" fill="#585b70">1.44 MB Diskette</text>
        </svg>`;
                } else {
                    return `<svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="280" height="180" fill="#11111b"/>
          <text x="20" y="40" fill="#b4befe" font-family="'IBM Plex Mono', monospace" font-size="12">0x10: 1E 1E 2E C0</text>
          <text x="20" y="65" fill="#cba6f7" font-family="'IBM Plex Mono', monospace" font-size="12">0x20: B4 BE FE FF</text>
          <text x="20" y="90" fill="#a6e3a1" font-family="'IBM Plex Mono', monospace" font-size="12">0x30: CD D6 F4 00</text>
          <text x="20" y="115" fill="#74c7ec" font-family="'IBM Plex Mono', monospace" font-size="12">0x40: 58 5B 70 89</text>
          <text x="20" y="140" fill="#fab387" font-family="'IBM Plex Mono', monospace" font-size="12">0x50: F3 8B A8 11</text>
          <rect x="180" y="25" width="80" height="130" fill="#1e1e2e" stroke="#585b70" stroke-dasharray="4,4"/>
          <text x="195" y="95" fill="#b4befe" font-family="monospace" font-size="11">READY.</text>
        </svg>`;
                }
            }

            let postsData = [];
            let isCompact = false;

            function renderPosts() {
                const container = document.getElementById("postsContainer");
                container.replaceChildren();

                postsData.forEach((post) => {
                    const card = document.createElement("article");
                    card.className = "gallery-card raised";
                    card.dataset.title = post.title;

                    const media = document.createElement("div");
                    media.className = "gallery-media thin-sunken";
                    media.innerHTML = post.hasMedia
                        ? `<img src="/api/media/${encodeURIComponent(post.title)}" alt="">`
                        : generateMochaGraphic("cat_retro");
                    const flair = document.createElement("span");
                    flair.className = "flair-tag";
                    flair.textContent = post.hasMedia ? "Media" : "Document";
                    media.append(flair);

                    const info = document.createElement("div");
                    info.className = "card-info";
                    const title = document.createElement("div");
                    title.className = "card-title";
                    title.textContent = post.title;
                    const meta = document.createElement("div");
                    meta.className = "card-meta";
                    meta.textContent = post.isDirectory ? "Folder" : "Document";
                    info.append(title, meta);
                    card.append(media, info);
                    card.addEventListener("click", () => openPostModal(post));
                    container.append(card);
                });
            }

            function historyBack() {
                const modal = document.getElementById("postModal");
                if (modal.classList.contains("active")) {
                    closeModal();
                    return;
                }
                window.location.href = "/home.html";
            }

            function toggleLayout() {
                const container = document.getElementById("postsContainer");
                const button = document.getElementById("toggleGridBtn");
                isCompact = !isCompact;
                container.classList.toggle("compact", isCompact);
                button.textContent = isCompact ? "🖼️ Toggle Grid" : "📋 Toggle Compact";
            }

            function openPostModal(post) {
                document.getElementById("modalTitle").textContent = post.title;
                const body = document.getElementById("modalBody");
                body.replaceChildren();
                const heading = document.createElement("h2");
                heading.className = "modal-post-title";
                heading.textContent = post.title;
                const description = document.createElement("p");
                description.className = "modal-post-meta";
                description.textContent = post.isDirectory ? "Folder" : "Document";
                body.append(heading, description);
                if (post.hasMedia) {
                    const media = document.createElement("img");
                    media.className = "modal-media";
                    media.src = `/api/media/${encodeURIComponent(post.title)}`;
                    media.alt = post.title;
                    body.prepend(media);
                } else {
                    const graphic = document.createElement("div");
                    graphic.className = "modal-large-img thin-sunken";
                    graphic.innerHTML = generateMochaGraphic("cat_retro");
                    body.prepend(graphic);
                }
                const modal = document.getElementById("postModal");
                modal.classList.add("active");
                modal.setAttribute("aria-hidden", "false");
            }

            function closeModal() {
                const modal = document.getElementById("postModal");
                modal.classList.remove("active");
                modal.setAttribute("aria-hidden", "true");
            }

            function closeModalOnBg(event) {
                if (event.target.id === "postModal") closeModal();
            }

            async function loadPosts() {
                try {
                    const items = (await window.database.listDocuments()).filter(
                        (post) => !post.isDirectory,
                    );
                    postsData = await Promise.all(
                        items.map(async (item) => ({
                            ...item,
                            ...(await window.database.getDocument(item.title)),
                        })),
                    );
                    renderPosts();
                } catch (error) {
                    const container = document.getElementById("postsContainer");
                    container.textContent = error.message;
                }
            }

            document.getElementById("backButton").addEventListener("click", historyBack);
            document.getElementById("toggleGridBtn").addEventListener("click", toggleLayout);
            document.getElementById("newPostButton").addEventListener("click", () => {
                window.location.href = "/edit.html";
            });
            document.querySelector(".modal-close-button").addEventListener("click", closeModal);
            document.getElementById("postModal").addEventListener("click", closeModalOnBg);
            loadPosts();
