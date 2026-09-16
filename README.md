# MeditorD

## I. AI Disclaimer

Built from human ideas with Gemini, DeepSeek, and GitHub Copilot supporting design, research, implementation, testing, and documentation throughout project development.

## II. Summary and Description

MeditorD is a nostalgic editor for securely saving linked documents.

### Directory

```text
meditord/
├── database/
│   └── meditord.sqlite — Runtime SQLite database
├── design/
│   ├── canva/
│   │   ├── 404.png
│   │   ├── home-background.png
│   │   └── home.png
│   ├── chat-logs/
│   │   ├── gemini-flash-11-09-2026.md
│   │   └── github-copilot-16-09-2026.md
│   └── ideas/
│       └── editor.png
├── functions/
│   ├── api/
│   │   └── index.ts — Document and media API routes
│   ├── database/
│   │   ├── documents.ts — SQLite document operations
│   │   └── index.ts — Database exports
│   ├── file.ts — Public page file resolution
│   ├── render.ts — HTML page rendering
│   ├── string.ts — Path normalization helpers
│   └── url.ts — URL validation helpers
├── public/
│   ├── css/
│   │   ├── archive.css
│   │   ├── edit.css
│   │   ├── exit.css
│   │   ├── global.css
│   │   ├── home.css
│   │   └── not-found.css
│   ├── js/
│   │   ├── archive.js
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
│   ├── edit.html
│   ├── exit.html
│   ├── global.html
│   └── home.html
├── .dockerignore — Docker build exclusions
├── .gitignore — Git exclusions
├── Dockerfile — Bun container definition
├── LICENSE — Project license
├── README.md — Project documentation
├── RESOURCES.md — Design and development references
├── bun.lock — Bun dependency lockfile
├── config.ts — Server environment configuration
├── index.ts — Bun HTTP server
├── package.json — Project metadata
├── rules.md — Project documentation and workflow rules
└── tsconfig.json — TypeScript configuration
```

### Tech Stack

- Bun runtime and HTTP server
- Docker containerization
- TypeScript
- Bun's SQLite with `database/meditord.sqlite`
- Gzip-compressed SQLite BLOBs for image and video uploads
- markdown-it for rendering Markdown post descriptions
- HTML, CSS, and browser JavaScript
- JSON API for document, folder, and media operations

## III. Installation and Usage

1. Install Bun v1.0 or newer.
2. Clone this repository and change into its directory.
3. Run `bun install` to install dependencies.
4. Optionally set `PORT`, `HOST`, and `ROOT` in `.env`.
5. Start the server with `bun run index.ts`.
6. Open `http://localhost:3000` in a desktop browser.

Create a submission with a title and username, then provide either a URL or an image/video upload before saving. Content is stored locally in SQLite, and uploaded media is served through the media API. Mobile devices are not supported.

## IV. Resources and License

Project design references and development resources are documented in [`RESOURCES.md`](RESOURCES.md).

This project is licensed under the [`LICENSE`](LICENSE) file.
