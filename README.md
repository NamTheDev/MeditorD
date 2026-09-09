MeditorD 📝

🤖 AI Disclaimer

Created with human ideas and design using Google AI Studio's Gemini Flash,
DeepSeek, and GitHub Copilot tools for coding assistance.

📄 Summary

Minimalist local markdown document workspace running on the Bun runtime.

📁 Project Structure

```
meditord/
├── 📁 database/
│   ├── 📄 documents.ts       # Document read, write, and directory management
│   └── 📄 index.ts           # Storage initialization and method exports
├── 📁 functions/
│   ├── 📄 api.ts             # REST API endpoint handlers
│   ├── 📄 file.ts            # Local file resolution helpers
│   ├── 📄 render.ts          # Server-side HTML template compiler
│   └── 📄 string.ts          # Path normalization utilities
├── 📁 public/
│   ├── 📁 css/
│   │   ├── 📄 404.css        # Error page layout
│   │   ├── 📄 exit.css       # Exit page styling
│   │   ├── 📄 global.css     # Global palette, typography, and theme variables
│   │   └── 📄 home.css       # Landing page styling
│   ├── 📄 404.html           # Route not found template
│   ├── 📄 edit.html          # Editor placeholder template
│   ├── 📄 exit.html          # Alternative exit screen
│   ├── 📄 global.html        # Master page wrapper
│   ├── 📄 home.html          # Main navigation dashboard
│   ├── 🖼️ arrow.webp         # Navigation vector asset
│   └── 🖼️ grass.webp         # Background graphics asset
├── 📄 config.ts              # Port, host, and public folder environment variables
├── 📄 index.ts               # Bun HTTP server and static asset router
├── 📄 package.json           # Runtime dependencies and metadata
└── 📄 tsconfig.json          # TypeScript compiler options
```

⚙️ Installation & Configuration

1. Prerequisites

Ensure Bun (v1.0 or newer) is installed on your system.

2. Install Dependencies

bun install

3. Configure Environment

Create a .env file in the project root to override default settings (optional):

PORT=3000
HOST=0.0.0.0
ROOT=./public

4. Run the Server

Start the local server:

bun run index.ts

Open your browser at http://localhost:3000.
