/**
 * Tray Icon - LUMINA Desktop
 * Gerencia o ícone na bandeja do sistema com menu de contexto.
 */
'use strict';

const { Tray, Menu, app } = require('electron');
const path = require('path');

let trayInstance = null;

/**
 * Cria o ícone de bandeja do sistema
 * @param {Electron.BrowserWindow} mainWindow - Janela principal
 * @param {import('./python-manager')} pythonManager - Gerenciador do backend Python
 * @returns {Electron.Tray}
 */
function createTray(mainWindow, pythonManager) {
    // Usar tray-icon.png ou fallback para icon.ico
    const trayIconPath = (() => {
        const png = path.join(__dirname, 'assets', 'tray-icon.png');
        const ico = path.join(__dirname, 'assets', 'icon.ico');
        const fs = require('fs');
        if (fs.existsSync(png)) return png;
        if (fs.existsSync(ico)) return ico;
        // Fallback: usar um ícone padrão do Electron se nenhum existir
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
                        console.error('[Tray] Erro ao reiniciar backend:', err);
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
    setInterval(() => {
        if (trayInstance && !trayInstance.isDestroyed()) {
            trayInstance.setContextMenu(buildContextMenu());
        }
    }, 10000);

    return trayInstance;
}

/**
 * Destrói o ícone de bandeja
 */
function destroyTray() {
    if (trayInstance && !trayInstance.isDestroyed()) {
        trayInstance.destroy();
        trayInstance = null;
    }
}

module.exports = { createTray, destroyTray };
