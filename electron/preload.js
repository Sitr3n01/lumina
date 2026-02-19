/**
 * Preload Script - LUMINA Desktop
 * Expõe window.electronAPI ao renderer via contextBridge.
 * NUNCA usar nodeIntegration: true - sempre via preload.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // === BACKEND ===
    /**
     * Retorna a URL base do backend (ex: "http://127.0.0.1:8742")
     * @returns {Promise<string>}
     */
    getBackendUrl: () => ipcRenderer.invoke('backend:getUrl'),

    /**
     * Reinicia o processo Python backend
     * @returns {Promise<void>}
     */
    restartBackend: () => ipcRenderer.invoke('backend:restart'),

    /**
     * Retorna status atual do backend
     * @returns {Promise<{ running: boolean, port: number, pid: number }>}
     */
    getBackendStatus: () => ipcRenderer.invoke('backend:status'),

    // === DIALOGS ===
    /**
     * Abre diálogo nativo "Salvar como" e escreve o arquivo
     * @param {{ defaultPath: string, filters: Array<{name: string, extensions: string[]}>, data: number[] }} options
     * @returns {Promise<{ success: boolean, path?: string }>}
     */
    saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),

    /**
     * Mostra diálogo de confirmação nativo do OS
     * @param {{ title: string, message: string, buttons: string[], defaultId?: number, cancelId?: number }} options
     * @returns {Promise<boolean>}
     */
    showConfirmDialog: (options) => ipcRenderer.invoke('dialog:confirm', options),

    // === NOTIFICATIONS ===
    /**
     * Exibe notificação nativa do sistema operacional
     * @param {string} title
     * @param {string} body
     * @returns {Promise<void>}
     */
    showNotification: (title, body) => ipcRenderer.invoke('notification:show', title, body),

    // === APP INFO ===
    /**
     * Retorna a versão do aplicativo
     * @returns {Promise<string>}
     */
    getAppVersion: () => ipcRenderer.invoke('app:version'),

    /**
     * Retorna o caminho userData do Electron
     * @returns {Promise<string>}
     */
    getAppPath: () => ipcRenderer.invoke('app:path'),

    // === WINDOW ===
    /**
     * Minimiza a janela principal
     */
    minimize: () => ipcRenderer.send('window:minimize'),

    /**
     * Esconde a janela principal (não fecha, vai para bandeja)
     */
    close: () => ipcRenderer.send('window:close'),

    // === EVENTS (main → renderer) ===
    /**
     * Registra callback para quando o backend estiver pronto
     * @param {() => void} callback
     */
    onBackendReady: (callback) => {
        const handler = (_event) => callback();
        ipcRenderer.on('backend:ready', handler);
        // Retorna função de cleanup para evitar memory leaks
        return () => ipcRenderer.removeListener('backend:ready', handler);
    },

    /**
     * Registra callback para erros do backend
     * @param {(error: string) => void} callback
     */
    onBackendError: (callback) => {
        const handler = (_event, error) => callback(error);
        ipcRenderer.on('backend:error', handler);
        return () => ipcRenderer.removeListener('backend:error', handler);
    },

    /**
     * Registra callback para quando uma atualização estiver disponível
     * @param {(info: {version: string, releaseNotes: string}) => void} callback
     */
    onUpdateAvailable: (callback) => {
        const handler = (_event, info) => callback(info);
        ipcRenderer.on('update:available', handler);
        return () => ipcRenderer.removeListener('update:available', handler);
    },

    // === UPDATES ===
    /**
     * Inicia o download e instalação da atualização disponível
     * @returns {Promise<void>}
     */
    installUpdate: () => ipcRenderer.invoke('update:install'),
});
