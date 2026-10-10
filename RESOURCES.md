# Ideas

If you are interested in my hand-drawn or human-written notes, you can check out the [MeditorD/Design_Ideas](https://github.com/NamTheDev/MeditorD/tree/main/design/ideas) folder.

# Design

## Windows 95/98 Design

Used for the editor and archive pages. This design inspired me to create the project. I have always loved the nostalgic, analog theme and the blocky 3D buttons of the Windows 95/98 era.

[GitHub/Chrislemke/Windows_95_98](https://chrislemke.github.io/website_designs/designs/Windows_95_98.html)

## Pinterest Gallery Layout

Pinterest's masonry-style visual feed informs the archive's multi-column card layout. Posts retain variable heights while individual cards stay within a readable maximum width.

[Pinterest](https://www.pinterest.com/)

The implementation also references [Pinterest's open-source Gestalt Masonry component](https://github.com/pinterest/gestalt/blob/master/packages/gestalt/src/Masonry.tsx), which measures its container and positions cards based on column availability. The archive uses its own vanilla JavaScript positioning rather than copying Gestalt or bundling the React library.

## Minimal Folder Hierarchy

A user-provided tree-view reference informed the Archive Explorer's compact 16px indentation, muted folder icons, disclosure arrows, and understated selection treatment. It is a visual reference, not a bundled third-party asset.

## Catppuccin Mocha Palette (Lavender Accent)

This color palette is used throughout the project. It is my favorite minimal and visually appealing color scheme.

[Catppuccin/palette](https://catppuccin.com/palette)

# Interface and Browser API References

- [MDN: CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) — responsive Archive masonry column layout.
- [MDN: HTML Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API) — moving archive posts onto Explorer folders.

# Software

## Editor

I used Zed by Zed Industries to create this project. I prefer it to VS Code because its AI integration is very helpful when building this project. Check it out at [Zed.dev](https://zed.dev).

## Canva

Canva was very helpful in creating the visual template that Gemini used to replicate the HTML, CSS, and JavaScript with 90% accuracy. You can check out the screenshots in [MeditorD/Canva_Designs](https://github.com/NamTheDev/MeditorD/tree/main/design/canva).

## LLMs / AI Tools

The LLMs and AI tools used in this project are Gemini, DeepSeek, GitHub Copilot, and ChatGPT.

- Gemini was used to generate the HTML, CSS, and JavaScript templates.
- DeepSeek was used for quick web search.
- GitHub Copilot was used to assist with the project's overall coding and commit messages.
- ChatGPT was used for cache architecture, implementation, debugging, local diagnostics, repository maintenance, and documentation updates.

For more information about AI-assisted design and development discussions, check out the [MeditorD/Design_Chat_Logs](https://github.com/NamTheDev/MeditorD/tree/main/design/chat-logs) folder. Chat logs are currently available for Gemini, GitHub Copilot, and ChatGPT.

## Third-Party Licensing

MeditorD's root MIT license applies to original MeditorD material only. Third-party software, design references, fonts, services, and assets keep their own licenses and terms.

Licensing notes for Catppuccin, the Windows 95/98 design reference, markdown-it, Google Fonts, Canva-related files, and project media are documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Tech Stack

The following technologies are used in this project:

- **Bun** — JavaScript/TypeScript runtime and native HTTP server via `Bun.serve`.
- **Docker** — Containerizes the Bun application for consistent deployment.
- **TypeScript** — Strictly typed server-side application code and Bun configuration.
- **SQLite** — Local document storage through Bun's built-in `bun:sqlite` driver.
- **HTML, CSS, and browser JavaScript** — Framework-free frontend pages, styling, editor behavior, and API client.
- **HTTP/JSON API** — Document, folder, and media operations exposed under `/api`.
- **SQLite media caching** — Uploaded image and video files are stored as raw SQLite BLOBs with content fingerprints, immutable browser caching, RAM reuse, and byte-range delivery.
- **Bun and Node.js standard APIs** — Filesystem, path, and zlib utilities support static file serving and media storage.
- **markdown-it** — Renders Markdown post descriptions in the archive and editor preview.
