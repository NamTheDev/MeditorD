# Ideas

If you are interested in my hand-drawn or human-written notes, you can check out the [MeditorD/Design_Ideas](https://github.com/NamTheDev/MeditorD/tree/main/design/ideas) folder.

# Design

## Windows 95/98 Design

Used for the editor and archive pages. This design generally inspired me to even create this project. I have always loved the nostalgic, analog theme, and blocky 3d button of the Window 95/98 era.

[Github/Chrislemke/Windows_95_98](https://chrislemke.github.io/website_designs/designs/Windows_95_98.html)

## Catppuccin Mocha Palette (Lavender Accent)

The color palette used for all pages in this project. It is my personal favorite, minimal, and visually appealing color scheme.

[Catppuccin/palette](https://catppuccin.com/palette)

# Software

## Editor

The editor I used to create this project is Zed by Zed Industries. The reason why I even use this is because I dislike VS Code and Zed has AI integration, which is very helpful for assisting me in building this project. Check it out at [Zed.dev](https://zed.dev).

## Canva

Canva was very, very helpful in creating the visual template for LLM Gemini 3.8 Flash to replicate the html, css, and js with 90% accuracy. You can check out the screenshots in [MeditorD/Canva_Designs](https://github.com/NamTheDev/MeditorD/tree/main/design/canva).

## LLMS / AI Tools

The LLMs used in this project are Gemini, DeepSeek, and GitHub Copilot AI assistant.

- Gemini was used to generate the html, css, and js templates.
- DeepSeek was used for quick web search.
- GitHub Copilot was used to assist with the project's overall coding and commit messages.

For more information on what I have discussed with Gemini, you can check out the [MeditorD/Design_Chat_Logs](https://github.com/NamTheDev/MeditorD/tree/main/design/chat-logs) folder. In case of other LLMs / AI tools, I have lost the chat logs. I will export them in the future, sorry!

## Tech Stack

The following technologies are used in this project:

- **Bun** — JavaScript/TypeScript runtime and native HTTP server via `Bun.serve`.
- **TypeScript** — Strictly typed server-side application code and Bun configuration.
- **SQLite** — Local document storage through Bun's built-in `bun:sqlite` driver.
- **HTML, CSS, and browser JavaScript** — Framework-free frontend pages, styling, editor behavior, and API client.
- **HTTP/JSON API** — Document, folder, and media operations exposed under `/api`.
- **Gzip compression** — Uploaded image and video files are compressed before being stored as SQLite BLOBs.
- **Bun and Node.js standard APIs** — Filesystem, path, and zlib utilities support static file serving and media storage.
