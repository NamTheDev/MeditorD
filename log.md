# 08-09-2026
+ Initialized project
+ Used LLM Deepseek's base index.ts code
+ Edited code
+ Used LLM Gemini 3.8 Flash for some references 
+ Created design for 404 - Page Not Found page
> Canva -> LLM Gemini 3.8 Flash -> code (80% accuracy)

# 09-09-2026
+ Fixed public asset and template paths to resolve from the project working directory
+ Replaced the editor page with a not-yet-implemented placeholder linking back home
+ Removed obsolete editor client scripts and unused API client code
+ Removed the unused Remix Icon stylesheet dependency
+ Added callback-based template substitutions to safely render dollar signs in content
+ Secured database document paths against directory traversal
+ Made missing-source renames return 404 responses instead of server errors
+ Updated document and folder creation endpoints to return HTTP 201
+ Added rename result handling so missing items return HTTP 404

# 10-09-2026

+ Updated media assets and centralized background URLs
+ Added home and exit page background artwork
+ Updated home and exit page styling and navigation visuals
+ Added design reference images

## Planned commits

- `chore: stop ignoring tracked media directory` — `.gitignore`
- `docs: record media and page visual updates` — `log.md`
- `remove: delete legacy arrow asset` — `public/arrow.webp`
- `style: update exit page layout and media styling` — `public/css/exit.css`
- `style: centralize page background media URLs` — `public/css/global.css`
- `style: update home page layout and labels` — `public/css/home.css`
- `feat: wire exit page media asset` — `public/exit.html`
- `remove: delete legacy grass asset` — `public/grass.webp`
- `feat: load shared styles and update home labels` — `public/home.html`
- `docs: add 404 design reference` — `design/404.png`
- `docs: add home background design reference` — `design/home-background.png`
- `docs: add home design reference` — `design/home.png`
- `assets: add grass background media` — `public/media/grass-background.webp`
- `assets: add green arrow media` — `public/media/green-arrow.webp`
- `assets: add home background media` — `public/media/home-background.webp`