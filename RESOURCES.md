# Ideas

If you are interested in my hand-drawn or human-written notes, you can check out the [MeditorD/Design_Ideas](https://github.com/NamTheDev/MeditorD/tree/main/design/ideas) folder.

# Design

## Windows 95/98 Design

Used for the editor and archive pages. This design inspired me to create this project. I have always loved the nostalgic, analog theme and the blocky 3D buttons of the Windows 95/98 era.

[GitHub/Chrislemke/Windows_95_98](https://chrislemke.github.io/website_designs/designs/Windows_95_98.html)

## Catppuccin Mocha Palette (Lavender Accent)

This color palette is used throughout the project. It is my favorite minimal and visually appealing color scheme.

[Catppuccin/palette](https://catppuccin.com/palette)

# Software

## Editor

I used Zed by Zed Industries to create this project. I prefer it to VS Code because its AI integration is very helpful when building this project. Check it out at [Zed.dev](https://zed.dev).

## Canva

Canva was very helpful in creating the visual template that Gemini 3.8 Flash used to replicate the HTML, CSS, and JavaScript with 90% accuracy. You can check out the screenshots in [MeditorD/Canva_Designs](https://github.com/NamTheDev/MeditorD/tree/main/design/canva).

## LLMs / AI Tools

The LLMs and AI tools used in this project are Gemini, DeepSeek, and GitHub Copilot.

- Gemini was used to generate the HTML, CSS, and JavaScript templates.
- DeepSeek was used for quick web search.
- GitHub Copilot was used to assist with the project's overall coding and commit messages.

For more information about my discussions with Gemini, check out the [MeditorD/Design_Chat_Logs](https://github.com/NamTheDev/MeditorD/tree/main/design/chat-logs) folder. I lost the chat logs for the other LLMs and AI tools, but I will export them in the future.

## Tech Stack

The following technologies are used in this project:

- **Bun** — JavaScript/TypeScript runtime and native HTTP server via `Bun.serve`.
- **TypeScript** — Strictly typed server-side application code and Bun configuration.
- **SQLite** — Local document storage through Bun's built-in `bun:sqlite` driver.
- **HTML, CSS, and browser JavaScript** — Framework-free frontend pages, styling, editor behavior, and API client.
- **HTTP/JSON API** — Document, folder, and media operations exposed under `/api`.
- **Gzip compression** — Uploaded image and video files are compressed before being stored as SQLite BLOBs.
- **Bun and Node.js standard APIs** — Filesystem, path, and zlib utilities support static file serving and media storage.
