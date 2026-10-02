# MeditorD

## I. AI Disclaimer

Built from human ideas with Gemini, DeepSeek, GitHub Copilot, and ChatGPT supporting design, research, implementation, testing, and documentation throughout development.

## II. Introduction

MeditorD is a nostalgic editor for securely saving linked documents.

### Directory

```text
meditord/
├── design/
│   ├── canva/
│   │   ├── 404.png
│   │   ├── home-background.png
│   │   └── home.png
│   ├── chat-logs/
│   │   ├── chatgpt-02-10-2026.md
│   │   ├── gemini-11-09-2026.md
│   │   ├── gemini-28-09-2026.md
│   │   ├── github-copilot-16-09-2026.md
│   │   └── github-copilot-25-09-2026.md
│   └── ideas/
│       └── editor.png
├── functions/
│   ├── api/
│   │   └── index.ts
│   ├── database/
│   │   ├── documents.ts
│   │   └── index.ts
│   ├── file.ts
│   ├── render.ts
│   ├── string.ts
│   └── url.ts
├── public/
│   ├── css/
│   │   ├── archive.css
│   │   ├── database.css
│   │   ├── edit.css
│   │   ├── exit.css
│   │   ├── global.css
│   │   ├── home.css
│   │   └── not-found.css
│   ├── js/
│   │   ├── app-dialog.js
│   │   ├── archive.js
│   │   ├── database.js
│   │   ├── document-api.js
│   │   ├── edit.js
│   │   ├── home-navigation.js
│   │   └── url-validation.js
│   ├── media/
│   │   ├── grass-background.webp
│   │   ├── green-arrow.webp
│   │   ├── home-background.webp
│   │   └── icon.webp
│   ├── 404.html
│   ├── archive.html
│   ├── database.html
│   ├── edit.html
│   ├── exit.html
│   ├── global.html
│   └── home.html
├── .dockerignore
├── .gitignore
├── Dockerfile
├── LICENSE
├── README.md
├── RESOURCES.md
├── THIRD_PARTY_NOTICES.md
├── bun.lock
├── config.ts
├── index.ts
├── log.md
├── package.json
├── guidelines.md
└── tsconfig.json
```

### Tech Stack

- Bun runtime and HTTP server.
- Docker containerization.
- TypeScript.
- Bun's SQLite with `database/meditord.sqlite`.
- Gzip-compressed SQLite BLOBs for image and video uploads.
- markdown-it for rendering Markdown post descriptions.
- HTML, CSS, and browser JavaScript.
- Minimal database-management table for browsing saved posts.
- Modal editing and creation for title, username, URL, date, media, and description.
- JSON API for document, folder, and media operations.
- Responsive phone, tablet, and desktop layouts with safe-area and virtual-keyboard handling.

## III. Installation

1. Install Bun v1.0 or newer.
2. Clone this repository and change into its directory.
3. Run `bun install` to install dependencies.
4. Optionally set `PORT`, `HOST`, and `ROOT` in `.env`.
5. Start the server with `bun run index.ts`.
6. Open `http://localhost:3000` in a modern browser.
7. Open `http://localhost:3000/database.html` to access the database page.

## IV. Resources and License

Project design references and development resources are documented in [`RESOURCES.md`](RESOURCES.md).

Original MeditorD material is licensed under the [`LICENSE`](LICENSE) file. Third-party materials retain their own terms as documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
