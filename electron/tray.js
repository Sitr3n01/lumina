/**
 * Tray Icon - LUMINA Desktop
 * Gerencia o ícone na bandeja do sistema com menu de contexto.
 */
'use strict';

const { Tray, Menu, app } = require('electron');
const path = require('path');
const log = require('electron-log');

let trayInstance = null;
let trayUpdateInterval = null;

/**
 * Cria o ícone de bandeja do sistema
 * @param {Electron.BrowserWindow} mainWindow - Janela principal
 * @param {import('./python-manager')} pythonManager - Gerenciador do backend Python
 * @returns {Electron.Tray}
 */
function createTray(mainWindow, pythonManager) {
    // No Windows, new Tray() requer .ico — PNG falha silenciosamente.
    // Priorizar tray-icon.ico em win32, fallback para PNG em outros sistemas.
    const trayIconPath = (() => {
        const fs = require('fs');
        if (process.platform === 'win32') {
            const ico = path.join(__dirname, 'assets', 'tray-icon.ico');
            if (fs.existsSync(ico)) return ico;
        }
        const png = path.join(__dirname, 'assets', 'tray-icon.png');
        if (fs.existsSync(png)) return png;
        return path.join(__dirname, 'assets', 'tray-icon.png');
    })();

    trayInstance = new Tray(trayIconPath);
    trayInstance.setToolTip('LUMINA - Sistema de Gestão');

    /**
     * Reconstrói o menu de contexto (necessário para atualizar status dinâmico)
     */
    function buildContextMenu() {
        return Menu.buildFromTemplate([
            {
                label: 'Abrir LUMINA',
                click: () => {
                    mainWindow.show();
                    mainWindow.focus();
                },
            },
            { type: 'separator' },
            {
                label: `Status: Backend ${pythonManager.isRunning() ? '✅ rodando' : '❌ parado'}`,
                enabled: false,
            },
            {
                label: 'Reiniciar Backend',
                click: async () => {
                    try {
                        await pythonManager.restart();
                        // Atualizar menu após restart
                        trayInstance.setContextMenu(buildContextMenu());
                    } catch (err) {
                        log.error('[Tray] Erro ao reiniciar backend:', err);
                    }
                },
            },
            { type: 'separator' },
            {
                label: 'Sair',
                click: () => {
                    app.isQuitting = true;
                    app.quit();
                },
            },
        ]);
    }

    // Definir menu inicial
    trayInstance.setContextMenu(buildContextMenu());

    // Clicar no ícone (botão esquerdo) mostra/foca a janela
    trayInstance.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.focus();
        } else {
            mainWindow.show();
            mainWindow.focus();
        }
    });

    // Atualizar status do backend no menu periodicamente
    trayUpdateInterval = setInterval(() => {
        if (trayInstance && !trayInstance.isDestroyed()) {
            trayInstance.setContextMenu(buildContextMenu());
        }
    }, 10000);

    return trayInstance;
}

/**
 * Destrói o ícone de bandeja e limpa intervalo
 */
function destroyTray() {
    if (trayUpdateInterval) {
        clearInterval(trayUpdateInterval);
        trayUpdateInterval = null;
    }
    if (trayInstance && !trayInstance.isDestroyed()) {
        trayInstance.destroy();
        trayInstance = null;
    }
}

module.exports = { createTray, destroyTray };
