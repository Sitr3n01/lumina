/**
 * Preload Script - LUMINA Desktop
 * Expõe window.electronAPI ao renderer via contextBridge.
 * NUNCA usar nodeIntegration: true - sempre via preload.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // === BACKEND ===
    /**
     * Retorna o token de auto-login gerado pelo setup wizard, se existir.
     * @returns {Promise<string|null>}
     */
    getAutoLoginToken: () => ipcRenderer.invoke('auth:getAutoLoginToken'),

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

    /**
     * Verifica se o app está configurado para iniciar com o Windows
     * @returns {Promise<boolean>}
     */
    getAutoLaunch: () => ipcRenderer.invoke('app:getAutoLaunch'),

    /**
     * Ativa ou desativa o início automático com o Windows
     * @param {boolean} enabled
     * @returns {Promise<boolean>}
     */
    setAutoLaunch: (enabled) => ipcRenderer.invoke('app:setAutoLaunch', enabled),

    // === WINDOW ===
    /**
     * Minimiza a janela principal
     */
    minimize: () => ipcRenderer.send('window:minimize'),

    /**
     * Esconde a janela principal (não fecha, vai para bandeja)
     */
    close: () => ipcRenderer.send('window:close'),

    /**
     * Encerra o aplicativo completamente
     */
    quit: () => ipcRenderer.send('app:quit'),

    /**
     * Factory reset: remove o .env do userData e relança o app para o wizard
     * @returns {Promise<void>}
     */
    factoryReset: () => ipcRenderer.invoke('app:factoryReset'),

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
     * Verifica manualmente se há atualizações disponíveis no GitHub Releases
     */
    checkForUpdates: () => ipcRenderer.send('update:check'),

    /**
     * Inicia o download da atualização disponível
     * @returns {Promise<void>}
     */
    downloadUpdate: () => ipcRenderer.invoke('update:download'),

    /**
     * Instala a atualização já baixada e reinicia o app
     * @returns {Promise<void>}
     */
    installUpdate: () => ipcRenderer.invoke('update:install'),

    /**
     * Registra callback para quando o download da atualização terminar
     * @param {(info: {version: string}) => void} callback
     */
    onUpdateDownloaded: (callback) => {
        const handler = (_event, info) => callback(info);
        ipcRenderer.on('update:downloaded', handler);
        return () => ipcRenderer.removeListener('update:downloaded', handler);
    },

    /**
     * Registra callback para quando não houver atualização disponível
     * @param {() => void} callback
     */
    onUpdateNotAvailable: (callback) => {
        const handler = (_event) => callback();
        ipcRenderer.on('update:not-available', handler);
        return () => ipcRenderer.removeListener('update:not-available', handler);
    },
});

// === WIZARD API ===
// Exposta separadamente para que wizard.html funcione tanto via wizard-preload.js
// (fluxo legado) quanto via este preload (janela única — mainWindow carrega wizard.html).
contextBridge.exposeInMainWorld('wizardAPI', {
    /** Retorna as configurações padrão para preencher o wizard */
    getDefaultConfig: () => ipcRenderer.invoke('wizard:getDefaults'),

    /** Salva a configuração no arquivo .env do userData */
    saveConfig: (data) => ipcRenderer.invoke('wizard:save', data),

    /** Testa se uma URL iCal é válida */
    testIcalUrl: (url) => ipcRenderer.invoke('wizard:testIcal', url),

    /** Testa a conexão com o servidor de email (SMTP) */
    testEmailConnection: (config) => ipcRenderer.invoke('wizard:testEmail', config),

    /** Finaliza o wizard e sinaliza para iniciar o app principal */
    complete: () => ipcRenderer.invoke('wizard:complete'),

    /** Salva o PDF do template de autorização em userData */
    savePdfTemplate: (pdfArrayBuffer) => ipcRenderer.invoke('wizard:savePdf', pdfArrayBuffer),
});
