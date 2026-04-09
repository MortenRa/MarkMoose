# MarkMoose Markdown Editor

A desktop Markdown viewer and editor built with Electron + React. Supports `.md` file association on Windows so you can double-click any Markdown file to open it.

## Features

- **Live split-view editor** — Edit markdown on the left, see rendered output on the right
- **Table of contents** — Auto-generated outline sidebar with click-to-scroll navigation
- **File association** — After install, `.md` files open directly in the app
- **Drag & drop** — Drop `.md` files onto the window to open them
- **Native file dialog** — Ctrl+O to open files via the OS file picker
- **Single instance** — Opening a second `.md` file focuses the existing window

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- npm (comes with Node.js)

### Setup

```bash
git clone <repo-url>
cd markmoose
npm install
```

### Development

```bash
npm run dev
```

This starts Vite dev server + Electron concurrently with hot reload.

### Build for Windows

**Installer (.exe with NSIS):**
```bash
npm run build:win
```

**Portable (single .exe, no install needed):**
```bash
npm run build:portable
```

Built files appear in the `release/` directory.

## File Association

The NSIS installer automatically registers `.md` and `.markdown` file associations. After installing:

1. Right-click any `.md` file in Explorer
2. Choose **Open with → MarkMoose**
3. Optionally check "Always use this app" to make it the default

## App Icons

Place your icons in `build-resources/`:

- `icon.ico` — App icon (256×256 recommended)
- `md-icon.ico` — File type icon for `.md` files

If you don't have icons yet, the build will still work but use the default Electron icon.

## Project Structure

```
markmoose/
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js            # Secure IPC bridge
│   ├── renderer.jsx          # React entry point
│   └── MarkdownViewer.jsx    # Main React component
├── build-resources/          # Icons for the installer
├── index.html                # Vite entry HTML
├── vite.config.js            # Vite configuration
├── package.json              # Dependencies + electron-builder config
└── README.md
```

## Distribution

After building, share the installer from `release/`:

- **NSIS installer** — `MarkMoose Setup X.X.X.exe` — full install with Start Menu, Desktop shortcut, file associations
- **Portable** — `MarkMoose-Portable.exe` — single file, no install needed (no file association)

## License

MIT
