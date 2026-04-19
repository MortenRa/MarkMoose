const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

function activate(context) {
  const command = vscode.commands.registerCommand('markmoose.openEditor', (uri) => {
    // Get the file to open
    let fileUri = uri;
    if (!fileUri && vscode.window.activeTextEditor) {
      fileUri = vscode.window.activeTextEditor.document.uri;
    }

    const panel = vscode.window.createWebviewPanel(
      'markmooseEditor',
      fileUri ? `MarkMoose: ${path.basename(fileUri.fsPath)}` : 'MarkMoose: New File',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'media')),
          vscode.Uri.file(path.join(context.extensionPath, 'node_modules')),
        ],
      }
    );

    const extensionPath = context.extensionPath;
    panel.iconPath = vscode.Uri.file(path.join(extensionPath, 'media', 'icon.png'));

    // Build URIs for webview resources
    const mediaUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'media')));
    const nodeModulesUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'node_modules')));

    // Read initial file content
    let initialContent = '';
    let filePath = '';
    let fileName = '';
    if (fileUri) {
      try {
        initialContent = fs.readFileSync(fileUri.fsPath, 'utf-8');
        filePath = fileUri.fsPath;
        fileName = path.basename(fileUri.fsPath);
      } catch {}
    }

    panel.webview.html = getWebviewContent(panel.webview, extensionPath, initialContent, filePath, fileName);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'save': {
          const saveUri = message.filePath
            ? vscode.Uri.file(message.filePath)
            : await vscode.window.showSaveDialog({
                filters: { 'Markdown': ['md', 'markdown'], 'All Files': ['*'] },
                defaultUri: fileUri,
              });
          if (saveUri) {
            fs.writeFileSync(saveUri.fsPath, message.content, 'utf-8');
            filePath = saveUri.fsPath;
            fileName = path.basename(saveUri.fsPath);
            panel.title = `MarkMoose: ${fileName}`;
            panel.webview.postMessage({ command: 'saved', filePath: saveUri.fsPath, fileName });
          }
          break;
        }
        case 'saveAs': {
          const saveUri = await vscode.window.showSaveDialog({
            filters: { 'Markdown': ['md', 'markdown'], 'All Files': ['*'] },
            defaultUri: fileUri ? vscode.Uri.file(fileUri.fsPath) : undefined,
          });
          if (saveUri) {
            fs.writeFileSync(saveUri.fsPath, message.content, 'utf-8');
            filePath = saveUri.fsPath;
            fileName = path.basename(saveUri.fsPath);
            panel.title = `MarkMoose: ${fileName}`;
            panel.webview.postMessage({ command: 'saved', filePath: saveUri.fsPath, fileName });
          }
          break;
        }
        case 'exportPdf': {
          vscode.window.showInformationMessage('Export to PDF is not supported in the VS Code extension. Use the desktop app for PDF export.');
          break;
        }
        case 'openImage': {
          const imageUri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: false,
            filters: { 'Images': ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'] },
          });
          if (imageUri && imageUri[0]) {
            panel.webview.postMessage({ command: 'imageSelected', path: imageUri[0].fsPath });
          }
          break;
        }
      }
    });
  });

  context.subscriptions.push(command);
}

function getWebviewContent(webview, extensionPath, initialContent, filePath, fileName) {
  const katexCssUri = webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'node_modules', 'katex', 'dist', 'katex.min.css')));
  const iconUri = webview.asWebviewUri(vscode.Uri.file(path.join(extensionPath, 'media', 'icon.png')));

  // Read the parser
  const parserCode = fs.readFileSync(path.join(extensionPath, 'src', 'parser-bundle.js'), 'utf-8');

  // Escape content for embedding
  const escapedContent = JSON.stringify(initialContent);
  const escapedFilePath = JSON.stringify(filePath);
  const escapedFileName = JSON.stringify(fileName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${katexCssUri}">
  <style>${getStyles()}</style>
</head>
<body>
  <div id="app"></div>
  <script>${parserCode}</script>
  <script>${getAppScript(escapedContent, escapedFilePath, escapedFileName, iconUri)}</script>
</body>
</html>`;
}

function getStyles() {
  return `
    :root {
      --mm-bg: #fafaf8; --mm-surface: #ffffff; --mm-surface-alt: #f5f4f0;
      --mm-text: #2c2a25; --mm-text-sec: #6b6860; --mm-text-ter: #9d998f;
      --mm-border: #e4e2dd; --mm-accent: #c45d35; --mm-accent-bg: #fdf0eb;
      --mm-link: #b04d28; --mm-code-bg: #1e1e1e; --mm-code-text: #d4d4d4;
      --mm-inline-bg: #f0efeb; --mm-inline-text: #c45d35;
      --mm-toolbar-bg: #ffffff; --mm-toolbar-btn: #f5f4f0; --mm-toolbar-active: #ffffff;
      --mm-tab-bg: #f5f4f0; --mm-tab-active: #ffffff;
    }
    body.dark {
      --mm-bg: #1a1f25; --mm-surface: #2A3A4A; --mm-surface-alt: #243242;
      --mm-text: #E6E7E8; --mm-text-sec: #a0a8b4; --mm-text-ter: #6b7a8a;
      --mm-border: #3d5060; --mm-accent: #F18A00; --mm-accent-bg: #3d2f1a;
      --mm-link: #5A95CE; --mm-code-bg: #0d1117; --mm-code-text: #d4d4d4;
      --mm-inline-bg: #2d3a4a; --mm-inline-text: #F18A00;
      --mm-toolbar-bg: #2A3A4A; --mm-toolbar-btn: rgba(255,255,255,0.08); --mm-toolbar-active: rgba(255,255,255,0.15);
      --mm-tab-bg: #243242; --mm-tab-active: #1a1f25;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #app { width: 100%; height: 100vh; overflow: hidden; }

    body {
      font-family: 'DM Sans', 'Segoe UI', sans-serif;
      color: var(--mm-text);
      background: var(--mm-bg);
    }

    #app { display: flex; flex-direction: column; }

    .toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 12px; height: 44px; min-height: 44px;
      background: var(--mm-toolbar-bg); border-bottom: 1px solid var(--mm-border);
      font-size: 12px;
    }
    .toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 8px; }
    .toolbar-center { display: flex; gap: 2px; background: var(--mm-toolbar-btn); border-radius: 6px; padding: 2px; }

    .mode-btn {
      background: transparent; border: none; cursor: pointer; padding: 4px 12px;
      border-radius: 5px; font-size: 12px; font-weight: 500; color: var(--mm-text-sec);
    }
    .mode-btn.active { background: var(--mm-toolbar-active); color: var(--mm-text); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }

    .icon-btn {
      background: none; border: none; cursor: pointer; padding: 5px;
      color: var(--mm-text-sec); display: flex; align-items: center;
      border-radius: 4px;
    }
    .icon-btn:hover { background: var(--mm-toolbar-btn); }

    .save-btn {
      background: var(--mm-accent); color: #fff;
      border: none; border-radius: 6px; padding: 4px 12px; font-size: 12px; font-weight: 600;
      cursor: pointer; display: flex; align-items: center; gap: 4px;
    }

    .stats { font-size: 11px; color: var(--mm-text-ter); font-family: 'IBM Plex Mono', monospace; }
    .file-name { font-size: 11px; color: var(--mm-text-ter); font-family: 'IBM Plex Mono', monospace; }

    .fmt-bar {
      display: flex; align-items: center; gap: 2px; padding: 3px 8px;
      background: var(--mm-surface-alt); border-bottom: 1px solid var(--mm-border);
      min-height: 30px; flex-wrap: wrap;
    }
    .fmt-btn {
      background: none; border: none; cursor: pointer; padding: 3px 6px;
      color: var(--mm-text-sec); border-radius: 4px; font-size: 12px;
      display: flex; align-items: center; justify-content: center; min-width: 26px; height: 24px;
    }
    .fmt-btn:hover { background: var(--mm-toolbar-btn); }
    .fmt-sep { width: 1px; height: 14px; background: var(--mm-border); margin: 0 3px; }

    .main { display: flex; flex: 1; overflow: hidden; }

    .toc {
      width: 200px; min-width: 200px; overflow: auto;
      background: var(--mm-surface-alt); border-right: 1px solid var(--mm-border);
    }
    .toc-header {
      padding: 12px 12px 6px; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em; color: var(--mm-text-ter);
    }
    .toc-item {
      display: flex; align-items: center; gap: 6px; width: 100%;
      background: none; border: none; cursor: pointer; padding: 4px 10px;
      text-align: left; font-size: 12px; color: var(--mm-text-sec);
    }
    .toc-item:hover { background: var(--mm-surface); }
    .toc-level { font-size: 9px; font-weight: 700; color: var(--mm-accent); min-width: 16px; font-family: 'IBM Plex Mono', monospace; }
    .toc-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .editor-pane { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
    .editor {
      flex: 1; width: 100%; resize: none; border: none; outline: none;
      padding: 16px 24px; font-size: 14px; line-height: 1.7;
      font-family: 'IBM Plex Mono', monospace;
      color: var(--mm-text); background: var(--mm-bg);
      min-height: 0; overflow: auto;
    }

    .preview-pane { flex: 1; overflow: auto; background: var(--mm-bg); }
    .preview { padding: 20px 32px; }

    .split-handle {
      width: 5px; cursor: col-resize;
      background: var(--mm-border); flex-shrink: 0;
    }
    .split-handle:hover { background: var(--mm-accent); }

    /* Markdown preview styles */
    .preview h1 { font-family: 'Source Serif 4', Georgia, serif; font-size: 2em; font-weight: 700; margin: 28px 0 12px; color: var(--mm-text); letter-spacing: -0.02em; line-height: 1.2; }
    .preview h2 { font-family: 'Source Serif 4', Georgia, serif; font-size: 1.5em; font-weight: 600; margin: 24px 0 10px; color: var(--mm-text); border-bottom: 1px solid var(--mm-border); padding-bottom: 6px; }
    .preview h3 { font-size: 1.2em; font-weight: 600; margin: 20px 0 8px; color: var(--mm-text); }
    .preview h4, .preview h5, .preview h6 { font-size: 1.05em; font-weight: 600; margin: 16px 0 6px; color: var(--mm-text-sec); }
    .preview p { font-family: 'Source Serif 4', Georgia, serif; font-size: 1.05em; line-height: 1.75; margin: 8px 0; color: var(--mm-text); }
    .preview strong { font-weight: 700; }
    .preview em { font-style: italic; }
    .preview del { text-decoration: line-through; opacity: 0.6; }

    .preview a { color: var(--mm-link); text-decoration: underline; text-underline-offset: 2px; }

    .preview pre.code-block {
      background: var(--mm-code-bg); color: var(--mm-code-text); padding: 16px 20px;
      border-radius: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 0.88em;
      line-height: 1.6; overflow-x: auto; margin: 14px 0; position: relative;
    }
    .preview pre.code-block::before {
      content: attr(data-lang); position: absolute; top: 8px; right: 12px;
      font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.08em; color: #888;
    }
    .preview code.inline-code {
      background: var(--mm-inline-bg); color: var(--mm-inline-text); padding: 2px 6px;
      border-radius: 4px; font-family: 'IBM Plex Mono', monospace; font-size: 0.9em;
    }

    .preview blockquote.md-quote {
      border-left: 3px solid var(--mm-accent); padding: 10px 16px; margin: 12px 0;
      background: var(--mm-accent-bg); border-radius: 0 6px 6px 0;
      font-family: 'Source Serif 4', Georgia, serif; font-style: italic; color: var(--mm-text-sec);
    }

    .preview .md-alert { padding: 12px 16px; margin: 12px 0; border-radius: 6px; border-left: 4px solid; }
    .preview .md-alert-title { font-weight: 700; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; display: block; }
    .preview .md-alert-body { font-size: 0.95em; margin: 0; }
    .preview .md-alert-note { border-color: #336FB9; background: rgba(51,111,185,0.1); }
    .preview .md-alert-note .md-alert-title { color: #336FB9; }
    .preview .md-alert-tip { border-color: #65AE20; background: rgba(101,174,32,0.1); }
    .preview .md-alert-tip .md-alert-title { color: #65AE20; }
    .preview .md-alert-important { border-color: #7c3aed; background: rgba(124,58,237,0.1); }
    .preview .md-alert-important .md-alert-title { color: #7c3aed; }
    .preview .md-alert-warning { border-color: #F18A00; background: rgba(241,138,0,0.1); }
    .preview .md-alert-warning .md-alert-title { color: #F18A00; }
    .preview .md-alert-caution { border-color: #dc2626; background: rgba(220,38,38,0.1); }
    .preview .md-alert-caution .md-alert-title { color: #dc2626; }

    .preview ul, .preview ol { padding-left: 24px; margin: 8px 0; }
    .preview li { font-family: 'Source Serif 4', Georgia, serif; font-size: 1.05em; line-height: 1.7; margin: 3px 0; color: var(--mm-text); }
    .preview .task { font-size: 0.95em; padding: 4px 0; color: var(--mm-text-sec); }
    .preview .task.done { text-decoration: line-through; color: var(--mm-text-ter); }

    .preview table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 0.92em; }
    .preview th { background: var(--mm-surface-alt); padding: 10px 14px; text-align: left; font-weight: 600; border: 1px solid var(--mm-border); color: var(--mm-text); }
    .preview td { padding: 9px 14px; border: 1px solid var(--mm-border); color: var(--mm-text); }

    .preview hr { border: none; border-top: 2px solid var(--mm-border); margin: 24px 0; }

    .preview .md-fnref a { color: var(--mm-accent); font-weight: 700; text-decoration: none; }
    .preview .md-footnotes { font-size: 0.9em; color: var(--mm-text-sec); }

    .preview .md-frontmatter { margin-bottom: 20px; padding: 12px 16px; background: var(--mm-surface-alt); border-radius: 8px; border: 1px solid var(--mm-border); }
    .preview .md-frontmatter table { margin: 0; font-size: 0.85em; }
    .preview .md-frontmatter td { border: none; padding: 4px 12px 4px 0; }

    .preview .md-math-block { margin: 14px 0; padding: 16px; text-align: center; overflow-x: auto; }
    .preview .md-math-error { color: #dc2626; font-family: 'IBM Plex Mono', monospace; font-size: 0.85em; }

    .preview .mermaid-block { margin: 14px 0; padding: 16px 32px; background: var(--mm-surface); border-radius: 8px; border: 1px solid var(--mm-border); text-align: center; overflow-x: auto; }
    .preview .mermaid-block svg { height: auto; padding: 8px 16px; }
    .preview .mermaid-block .node foreignObject { overflow: visible; }
    .preview .mermaid-block .nodeLabel { overflow: visible; white-space: nowrap; }
    .preview .mermaid-error { color: #dc2626; font-family: 'IBM Plex Mono', monospace; font-size: 0.85em; padding: 8px; }

    .hljs { color: #d4d4d4; }
    .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-section { color: #569cd6; }
    .hljs-string, .hljs-meta-string { color: #ce9178; }
    .hljs-number { color: #b5cea8; }
    .hljs-comment, .hljs-quote { color: #6a9955; font-style: italic; }
    .hljs-function, .hljs-title { color: #dcdcaa; }
    .hljs-params { color: #9cdcfe; }
    .hljs-type, .hljs-built_in { color: #4ec9b0; }
    .hljs-attr, .hljs-variable { color: #9cdcfe; }

    .about-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.5); backdropFilter: blur(4px);
      display: flex; align-items: center; justify-content: center;
    }
    .about-box {
      background: var(--mm-surface); border-radius: 12px;
      padding: 32px 44px; display: flex; flex-direction: column; align-items: center;
      border: 1px solid var(--mm-border); min-width: 260px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.2);
    }
    .about-close {
      background: var(--mm-accent); color: #fff;
      border: none; border-radius: 6px; padding: 7px 24px; font-size: 12px; font-weight: 600;
      cursor: pointer; margin-top: 14px;
    }

    ::-webkit-scrollbar { width: 7px; height: 7px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--mm-border); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--mm-text-ter); }
  `;
}

function getAppScript(content, filePath, fileName, iconUri) {
  return `
(function() {
  const vscode = acquireVsCodeApi();
  let md = ${content};
  let currentFilePath = ${filePath};
  let currentFileName = ${fileName};
  let dirty = false;
  let mode = 'split';
  let tocOpen = true;
  let splitPos = 50;
  let showAbout = false;
  let dragging = false;

  const app = document.getElementById('app');

  function render() {
    const headings = extractHeadings(md);
    const html = parseMd(md);
    const words = md.trim() ? md.trim().split(/\\s+/).length : 0;
    const lines = md.split('\\n').length;
    const titleDisplay = currentFileName ? (currentFileName + (dirty ? ' *' : '')) : (dirty ? 'Untitled *' : 'Untitled');

    app.innerHTML = \`
      \${showAbout ? \`
        <div class="about-overlay" onclick="window._closeAbout()">
          <div class="about-box" onclick="event.stopPropagation()">
            <img src="${iconUri}" width="64" height="64" style="margin-bottom:8px;object-fit:contain">
            <div style="font-size:18px;font-weight:700;margin-bottom:4px">MarkMoose</div>
            <div style="font-size:12px;color:var(--vscode-descriptionForeground);margin-bottom:4px">Markdown Editor — VS Code Extension</div>
            <div style="font-size:11px;color:var(--vscode-descriptionForeground);margin-bottom:8px">v1.0.0 by Morten Rasmussen</div>
            <button class="about-close" onclick="window._closeAbout()">Close</button>
          </div>
        </div>
      \` : ''}
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="icon-btn" onclick="window._toggleToc()" title="Toggle outline">&#9776;</button>
          <span style="font-weight:600;font-size:13px">MarkMoose</span>
          <span class="file-name">\${titleDisplay}</span>
        </div>
        <div class="toolbar-center">
          <button class="mode-btn \${mode==='edit'?'active':''}" onclick="window._setMode('edit')">Edit</button>
          <button class="mode-btn \${mode==='split'?'active':''}" onclick="window._setMode('split')">Split</button>
          <button class="mode-btn \${mode==='preview'?'active':''}" onclick="window._setMode('preview')">Preview</button>
        </div>
        <div class="toolbar-right">
          <span class="stats">\${words} words · \${lines} lines</span>
          <button class="icon-btn" onclick="window._toggleDark()" title="Toggle dark mode">\${document.body.classList.contains('dark') ? '&#9788;' : '&#9789;'}</button>
          <button class="icon-btn" onclick="window._showAbout()" title="About">&#9432;</button>
          <button class="save-btn" onclick="window._save()" title="Save (Ctrl+S)">Save</button>
        </div>
      </div>
      \${mode === 'edit' || mode === 'split' ? \`
        <div class="fmt-bar">
          <button class="fmt-btn" style="font-weight:700" onclick="window._fmt('bold')" title="Bold (Ctrl+B)">B</button>
          <button class="fmt-btn" style="font-style:italic" onclick="window._fmt('italic')" title="Italic (Ctrl+I)">I</button>
          <button class="fmt-btn" style="text-decoration:line-through" onclick="window._fmt('strike')" title="Strikethrough">S</button>
          <button class="fmt-btn" style="font-size:10px;font-weight:700" onclick="window._fmt('h1')" title="Heading 1">H1</button>
          <button class="fmt-btn" style="font-size:10px;font-weight:700" onclick="window._fmt('h2')" title="Heading 2">H2</button>
          <button class="fmt-btn" style="font-size:10px;font-weight:700" onclick="window._fmt('h3')" title="Heading 3">H3</button>
          <div class="fmt-sep"></div>
          <button class="fmt-btn" onclick="window._fmt('link')" title="Link (Ctrl+K)">&#128279;</button>
          <button class="fmt-btn" onclick="window._fmt('image')" title="Image">&#128444;</button>
          <button class="fmt-btn" style="font-size:10px;font-family:monospace" onclick="window._fmt('code')" title="Inline code">&lt;/&gt;</button>
          <button class="fmt-btn" style="font-size:11px;font-family:monospace" onclick="window._fmt('codeblock')" title="Code block">{}</button>
          <div class="fmt-sep"></div>
          <button class="fmt-btn" onclick="window._fmt('ul')" title="Bullet list">&#8226;</button>
          <button class="fmt-btn" onclick="window._fmt('ol')" title="Numbered list">1.</button>
          <button class="fmt-btn" onclick="window._fmt('task')" title="Task list">&#9745;</button>
          <div class="fmt-sep"></div>
          <button class="fmt-btn" onclick="window._fmt('quote')" title="Blockquote">&#10077;</button>
          <button class="fmt-btn" onclick="window._fmt('hr')" title="Horizontal rule">&#8213;</button>
          <button class="fmt-btn" onclick="window._fmt('table')" title="Table">&#8801;</button>
        </div>
      \` : ''}
      <div class="main" id="mainArea">
        \${tocOpen && headings.length > 0 ? \`
          <div class="toc">
            <div class="toc-header">Outline</div>
            \${headings.map((h, i) => \`
              <button class="toc-item" style="padding-left:\${8 + (h.level-1)*12}px" onclick="window._scrollTo('\${h.text.replace(/'/g,"\\\\'")}')">
                <span class="toc-level">H\${h.level}</span>
                <span class="toc-text" style="font-weight:\${h.level<=2?600:400}">\${h.text}</span>
              </button>
            \`).join('')}
          </div>
        \` : ''}
        \${mode === 'edit' || mode === 'split' ? \`
          <div class="editor-pane" style="\${mode === 'split' ? 'width:'+splitPos+'%;flex:none' : ''}">
            <textarea class="editor" id="editorArea" oninput="window._onChange()" spellcheck="false" placeholder="Type or paste markdown here..."></textarea>
          </div>
        \` : ''}
        \${mode === 'split' ? '<div class="split-handle" id="splitHandle"></div>' : ''}
        \${mode === 'preview' || mode === 'split' ? \`
          <div class="preview-pane" id="previewPane" style="\${mode === 'split' ? 'width:'+(100-splitPos)+'%' : ''}">
            <div class="preview">\${html}</div>
          </div>
        \` : ''}
      </div>
    \`;

    // Set editor value without triggering onInput
    const editor = document.getElementById('editorArea');
    if (editor && editor.value !== md) {
      editor.value = md;
    }

    // Render mermaid
    renderMermaid();

    // Setup split handle drag
    setupSplitDrag();
  }

  function renderMermaid() {
    if (typeof mermaid === 'undefined') return;
    document.querySelectorAll('.mermaid-block[data-chart]').forEach(async (el, i) => {
      try {
        const chart = decodeURIComponent(el.dataset.chart);
        const id = 'mm-' + Date.now() + '-' + i;
        const { svg } = await mermaid.render(id, chart);
        el.innerHTML = svg;
        el.removeAttribute('data-chart');
      } catch (err) {
        el.innerHTML = '<div class="mermaid-error">Diagram error: ' + (err.message || 'invalid') + '</div>';
        el.removeAttribute('data-chart');
      }
    });
  }

  function setupSplitDrag() {
    const handle = document.getElementById('splitHandle');
    const main = document.getElementById('mainArea');
    if (!handle || !main) return;
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      dragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
  }

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const main = document.getElementById('mainArea');
    if (!main) return;
    const rect = main.getBoundingClientRect();
    const tocW = tocOpen ? 200 : 0;
    const avail = rect.width - tocW;
    const x = e.clientX - rect.left - tocW;
    splitPos = Math.max(20, Math.min(80, (x / avail) * 100));
    render();
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  // Global handlers
  window._setMode = (m) => { mode = m; render(); };
  window._toggleToc = () => { tocOpen = !tocOpen; render(); };
  window._toggleDark = () => { document.body.classList.toggle('dark'); render(); };
  window._showAbout = () => { showAbout = true; render(); };
  window._closeAbout = () => { showAbout = false; render(); };

  window._onChange = () => {
    const editor = document.getElementById('editorArea');
    if (editor) { md = editor.value; dirty = true; render(); }
  };

  window._save = () => {
    vscode.postMessage({ command: 'save', content: md, filePath: currentFilePath });
  };

  window._fmt = (action) => {
    const ta = document.getElementById('editorArea');
    if (!ta) return;
    const val = ta.value;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    let newVal, newS, newE;

    switch(action) {
      case 'bold': newVal = val.substring(0,s)+'**'+val.substring(s,e)+'**'+val.substring(e); newS=s+2; newE=e+2; break;
      case 'italic': newVal = val.substring(0,s)+'*'+val.substring(s,e)+'*'+val.substring(e); newS=s+1; newE=e+1; break;
      case 'strike': newVal = val.substring(0,s)+'~~'+val.substring(s,e)+'~~'+val.substring(e); newS=s+2; newE=e+2; break;
      case 'h1': { const ls = val.lastIndexOf('\\n',s-1)+1; newVal=val.substring(0,ls)+'# '+val.substring(ls); newS=s+2; newE=e+2; break; }
      case 'h2': { const ls = val.lastIndexOf('\\n',s-1)+1; newVal=val.substring(0,ls)+'## '+val.substring(ls); newS=s+3; newE=e+3; break; }
      case 'h3': { const ls = val.lastIndexOf('\\n',s-1)+1; newVal=val.substring(0,ls)+'### '+val.substring(ls); newS=s+4; newE=e+4; break; }
      case 'link': { const sel=val.substring(s,e)||'text'; newVal=val.substring(0,s)+'['+sel+'](url)'+val.substring(e); newS=s+sel.length+3; newE=newS+3; break; }
      case 'image': { vscode.postMessage({command:'openImage'}); return; }
      case 'code': newVal = val.substring(0,s)+'\`'+val.substring(s,e)+'\`'+val.substring(e); newS=s+1; newE=e+1; break;
      case 'codeblock': { const t='\\n\`\`\`\\n\\n\`\`\`\\n'; newVal=val.substring(0,s)+t+val.substring(s); newS=s+5; newE=s+5; break; }
      case 'ul': { const ls=val.lastIndexOf('\\n',s-1)+1; newVal=val.substring(0,ls)+'- '+val.substring(ls); newS=s+2; newE=e+2; break; }
      case 'ol': { const ls=val.lastIndexOf('\\n',s-1)+1; newVal=val.substring(0,ls)+'1. '+val.substring(ls); newS=s+3; newE=e+3; break; }
      case 'task': { const ls=val.lastIndexOf('\\n',s-1)+1; newVal=val.substring(0,ls)+'- [ ] '+val.substring(ls); newS=s+6; newE=e+6; break; }
      case 'quote': { const ls=val.lastIndexOf('\\n',s-1)+1; newVal=val.substring(0,ls)+'> '+val.substring(ls); newS=s+2; newE=e+2; break; }
      case 'hr': newVal=val.substring(0,s)+'\\n---\\n'+val.substring(s); newS=s+5; newE=s+5; break;
      case 'table': { const t='\\n| Column 1 | Column 2 |\\n| --- | --- |\\n| Cell | Cell |\\n'; newVal=val.substring(0,s)+t+val.substring(s); newS=s+t.length; newE=newS; break; }
      default: return;
    }
    md = newVal;
    dirty = true;
    ta.value = newVal;
    ta.selectionStart = newS;
    ta.selectionEnd = newE;
    ta.focus();
    render();
  };

  window._scrollTo = (text) => {
    const cleanId = text.replace(/[^\\w\\s-]/g, '').trim();
    const el = document.querySelector('[id="' + CSS.escape(cleanId) + '"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (mode === 'edit') { mode = 'split'; render(); }
  };

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); window._save(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); window._fmt('bold'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); window._fmt('italic'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); window._fmt('link'); }
  });

  // Handle messages from extension
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg.command === 'saved') {
      currentFilePath = msg.filePath;
      currentFileName = msg.fileName;
      dirty = false;
      render();
    }
    if (msg.command === 'imageSelected') {
      const ta = document.getElementById('editorArea');
      if (ta) {
        const name = msg.path.replace(/\\\\\\\\/g, '/').split('/').pop();
        const insert = '![' + name + '](' + msg.path.replace(/\\\\\\\\/g, '/') + ')';
        const s = ta.selectionStart;
        md = md.substring(0, s) + insert + md.substring(s);
        dirty = true;
        ta.value = md;
        ta.selectionStart = ta.selectionEnd = s + insert.length;
        ta.focus();
        render();
      }
    }
  });

  // Load mermaid from CDN
  const mermaidScript = document.createElement('script');
  mermaidScript.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
  mermaidScript.onload = () => {
    const isDark = document.body.classList.contains('vscode-dark') || document.body.classList.contains('vscode-high-contrast');
    mermaid.initialize({ startOnLoad: false, theme: isDark ? 'dark' : 'default', flowchart: { useMaxWidth: false, padding: 20, nodeSpacing: 50, rankSpacing: 50 } });
    renderMermaid();
  };
  document.head.appendChild(mermaidScript);

  // Auto-detect dark mode from VS Code theme
  if (document.body.classList.contains('vscode-dark') || document.body.classList.contains('vscode-high-contrast')) {
    document.body.classList.add('dark');
  }

  // Load Google Fonts for MarkMoose styling
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap';
  document.head.appendChild(fontLink);

  // Initial render
  render();
})();
  `;
}

function deactivate() {}

module.exports = { activate, deactivate };
