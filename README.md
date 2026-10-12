# MeditorD

## I. AI Disclaimer

Built from human ideas with Gemini, DeepSeek, GitHub Copilot, and ChatGPT supporting design, research, implementation, testing, and documentation throughout development.

## II. Introduction

MeditorD is a nostalgic editor for organizing saved linked documents.

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
│   │   ├── chatgpt-03-10-2026.md
│   │   ├── chatgpt-04-10-2026.md
│   │   ├── chatgpt-05-10-2026.md
│   │   ├── chatgpt-10-10-2026.md
│   │   ├── chatgpt-11-10-2026.md
│   │   ├── chatgpt-12-10-2026.md
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
│   ├── image-dimensions.ts
│   ├── render.ts
│   ├── string.ts
│   └── url.ts
├── public/
│   ├── css/
│   │   ├── archive-explorer.css
│   │   ├── archive.css
│   │   ├── database-folder.css
│   │   ├── database.css
│   │   ├── edit.css
│   │   ├── exit.css
│   │   ├── fonts.css
│   │   ├── global.css
│   │   ├── home.css
│   │   └── not-found.css
│   ├── fonts/
│   │   ├── 01c04f4d69ca47be.woff2
│   │   ├── 06a00cf15830e987.woff2
│   │   ├── 0b5c2db191621518.woff2
│   │   ├── 0df26f35f561af8d.woff2
│   │   ├── 0e213dc59c137688.woff2
│   │   ├── 11ced52deb54070d.woff2
│   │   ├── 155bc5d4aa04bfb0.woff2
│   │   ├── 2532acb5e3041baf.woff2
│   │   ├── 2d8cfbcbf9ec7629.woff2
│   │   ├── 2eab9668f909a1cb.woff2
│   │   ├── 33ff57e97518ac70.woff2
│   │   ├── 3ac757485912968d.woff2
│   │   ├── 4065b246a6a3a332.woff2
│   │   ├── 466e6a68c4ee3f94.woff2
│   │   ├── 4e183d488cda203f.woff2
│   │   ├── 5778b1a208141d42.woff2
│   │   ├── 629b63da958cc8b3.woff2
│   │   ├── 7300d08cc3cf7909.woff2
│   │   ├── 757e9d7228a62b17.woff2
│   │   ├── 7744a5a46dc6d551.woff2
│   │   ├── 784e5ede32c4cdea.woff2
│   │   ├── 831b24d66d162c0f.woff2
│   │   ├── 839c38410d1a25b2.woff2
│   │   ├── 8998599c66c8fbe3.woff2
│   │   ├── 917577ede7adc104.woff2
│   │   ├── 9d44a92983acf712.woff2
│   │   ├── 9db1dd0fa5bc64ca.woff2
│   │   ├── a42b6e465d3ca536.woff2
│   │   ├── b05e6a7c9b00e462.woff2
│   │   ├── bde7db92496666b1.woff2
│   │   ├── c3a25aa85495bee4.woff2
│   │   ├── c4f4a8cd0b92a14a.woff2
│   │   ├── cb1a242b907c798c.woff2
│   │   ├── cf65f680c0c97e6e.woff2
│   │   ├── da9e68f458e4d3db.woff2
│   │   ├── efbd4e0b7034b5e3.woff2
│   │   ├── f776288548a3e1d9.woff2
│   │   ├── f798d93bcc10a932.woff2
│   │   └── licenses/
│   │       ├── ibmplexmono-OFL.txt
│   │       ├── ibmplexsans-OFL.txt
│   │       ├── montserrat-OFL.txt
│   │       ├── pixelifysans-OFL.txt
│   │       ├── pressstart2p-OFL.txt
│   │       └── silkscreen-OFL.txt
│   ├── js/
│   │   ├── app-dialog.js
│   │   ├── app-shell.js
│   │   ├── archive.js
│   │   ├── database.js
│   │   ├── document-api.js
│   │   ├── edit.js
│   │   ├── home-navigation.js
│   │   ├── media-thumbnail.js
│   │   └── url-validation.js
│   ├── media/
│   │   ├── grass-background.webp
│   │   ├── green-arrow.webp
│   │   ├── home-background.webp
│   │   └── icon.webp
│   ├── sw.js
│   ├── 404.html
│   ├── archive.html
│   ├── database.html
│   ├── edit.html
│   ├── exit.html
│   ├── global.html
│   └── home.html
├── tests/
│   ├── api-data-integrity.test.ts
│   ├── app-shell-cache.test.ts
│   ├── archive-breadcrumbs.test.ts
│   ├── archive-layout.test.ts
│   └── image-dimensions.test.ts
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
- Raw SQLite BLOB storage for original image and video uploads with generated gallery thumbnails, fingerprinted browser caching, and byte-range delivery.
- markdown-it for rendering Markdown post descriptions.
- Versioned offline app-shell caching for HTML, CSS, JavaScript, images, and locally hosted WOFF2 fonts, with a cold-start loading screen.
- Database-management table with folder properties for organizing saved posts.
- Archive folder explorer with URL-persistent folder selection, contextual actions, and three-dot Add to folder / Remove from folder post moves.
- Modal editing and creation for title, username, URL, date, media, and description.
- JSON API for document, folder, and media operations.
- Responsive phone, tablet, and desktop layouts with safe-area and virtual-keyboard handling.

## III. Installation

1. Install Bun v1.4.3 or newer, which supports the repository's Bun v2 lockfile.
2. Clone this repository and change into its directory.
3. Run `bun install --frozen-lockfile` to install the locked dependencies.
4. Run `bun test` to verify the isolated data-integrity regression tests.
5. Optionally set `PORT`, `HOST`, and `ROOT` in `.env`.
6. Start the server with `bun run index.ts`.
7. Open `http://localhost:3000` in a modern browser. The offline app shell requires HTTPS or localhost for service-worker registration.
8. Open `http://localhost:3000/database.html` to access the database page.
9. Keep port 3000 on a trusted network, or protect it using authenticated HTTPS access before exposing it publicly. The built-in API does not authenticate write requests.

### Docker Alternative

1. Update the repository on the host with `git pull --ff-only`.
2. Build the image with the native Git revision: `docker build --build-arg BUILD_ID="$(git rev-parse --short=12 HEAD)" -t meditord .`
3. Run the container with the local database mounted: `docker run --rm -p 3000:3000 -v "$(pwd)/database:/app/database" meditord`.
4. Re-run the host Git pull and Docker build commands when deploying new source changes.

## IV. Resources and License

Project design references and development resources are documented in [`RESOURCES.md`](RESOURCES.md).

Original MeditorD material is licensed under the [`LICENSE`](LICENSE) file. Third-party materials retain their own terms as documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
