# MeditorD

## I. AI Disclaimer

Built from human ideas with Gemini, DeepSeek, and GitHub Copilot supporting design, research, implementation, testing, and documentation throughout project development.

## II. Introduction

MeditorD is a nostalgic editor for securely saving linked documents.

### Directory

```text
meditord/
├── database/
│   └── meditord.sqlite
├── design/
│   ├── canva/
│   │   ├── 404.png
│   │   ├── home-background.png
│   │   └── home.png
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
│   │   ├── archive.js
│   │   ├── database.js
│   │   ├── document-api.js
│   │   ├── edit.js
│   │   ├── home-navigation.js
│   │   └── url-validation.js
│   ├── media/
│   │   ├── grass-background.webp
│   │   ├── green-arrow.webp
│   │   └── home-background.webp
│   ├── 404.html
│   ├── archive.html
│   ├── database.html
│   ├── edit.html
│   ├── exit.html
│   ├── global.html
│   └── home.html
├── .dockerignore
├── .gitignore
├── chat-logs/
│   ├── gemini-flash-11-09-2026.md
│   ├── github-copilot-16-09-2026.md
│   └── github-copilot-25-09-2026.md
├── Dockerfile
├── LICENSE
├── README.md
├── RESOURCES.md
├── bun.lock
├── config.ts
├── index.ts
├── package.json
├── rules.md
└── tsconfig.json
```

### Tech Stack

- Bun runtime and HTTP server
- Docker containerization
- TypeScript
- Bun's SQLite with `database/meditord.sqlite`
- Gzip-compressed SQLite BLOBs for image and video uploads
- markdown-it for rendering Markdown post descriptions
- HTML, CSS, and browser JavaScript
- Minimal database-management table for browsing saved posts
- Modal editing and creation for title, username, URL, date, media, and description
- JSON API for document, folder, and media operations

## III. Installation

1. Install Bun v1.0 or newer.
2. Clone this repository and change into its directory.
3. Run `bun install` to install dependencies.
4. Optionally set `PORT`, `HOST`, and `ROOT` in `.env`.
5. Start the server with `bun run index.ts`.
6. Open `http://localhost:3000` in a desktop browser.
7. Open `http://localhost:3000/database.html` to access the database page.

## IV. Resources and License

Project design references and development resources are documented in [`RESOURCES.md`](RESOURCES.md).

This project is licensed under the [`LICENSE`](LICENSE) file.
