# MarkMoose Markdown Editor

A fast, beautiful desktop Markdown editor with live preview, tabs, dark mode, syntax highlighting, Mermaid diagrams, and more. Built with Electron + React.

<a href="https://get.microsoft.com/installer/download/9njpg77756d4?referrer=appbadge" target="_self">
	<img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200"/>
</a>

## Features

- **Live split-view editor** — Edit on the left, see rendered output on the right with synchronized scrolling
- **Draggable split divider** — Resize editor and preview to your preference
- **Tabs** — Open multiple documents at once
- **Table of contents** — Auto-generated outline sidebar with click-to-navigate
- **Dark mode** — Easy on the eyes, with persistent preference
- **Editor formatting toolbar** — Bold, italic, headings, links, code, lists, tables and more
- **Syntax highlighting** — 180+ languages via highlight.js
- **Mermaid diagrams** — Flowcharts, sequence diagrams, Gantt charts, and more
- **GitHub-style alerts** — NOTE, TIP, IMPORTANT, WARNING, CAUTION
- **Footnotes** — References with back-links
- **YAML frontmatter** — Rendered as a styled metadata table
- **LaTeX math** — Inline `$...$` and block `$$...$$` via KaTeX
- **Save prompt** — Warns before closing unsaved work
- **Drag & drop** — Drop `.md` files onto the window to open them
- **File association** — After install, `.md` files open directly in MarkMoose
- **Word and line count**

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save file |
| Ctrl+O | Open file |
| Ctrl+N | New window |
| Ctrl+B | Bold selection |
| Ctrl+I | Italic selection |
| Ctrl+K | Insert link |

## Screenshots

| Light Mode | Dark Mode |
|------------|-----------|
| ![Light mode split view](screenshots/light.png) | ![Dark mode preview](screenshots/dark.png) |

## Install

### Microsoft Store

<a href="https://get.microsoft.com/installer/download/9njpg77756d4?referrer=appbadge" target="_self">
	<img src="https://get.microsoft.com/images/en-us%20dark.svg" width="200"/>
</a>

### Direct Download

- **[NSIS Installer](https://github.com/MortenRa/MarkMoose/releases)** — Full install with Start Menu, Desktop shortcut, and `.md` file associations
- **[Portable](https://github.com/MortenRa/MarkMoose/releases)** — Single .exe, no install needed

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- npm (comes with Node.js)

### Setup

```bash
git clone https://github.com/MortenRa/MarkMoose.git
cd MarkMoose
npm install
```

### Run

Start Vite and Electron in separate terminals:

```bash
npx vite
```

```bash
npx electron .
```

### Build

```bash
# NSIS installer
npm run build:win

# Portable executable
npm run build:portable

# Microsoft Store (AppX)
npm run build:appx
```

Built files appear in the `release/` directory.

## Project Structure

```
MarkMoose/
├── src/
│   ├── main.js              # Electron main process
│   ├── preload.js            # Secure IPC bridge
│   ├── renderer.jsx          # React entry point
│   ├── MarkdownViewer.jsx    # Main React component
│   └── splash.html           # Splash screen
├── build-resources/          # App icons
├── index.html                # Vite entry HTML
├── vite.config.js            # Vite configuration
├── package.json              # Dependencies + electron-builder config
└── README.md
```

## Privacy Policy

MarkMoose does not collect, store, transmit, or share any personal data or usage information. The application runs entirely offline on your device. No files are uploaded to any server. No third-party services, analytics, or advertising are used.

## License

MIT — see [LICENSE](LICENSE) for details.

## Author

Morten Rasmussen
