# Ideas

If you are interested in my hand-drawn or human-written notes, you can check out the [MeditorD/Design_Ideas](https://github.com/NamTheDev/MeditorD/tree/main/design/ideas) folder.

# Design

## Windows 95/98 Design

Used for the editor and archive pages. This design inspired me to create the project. I have always loved the nostalgic, analog theme and the blocky 3D buttons of the Windows 95/98 era.

[GitHub/Chrislemke/Windows_95_98](https://chrislemke.github.io/website_designs/designs/Windows_95_98.html)

## Pinterest Gallery Layout

Pinterest's masonry-style visual feed informs the archive's multi-column card layout. Posts retain variable heights while individual cards stay within a readable maximum width.

[Pinterest](https://www.pinterest.com/)

Pinterest's [open-source Gestalt Masonry component](https://github.com/pinterest/gestalt/blob/master/packages/gestalt/src/Masonry.tsx) was researched as a reference for card sizing and placement. The current Archive instead retains its original responsive CSS Grid and JavaScript row-span calculation, with a maximum width applied when only one post is visible. No Gestalt code or React dependency is bundled.

## Minimal Folder Hierarchy

A user-provided tree-view reference informed the Archive Explorer's compact 16px indentation, muted folder icons, disclosure arrows, and understated selection treatment. It is a visual reference, not a bundled third-party asset.

## Catppuccin Mocha Palette (Lavender Accent)

This color palette is used throughout the project. It is my favorite minimal and visually appealing color scheme.

[Catppuccin/palette](https://catppuccin.com/palette)

# Interface and Browser API References

- [MDN: CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout) — responsive Archive masonry column layout.
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) — versioned shell caching and offline navigation.
- [MDN: Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache) — local browser storage for app-shell assets and media.
- [Google Fonts](https://fonts.google.com/) — self-hosted WOFF2 families used throughout the interface; applicable upstream licenses are preserved under `public/fonts/licenses/`.

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

The project uses:

- **HTML, CSS, vanilla JavaScript** ([MDN](https://developer.mozilla.org/)) for the frontend.
- **TypeScript on Bun** with [`Bun.serve`](https://bun.sh/docs/api/http) for the backend.
- **SQLite** via [`bun:sqlite`](https://bun.sh/docs/api/sqlite) for the database.
- **markdown-it** ([GitHub](https://github.com/markdown-it/markdown-it)) for Markdown.
- **Service Workers + Cache Storage API** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage)) for browser caching.
- **Docker** with [`oven/bun`](https://hub.docker.com/r/oven/bun) for containerization.
- **TypeScript compiler, Bun test runner, Git** ([TypeScript](https://www.typescriptlang.org/), [Bun test](https://bun.sh/docs/cli/test), [Git](https://git-scm.com/)) for development and testing.