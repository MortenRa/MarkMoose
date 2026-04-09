const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  onFileOpened: (callback) => {
    ipcRenderer.removeAllListeners("file-opened");
    ipcRenderer.on("file-opened", (_event, data) => callback(data));
  },
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),
  readFile: (filePath) => ipcRenderer.invoke("read-file", filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke("save-file", filePath, content),
  saveFileDialog: (content) => ipcRenderer.invoke("save-file-dialog", content),
  getVersion: () => ipcRenderer.invoke("get-version"),
  showSavePrompt: () => ipcRenderer.invoke("show-save-prompt"),
  confirmClose: () => ipcRenderer.send("safe-to-close"),
  onMenuSave: (callback) => {
    ipcRenderer.removeAllListeners("menu-save");
    ipcRenderer.on("menu-save", () => callback());
  },
  onMenuAbout: (callback) => {
    ipcRenderer.removeAllListeners("menu-about");
    ipcRenderer.on("menu-about", () => callback());
  },
  onMenuHelp: (callback) => {
    ipcRenderer.removeAllListeners("menu-help");
    ipcRenderer.on("menu-help", () => callback());
  },
  onCheckBeforeClose: (callback) => {
    ipcRenderer.removeAllListeners("check-before-close");
    ipcRenderer.on("check-before-close", () => callback());
  },
});
