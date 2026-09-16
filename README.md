# MeditorD 📝

## I. AI Disclaimer

Built from human ideas with Gemini, DeepSeek, and GitHub Copilot supporting design, research, implementation, testing, and documentation throughout project development.

## II. Summary and Description

MeditorD is a nostalgic local editor for saving linked documents.

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
│   └── 📄 HTML pages — Home, editor, archive, exit, and not-found views
├── 📄 config.ts — Server environment configuration
├── 📄 index.ts — Bun HTTP server
├── 📄 package.json — Project metadata
└── 📄 tsconfig.json — TypeScript configuration
```

### Tech Stack

- 🟨 Bun runtime and HTTP server
- 🐳 Docker containerization
- 🟦 TypeScript
- 🗄️ Bun's SQLite with `database/meditord.sqlite`
- 🗜️ Gzip-compressed SQLite BLOBs for image and video uploads
- 📝 markdown-it for rendering Markdown post descriptions
- 🌐 HTML, CSS, and browser JavaScript
- 🔌 JSON API for document, folder, and media operations

## III. Installation and Usage

1. Install Bun v1.0 or newer.
2. Run `bun install`.
3. Optionally set `PORT`, `HOST`, and `ROOT` in `.env`.
4. Start the server with `bun run index.ts`.
5. Open `http://localhost:3000`.

Create a submission with a title and username, then provide either a URL or an image/video upload before saving. Content is stored locally in SQLite and uploaded media is served through the media API.

## IV. Resources and License

Project design references and development resources are documented in [`RESOURCES.md`](RESOURCES.md).

This project is licensed under the [`LICENSE`](LICENSE) file.

## V. Chat Log Formatting

Exported design conversations are stored in [`design/chat-logs/`](design/chat-logs/) using the `<LLM>-<DD-MM-YYYY>.md` filename format. Each log includes the LLM heading, date, transcript heading, and bold `User` and `Assistant` speaker labels.
