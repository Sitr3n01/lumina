/**
 * IPC Handlers - LUMINA Desktop
 * Registra todos os handlers do main process para comunicação com o renderer.
 * Expõe os canais definidos no contrato IPC de docs/PLANO_UNIVERSAL.md.
 */
'use strict';

const { ipcMain, dialog, Notification, app } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Registra todos os handlers IPC
 * @param {Electron.BrowserWindow} mainWindow - Janela principal
 * @param {import('./python-manager')} pythonManager - Gerenciador do backend Python
 */
function registerIpcHandlers(mainWindow, pythonManager) {
    // === BACKEND ===

    /** Retorna a URL completa do backend (ex: "http://127.0.0.1:8742") */
    ipcMain.handle('backend:getUrl', () => {
        return pythonManager.getUrl();
    });

    /** Reinicia o processo Python backend */
    ipcMain.handle('backend:restart', async () => {
        await pythonManager.restart();
        // Notificar renderer que backend foi reiniciado
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('backend:ready');
        }
    });

    /** Retorna status atual do backend */
    ipcMain.handle('backend:status', () => ({
        running: pythonManager.isRunning(),
        port: pythonManager.getPort(),
        pid: pythonManager.getPid(),
    }));

    // === DIALOGS ===

    /** Abre diálogo nativo "Salvar como" e grava o arquivo */
    ipcMain.handle('dialog:saveFile', async (event, options) => {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: options.defaultPath,
            filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
        });

        if (!canceled && filePath) {
            try {
                fs.writeFileSync(filePath, Buffer.from(options.data));
                return { success: true, path: filePath };
            } catch (err) {
                console.error('[IPC] Erro ao salvar arquivo:', err);
                return { success: false, error: err.message };
            }
        }
        return { success: false };
    });

    /** Mostra diálogo de confirmação nativo */
    ipcMain.handle('dialog:confirm', async (event, options) => {
        const { response } = await dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: options.title || 'Confirmar',
            message: options.message,
            buttons: options.buttons || ['Cancelar', 'Confirmar'],
            defaultId: options.defaultId || 0,
            cancelId: options.cancelId || 0,
        });
        // Retorna true se o usuário clicou em qualquer botão que não seja o cancelId
        return response !== (options.cancelId || 0);
    });

    // === NOTIFICATIONS ===

    /** Exibe notificação nativa do sistema */
    ipcMain.handle('notification:show', (event, title, body) => {
        if (Notification.isSupported()) {
            new Notification({ title, body }).show();
        }
    });

    // === APP INFO ===

    /** Retorna a versão do aplicativo */
    ipcMain.handle('app:version', () => app.getVersion());

    /** Retorna o caminho userData do Electron */
    ipcMain.handle('app:path', () => app.getPath('userData'));

    // === WINDOW ===

    /** Minimiza a janela */
    ipcMain.on('window:minimize', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.minimize();
        }
    });

    /** Esconde a janela (vai para a bandeja, não fecha de verdade) */
    ipcMain.on('window:close', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.hide();
        }
    });

    // === UPDATES (placeholder - implementação completa em updater.js) ===

    /** Inicia o download e instalação da atualização */
    ipcMain.handle('update:install', () => {
        // Implementação completa delega para updater.js
        // Por enquanto, noop - será preenchido ao integrar o updater
        console.log('[IPC] update:install chamado');
    });

    console.log('[IPC] Todos os handlers registrados.');
}

module.exports = { registerIpcHandlers };
