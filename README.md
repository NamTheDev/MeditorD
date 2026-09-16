# MeditorD 📝

## I. AI Disclaimer

Created with human ideas and design using Google AI Studio, Gemini Flash, DeepSeek, and GitHub Copilot for coding assistance throughout.

## II. Summary and Description

Bun editor stores documents and compressed media in local SQLite.

### Directory

```text
meditord/
├── 📁 database/ — Runtime SQLite database files
├── 📁 functions/
│   ├── 📁 api/ — Document and media API routes
│   ├── 📁 database/ — SQLite records and compressed media BLOBs
│   ├── 📄 file.ts — Public page file resolution
│   ├── 📄 render.ts — HTML page rendering
│   └── 📄 string.ts — Path normalization helpers
├── 📁 public/
│   ├── 📁 css/ — Page stylesheets
│   ├── 📁 js/ — Editor and database clients
│   └── 📄 HTML pages — Home, editor, exit, and not-found views
├── 📄 config.ts — Server environment configuration
├── 📄 index.ts — Bun HTTP server
├── 📄 package.json — Project metadata
└── 📄 tsconfig.json — TypeScript configuration
```

### Tech Stack

- 🟨 Bun runtime and HTTP server
- 🟦 TypeScript
- 🗄️ Bun SQLite with `database/meditord.sqlite`
- 🗜️ Gzip-compressed SQLite BLOBs for image and video uploads
- 🌐 HTML, CSS, and browser JavaScript

## III. Installation and Usage

1. Install Bun v1.0 or newer.
2. Run `bun install`.
3. Optionally set `PORT`, `HOST`, and `ROOT` in `.env`.
4. Start the server with `bun run index.ts`.
5. Open `http://localhost:3000`.

The editor saves document text, URLs, and image or video uploads through the document API. Uploaded media is served through the media API.
