/**
 * Auto Updater - LUMINA Desktop
 * Gerencia atualizações automáticas via electron-updater (GitHub Releases).
 */
'use strict';

const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

/**
 * Configura e inicializa o auto-updater
 * @param {Electron.BrowserWindow} mainWindow - Janela principal para envio de eventos
 */
function setupAutoUpdater(mainWindow) {
    // Usar electron-log para logs do updater (não console.log em produção)
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';

    // Não baixar automaticamente - perguntar ao usuário primeiro
    autoUpdater.autoDownload = false;

    // Instalar automaticamente ao sair do app
    autoUpdater.autoInstallOnAppQuit = true;

    // === EVENTOS DO UPDATER ===

    autoUpdater.on('checking-for-update', () => {
        log.info('[Updater] Verificando atualizações...');
    });

    autoUpdater.on('update-available', (info) => {
        log.info('[Updater] Atualização disponível:', info.version);
        // Notificar o renderer para mostrar banner de atualização
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update:available', {
                version: info.version,
                releaseNotes: info.releaseNotes || '',
            });
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        log.info('[Updater] Nenhuma atualização disponível.', info.version);
    });

    autoUpdater.on('error', (err) => {
        log.error('[Updater] Erro ao verificar atualizações:', err);
        // Erros do updater são silenciosos para o usuário (apenas log)
    });

    autoUpdater.on('download-progress', (progressObj) => {
        const speed = Math.round(progressObj.bytesPerSecond / 1024);
        const percent = Math.round(progressObj.percent);
        log.info(`[Updater] Download: ${percent}% (${speed} KB/s)`);
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('[Updater] Atualização baixada:', info.version);
        // Notificar renderer para que o usuário escolha quando instalar
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update:downloaded', {
                version: info.version,
            });
        }
    });

    // Verificar atualizações 30 segundos após o startup
    // (delay para não impactar a inicialização do app)
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch((err) => {
            // Ignorar erros silenciosamente (ex: sem GitHub Releases configurado)
            log.warn('[Updater] Verificação de updates ignorada:', err.message);
        });
    }, 30000);

    log.info('[Updater] Auto-updater configurado.');
}

/**
 * Inicia o download da atualização disponível
 * Chamado via IPC quando o usuário aceita baixar a atualização
 */
function downloadUpdate() {
    autoUpdater.downloadUpdate().catch((err) => {
        log.error('[Updater] Erro ao baixar atualização:', err);
    });
}

/**
 * Instala a atualização já baixada e reinicia o app
 * Chamado via IPC quando o usuário consente a instalação
 */
function installUpdate() {
    log.info('[Updater] Usuário aceitou instalar - reiniciando...');
    autoUpdater.quitAndInstall(false, true);
}

module.exports = { setupAutoUpdater, downloadUpdate, installUpdate };
