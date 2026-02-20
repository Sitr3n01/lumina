/**
 * Main Process do Electron - LUMINA Desktop
 * Versão completa com: Python Manager, Splash, Tray, IPC, Auto-updater e Setup Wizard.
 *
 * Fluxo:
 * 1. Verificar se é primeiro run (existe .env em userData?)
 *    - SIM: abrir Wizard
 *    - NÃO: ir para startNormalApp()
 * 2. startNormalApp():
 *    a. Mostrar splash screen
 *    b. Iniciar Python backend (PythonManager)
 *    c. Backend pronto → fechar splash, abrir janela principal
 *    d. Configurar Tray, IPC handlers, Auto-updater
 * 3. Fechar janela → esconder (continua na bandeja)
 * 4. Tray "Sair" → encerrar app + Python
 */
'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

const PythonManager = require('./python-manager');
const { registerIpcHandlers } = require('./ipc-handlers');
const { createTray, destroyTray } = require('./tray');
const { setupAutoUpdater, downloadUpdate, installUpdate } = require('./updater');

// === CONFIGURAÇÃO DE LOG ===
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('[Main] LUMINA iniciando...');

// Detectar modo de desenvolvimento
const isDev = process.env.ELECTRON_DEV === 'true';

// Flag para distinguir "fechar app de verdade" de "minimizar para tray"
app.isQuitting = false;

// Instâncias globais
let mainWindow = null;
let splashWindow = null;
let pythonManager = null;
let notificationPoller = null;

// ============================================================
// SPLASH SCREEN
// ============================================================

/**
 * Cria e mostra a splash screen enquanto o backend inicia
 * @returns {BrowserWindow}
 */
function createSplashWindow() {
    const splash = new BrowserWindow({
        width: 400,
        height: 300,
        transparent: false,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        backgroundColor: '#0f0f1a',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    splash.loadFile(path.join(__dirname, 'splash.html'));
    splash.center();

    // Injetar versão dinâmica do package.json
    splash.webContents.on('did-finish-load', () => {
        const version = app.getVersion();
        splash.webContents.executeJavaScript(
            `document.getElementById('appVersion').textContent = 'v${version}';`
        ).catch(() => {});
    });

    return splash;
}

// ============================================================
// JANELA PRINCIPAL
// ============================================================

/**
 * Cria a janela principal do aplicativo
 * @returns {BrowserWindow}
 */
function createMainWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 700,
        title: 'LUMINA',
        backgroundColor: '#0f0f1a',
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    // Carregar URL do frontend
    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        win.loadFile(
            path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
        );
    }

    // Mostrar janela quando pronto (evita flash branco)
    win.once('ready-to-show', () => {
        win.show();
        win.focus();
    });

    // SECURITY: Interceptar navegação para URLs externas.
    // Previne que links externos abram dentro do Electron (potencial phishing/MITM).
    // URLs externas são abertas no browser padrão do sistema via shell.openExternal.
    const { shell } = require('electron');
    const ALLOWED_ORIGINS = [
        'http://localhost:5173',  // Vite dev server
        'http://127.0.0.1',       // Backend local (qualquer porta)
        'file://',                 // Arquivos estáticos em produção
    ];

    const isAllowedUrl = (url) =>
        ALLOWED_ORIGINS.some(origin => url.startsWith(origin));

    win.webContents.on('will-navigate', (event, url) => {
        if (!isAllowedUrl(url)) {
            event.preventDefault();
            shell.openExternal(url).catch((err) => {
                log.warn('[Main] Falha ao abrir URL externa:', url, err.message);
            });
            log.info('[Main] URL externa redirecionada para browser:', url);
        }
    });

    // Interceptar abertura de novas janelas (links com target="_blank")
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (!isAllowedUrl(url)) {
            shell.openExternal(url).catch((err) => {
                log.warn('[Main] Falha ao abrir nova janela externa:', url, err.message);
            });
        }
        return { action: 'deny' }; // Nunca abrir nova janela Electron
    });

    // Interceptar evento de fechar: esconder em vez de fechar (vai para bandeja)
    win.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            win.hide();
            log.info('[Main] Janela escondida (minimizado para bandeja).');
        }
    });

    return win;
}

// ============================================================
// NOTIFICATION POLLER (T4.5)
// ============================================================

/**
 * Polling de notificações do backend para exibir notificações nativas
 * quando o app está minimizado na bandeja.
 */
function startNotificationPoller(pythonMgr) {
    const { Notification } = require('electron');
    let lastUnreadCount = 0;
    let intervalId = null;

    const poll = async () => {
        // Só pollar quando a janela principal está oculta
        if (mainWindow && mainWindow.isVisible()) return;
        if (!pythonMgr.isRunning()) return;

        try {
            const http = require('http');
            const url = `${pythonMgr.getUrl()}/api/v1/notifications/summary`;

            const data = await new Promise((resolve, reject) => {
                const req = http.get(url, { timeout: 3000 }, (res) => {
                    let body = '';
                    res.on('data', (chunk) => (body += chunk));
                    res.on('end', () => {
                        try { resolve(JSON.parse(body)); }
                        catch (e) { reject(e); }
                    });
                });
                req.on('error', reject);
                req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
            });

            const unreadCount = data?.unread_count ?? 0;
            if (unreadCount > lastUnreadCount && Notification.isSupported()) {
                new Notification({
                    title: 'LUMINA',
                    body: `Você tem ${unreadCount} nova${unreadCount > 1 ? 's' : ''} notifica${unreadCount > 1 ? 'ções' : 'ção'}`,
                }).show();
            }
            lastUnreadCount = unreadCount;
        } catch (err) {
            // Silencioso - backend pode estar iniciando ou sem endpoint
        }
    };

    intervalId = setInterval(poll, 60000); // A cada 60 segundos
    log.info('[NotificationPoller] Iniciado (intervalo: 60s).');

    return {
        stop: () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
                log.info('[NotificationPoller] Parado.');
            }
        },
    };
}

// ============================================================
// FLUXO NORMAL DO APP (após wizard ou em execuções subsequentes)
// ============================================================

/**
 * Inicia o aplicativo normalmente:
 * splash → Python backend → janela principal → tray + IPC + updater
 */
async function startNormalApp() {
    log.info('[Main] Iniciando app normal...');

    // 1. Mostrar splash screen
    splashWindow = createSplashWindow();

    // 2. Inicializar Python Manager
    pythonManager = new PythonManager({
        isDev,
        resourcesPath: process.resourcesPath || path.join(__dirname, '..'),
        userDataPath: app.getPath('userData'),
    });

    // Callbacks do Python Manager
    pythonManager.onLog((msg) => log.info('[Python]', msg));
    pythonManager.onError((err) => {
        log.error('[Python] Erro:', err);
        // Mostrar diálogo de erro se a janela principal já existir
        if (mainWindow) {
            mainWindow.webContents.send('backend:error', err);
        }
    });

    try {
        // 3. Iniciar backend Python
        await pythonManager.start();
        log.info('[Main] Backend Python pronto em', pythonManager.getUrl());

        // 4. Fechar splash e criar janela principal
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
            splashWindow = null;
        }

        mainWindow = createMainWindow();

        // Notificar renderer que backend está pronto (após a janela carregar)
        mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('backend:ready');
        });

        // 5. Registrar IPC handlers
        registerIpcHandlers(mainWindow, pythonManager);

        // Completar os handlers de update com as funções reais
        ipcMain.removeHandler('update:install'); // Remove placeholder do ipc-handlers.js
        ipcMain.handle('update:download', () => downloadUpdate());
        ipcMain.handle('update:install', () => installUpdate());

        // 6. Criar ícone de bandeja
        createTray(mainWindow, pythonManager);

        // 7. Configurar auto-updater (apenas em produção)
        if (!isDev) {
            setupAutoUpdater(mainWindow);
        }

        // 8. Iniciar polling de notificações
        notificationPoller = startNotificationPoller(pythonManager);

        log.info('[Main] App iniciado com sucesso!');

    } catch (err) {
        log.error('[Main] Falha ao iniciar backend:', err);

        // Fechar splash
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
        }

        // Mostrar diálogo de erro com opção de tentar novamente ou sair
        const { response } = await dialog.showMessageBox({
            type: 'error',
            title: 'LUMINA - Falha ao iniciar',
            message: 'O backend Python não conseguiu iniciar.',
            detail: err.message,
            buttons: ['Tentar Novamente', 'Sair'],
            defaultId: 0,
            cancelId: 1,
        });

        if (response === 0) {
            // Tentar novamente
            await startNormalApp();
        } else {
            app.quit();
        }
    }
}

// ============================================================
// WIZARD DE PRIMEIRO RUN (T5.5)
// ============================================================

/**
 * Verifica se é o primeiro run (sem .env no userData)
 * @returns {boolean}
 */
function isFirstRun() {
    const envPath = path.join(app.getPath('userData'), '.env');
    return !fs.existsSync(envPath);
}

/**
 * Abre o wizard de configuração inicial
 */
function openWizard() {
    log.info('[Main] Primeiro run detectado - abrindo wizard...');

    const wizardWindow = new BrowserWindow({
        width: 800,
        height: 650,
        resizable: false,
        frame: true,
        titleBarStyle: 'default',
        title: 'LUMINA - Configuração Inicial',
        backgroundColor: '#0f0f1a',
        webPreferences: {
            preload: path.join(__dirname, 'wizard', 'wizard-preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    wizardWindow.loadFile(path.join(__dirname, 'wizard', 'wizard.html'));
    wizardWindow.center();

    // Registrar handlers do wizard (retorna cleanup function)
    const cleanupWizardHandlers = registerWizardHandlers(wizardWindow);

    // Quando o wizard completar, limpar handlers e iniciar app normal
    app.once('wizard-done', async () => {
        log.info('[Main] Wizard completado - limpando handlers e iniciando app...');
        cleanupWizardHandlers();
        wizardWindow.close();
        await startNormalApp();
    });
}

// ============================================================
// WIZARD IPC HANDLERS (T5.4)
// ============================================================

/**
 * Registra os handlers IPC do wizard de configuração
 * @param {BrowserWindow} wizardWindow
 */
function registerWizardHandlers(wizardWindow) {
    // Lista de canais para cleanup posterior
    const handlerChannels = [];

    function registerHandler(channel, handler) {
        ipcMain.handle(channel, handler);
        handlerChannels.push(channel);
    }

    /** Retorna configurações padrão para o wizard */
    registerHandler('wizard:getDefaults', () => ({
        CALENDAR_SYNC_INTERVAL_MINUTES: 30,
        EMAIL_PROVIDER: 'gmail',
        EMAIL_SMTP_PORT: 587,
        EMAIL_IMAP_PORT: 993,
        EMAIL_USE_TLS: true,
    }));

    /** Salva a configuração gerada pelo wizard no .env */
    registerHandler('wizard:save', async (event, config) => {
        try {
            const crypto = require('crypto');
            const secretKey = crypto.randomBytes(32).toString('base64url');
            const userDataPath = app.getPath('userData');

            // Gerar conteúdo do .env
            const envContent = buildEnvFile({ ...config, SECRET_KEY: secretKey });

            // Escrever .env no userData
            const envPath = path.join(userDataPath, '.env');
            fs.writeFileSync(envPath, envContent, 'utf-8');
            log.info('[Wizard] .env salvo em:', envPath);

            // Criar diretórios de dados necessários
            const dirs = [
                'data',
                path.join('data', 'downloads'),
                path.join('data', 'generated_docs'),
                path.join('data', 'logs'),
                path.join('data', 'backups'),
            ];
            for (const dir of dirs) {
                fs.mkdirSync(path.join(userDataPath, dir), { recursive: true });
            }

            return { success: true };
        } catch (err) {
            log.error('[Wizard] Erro ao salvar config:', err);
            return { success: false, error: err.message };
        }
    });

    /** Testa se uma URL iCal é válida fazendo GET e verificando conteúdo */
    registerHandler('wizard:testIcal', async (event, url) => {
        try {
            // SECURITY: Validar URL antes de fazer request (anti-SSRF)
            let parsed;
            try {
                parsed = new URL(url);
            } catch {
                return { success: false, error: 'URL inválida' };
            }
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return { success: false, error: 'Apenas URLs HTTP/HTTPS são permitidas' };
            }
            if (isPrivateHostname(parsed.hostname)) {
                return { success: false, error: 'URLs para endereços locais/privados não são permitidas' };
            }

            const http = url.startsWith('https') ? require('https') : require('http');
            const result = await new Promise((resolve, reject) => {
                const req = http.get(url, { timeout: 10000 }, (res) => {
                    let body = '';
                    res.on('data', (chunk) => (body += chunk));
                    res.on('end', () => {
                        if (body.includes('BEGIN:VCALENDAR')) {
                            const events = (body.match(/BEGIN:VEVENT/g) || []).length;
                            resolve({ success: true, events });
                        } else {
                            resolve({ success: false, error: 'Resposta não é um calendário iCal válido' });
                        }
                    });
                });
                req.on('error', (e) => resolve({ success: false, error: e.message }));
                req.on('timeout', () => {
                    req.destroy();
                    resolve({ success: false, error: 'Timeout ao conectar' });
                });
            });
            return result;
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    /** Testa conexão de email (simplificado via conexão TCP ao SMTP) */
    registerHandler('wizard:testEmail', async (event, config) => {
        try {
            const net = require('net');
            const host = config.EMAIL_SMTP_HOST || getSmtpHost(config.EMAIL_PROVIDER);
            const port = config.EMAIL_SMTP_PORT || 587;

            // SECURITY: Validar host contra SSRF
            if (isPrivateHostname(host)) {
                return { success: false, error: 'Endereços locais/privados não são permitidos' };
            }

            const connected = await new Promise((resolve) => {
                const socket = net.createConnection(port, host);
                socket.setTimeout(5000);
                socket.on('connect', () => { socket.destroy(); resolve(true); });
                socket.on('error', () => resolve(false));
                socket.on('timeout', () => { socket.destroy(); resolve(false); });
            });

            return connected
                ? { success: true }
                : { success: false, error: `Não foi possível conectar ao servidor SMTP ${host}:${port}` };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    /** Finaliza o wizard, cria usuário admin e sinaliza para iniciar o app */
    registerHandler('wizard:complete', async (event) => {
        try {
            // Iniciar backend Python temporariamente para criar o usuário admin
            const tempManager = new PythonManager({
                isDev,
                resourcesPath: process.resourcesPath || path.join(__dirname, '..'),
                userDataPath: app.getPath('userData'),
            });

            await tempManager.start();

            // O registro do admin é feito via script scripts/create_default_admin.py OU
            // pela rota de setup se existir. Por ora, sinalizamos que o wizard completou.
            // O usuário poderá criar conta na primeira tela de login.

            await tempManager.stop();

            // Sinalizar para o evento 'wizard-done' no app
            app.emit('wizard-done');
            return { success: true };
        } catch (err) {
            log.error('[Wizard] Erro ao completar:', err);
            return { success: false, error: err.message };
        }
    });

    // Retornar função de cleanup para remover todos os handlers
    return () => {
        handlerChannels.forEach(channel => {
            try { ipcMain.removeHandler(channel); } catch (e) { /* já removido */ }
        });
        log.info(`[Wizard] ${handlerChannels.length} handlers removidos.`);
    };
}

/**
 * SECURITY: Verifica se URL/hostname aponta para rede privada (anti-SSRF)
 * @param {string} hostname - Hostname a verificar
 * @returns {boolean} true se é endereço privado
 */
function isPrivateHostname(hostname) {
    if (!hostname) return true;
    hostname = hostname.toLowerCase();

    // Bloquear localhost e variantes
    if (['localhost', '127.0.0.1', '::1', '0.0.0.0', '[::1]'].includes(hostname)) return true;

    // Bloquear ranges privados IPv4
    const parts = hostname.split('.');
    if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
        const a = parseInt(parts[0]);
        const b = parseInt(parts[1]);
        if (a === 10) return true;                          // 10.0.0.0/8
        if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12
        if (a === 192 && b === 168) return true;            // 192.168.0.0/16
        if (a === 169 && b === 254) return true;            // 169.254.0.0/16 (link-local)
        if (a === 0) return true;                           // 0.0.0.0/8
    }

    return false;
}

/**
 * Helper: retorna host SMTP padrão para um provider
 */
function getSmtpHost(provider) {
    const hosts = {
        gmail: 'smtp.gmail.com',
        outlook: 'smtp.office365.com',
        yahoo: 'smtp.mail.yahoo.com',
    };
    return hosts[provider] || 'smtp.gmail.com';
}

/**
 * Gera o conteúdo do arquivo .env a partir da config do wizard
 * @param {Object} config - Dados do formulário do wizard
 * @returns {string} Conteúdo do arquivo .env
 */
function buildEnvFile(config) {
    /**
     * SECURITY: Sanitiza valor antes de interpolar no .env
     * Remove \n, \r, \0 para prevenir injection de novas variáveis
     */
    function escapeEnvValue(value) {
        if (value == null) return '';
        return String(value).replace(/[\n\r\0]/g, '').trim();
    }

    const s = (key) => escapeEnvValue(config[key]);

    const lines = [
        '# LUMINA Configuration - Generated by Setup Wizard',
        `# Generated: ${new Date().toISOString()}`,
        '',
        '# === APLICAÇÃO ===',
        'APP_NAME=Lumina',
        'APP_ENV=desktop',
        `SECRET_KEY=${s('SECRET_KEY')}`,
        'LOG_LEVEL=INFO',
        'TIMEZONE=America/Sao_Paulo',
        '',
        '# === BANCO DE DADOS ===',
        '# DATABASE_URL é definida pelo Electron via variável de ambiente',
        '# DATABASE_URL=sqlite:///./data/lumina.db',
        '',
        '# === MODO DESKTOP ===',
        'LUMINA_DESKTOP=true',
        '',
        '# === DADOS DO IMÓVEL ===',
        `PROPERTY_NAME=${s('PROPERTY_NAME') || 'Meu Apartamento'}`,
        `PROPERTY_ADDRESS=${s('PROPERTY_ADDRESS')}`,
        `CONDO_NAME=${s('CONDO_NAME')}`,
        `CONDO_ADMIN_NAME=${s('CONDO_ADMIN_NAME')}`,
        `CONDO_EMAIL=${s('CONDO_EMAIL')}`,
        '',
        '# === DADOS DO PROPRIETÁRIO ===',
        `OWNER_NAME=${s('OWNER_NAME')}`,
        `OWNER_EMAIL=${s('OWNER_EMAIL')}`,
        `OWNER_PHONE=${s('OWNER_PHONE')}`,
        `OWNER_APTO=${s('OWNER_APTO')}`,
        `OWNER_BLOCO=${s('OWNER_BLOCO')}`,
        `OWNER_GARAGEM=${s('OWNER_GARAGEM')}`,
        '',
        '# === CALENDÁRIOS ===',
        `AIRBNB_ICAL_URL=${s('AIRBNB_ICAL_URL')}`,
        `BOOKING_ICAL_URL=${s('BOOKING_ICAL_URL')}`,
        `CALENDAR_SYNC_INTERVAL_MINUTES=${s('CALENDAR_SYNC_INTERVAL_MINUTES') || 30}`,
        '',
        '# === EMAIL ===',
        `EMAIL_PROVIDER=${s('EMAIL_PROVIDER') || 'gmail'}`,
        `EMAIL_FROM=${s('EMAIL_FROM')}`,
        `EMAIL_PASSWORD=${s('EMAIL_PASSWORD')}`,
        `EMAIL_SMTP_HOST=${s('EMAIL_SMTP_HOST')}`,
        `EMAIL_SMTP_PORT=${s('EMAIL_SMTP_PORT') || 587}`,
        `EMAIL_IMAP_HOST=${s('EMAIL_IMAP_HOST')}`,
        `EMAIL_IMAP_PORT=${s('EMAIL_IMAP_PORT') || 993}`,
        `EMAIL_USE_TLS=${config.EMAIL_USE_TLS !== false ? 'true' : 'false'}`,
        '',
        '# === CORS ===',
        'CORS_ORIGINS=*',
        '',
        '# === RATE LIMITING ===',
        'RATE_LIMIT_ENABLED=false',
        '',
    ];

    return lines.join('\n');
}

// ============================================================
// CICLO DE VIDA DO APP
// ============================================================

app.whenReady().then(async () => {
    log.info('[Main] app.whenReady() - verificando primeiro run...');

    if (isFirstRun()) {
        openWizard();
    } else {
        await startNormalApp();
    }

    // No macOS, recriar janela ao clicar no ícone da dock
    app.on('activate', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        } else {
            startNormalApp();
        }
    });
});

// Encerrar backend Python antes de sair do app
app.on('before-quit', async () => {
    log.info('[Main] App encerrando, parando backend Python...');
    app.isQuitting = true;

    if (notificationPoller) {
        notificationPoller.stop();
    }

    // Destruir tray e limpar intervalo de status
    destroyTray();

    if (pythonManager && pythonManager.isRunning()) {
        try {
            await pythonManager.stop();
        } catch (err) {
            log.error('[Main] Erro ao parar backend:', err);
        }
    }
});

// No Windows/Linux, quit quando todas as janelas fecharem (mas janela vai para tray)
// Na prática, window.on('close') previne o fechar, então isso só dispara via app.quit()
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Não quit() aqui - o tray garante que o app continua rodando
        // O quit real vem do menu do tray
    }
});

log.info('[Main] Main process inicializado.');
