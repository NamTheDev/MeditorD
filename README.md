# MeditorD

## I. AI Disclaimer

Built from human ideas with Gemini, DeepSeek, GitHub Copilot, and ChatGPT supporting design, research, implementation, testing, and documentation throughout development.

> Since I have been more educated about the problems with AI, I decided to boycott platforms by companies such as OpenAI, Claude, and Google. I will still use a little bit of AI (maybe more responsible platforms or self-hosted) to assist in coding, but overall I will try to do stuff myself more. This notice is written by a human btw. ***18:12 | Mon, Oct 12 | 2026***

## II. Introduction

MeditorD provides nostalgic, self-hosted Markdown editing and folder-based media archiving.

### Directory

```text
meditord/
├── design/
│   ├── canva/
│   │   ├── 404.png
│   │   ├── home-background.png
│   │   └── home.png
│   ├── chat-logs/
│   │   ├── [GITHUB COPILOT CONVERSATION LOGS]
│   │   ├── [GEMINI CONVERSATION LOGS]
│   │   └── [CHATGPT CONVERSATION LOGS]
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
│   │   ├── [SELF-HOSTED WOFF2 FONT FILES]
│   │   └── licenses/
│   │       └── [FONT FAMILY LICENSE FILES]
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

## III. Installation

1. Install latest version of Bun.
2. Clone the repo and `cd` into it.
3. Install locked dependencies:
```bash
bun install --frozen-lockfile
```
4. Run tests:
```bash
bun test
```
5. Optionally set `PORT`, `HOST`, and `ROOT` in `.env`.
6. Start the server:
```bash
bun run index.ts
```
7. Open `http://localhost:3000`; database page: `http://localhost:3000/database.html`. The offline shell needs HTTPS or localhost.
8. Port 3000 has no auth for writes—keep it trusted or protect it with authenticated HTTPS.

**Docker**

1. Update the host repo:
```bash
git pull --ff-only
```
2. Build the image:
```bash
docker build --build-arg BUILD_ID="$(git rev-parse --short=12 HEAD)" -t meditord .
```
3. Run the container:
```bash
docker run --rm -p 3000:3000 -v "$(pwd)/database:/app/database" meditord
```
4. On updates, re-run the pull and build.

## IV. Resources and License

Project design references and development resources are documented in [`RESOURCES.md`](RESOURCES.md).

Original MeditorD material is licensed under the [`LICENSE`](LICENSE) file. Third-party materials retain their own terms as documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
