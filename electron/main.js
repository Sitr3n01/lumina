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

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
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
// app.isPackaged é false quando roda do código-fonte (npm run dev / electron .)
// ELECTRON_DEV é redundância para garantir em cenários edge
const isDev = !app.isPackaged || process.env.ELECTRON_DEV === 'true';

// === ACELERAÇÃO DE HARDWARE ===
// Habilitar GPU rasterization e backend DirectX para UI mais fluida no Windows
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
if (process.platform === 'win32') {
    app.commandLine.appendSwitch('use-angle', 'd3d11');
}

// Flag para distinguir "fechar app de verdade" de "minimizar para tray"
app.isQuitting = false;

// Instâncias globais
let mainWindow = null;
let pythonManager = null;
let notificationPoller = null;

// ============================================================
// SPLASH HELPERS
// ============================================================

/**
 * Atualiza o texto e barra de progresso da tela de loading na janela principal.
 * Chamado do main process — injeta JS via executeJavaScript.
 * Silenciosamente ignorado se a janela navegar para o React antes da atualização.
 * @param {string} text - Mensagem de status
 * @param {number} progress - Percentual 0-100
 */
function updateSplash(text, progress) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const escaped = String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    mainWindow.webContents.executeJavaScript(
        `(function(){` +
        `  var t = document.getElementById('statusText');` +
        `  var p = document.getElementById('progressBar');` +
        `  if (t) t.textContent = '${escaped}';` +
        `  if (p) p.style.width = '${Math.min(100, Math.round(progress))}%';` +
        `})()`
    ).catch(() => { });
}

// ============================================================
// JANELA PRINCIPAL
// ============================================================

/**
 * Cria a janela principal do aplicativo.
 * Carrega splash.html como conteúdo inicial (experiência unificada).
 * Quando o backend estiver pronto, startNormalApp() navega para o React via loadURL/loadFile.
 * @returns {BrowserWindow}
 */
function createMainWindow() {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 720,
        title: 'LUMINA',
        backgroundColor: '#101922',
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });

    win.center();

    // Carregar tela de loading inicial (evita janela branca enquanto backend inicia)
    win.loadFile(path.join(__dirname, 'splash.html'));

    // Mostrar janela quando o splash carregar (rápido, sem flash)
    win.once('ready-to-show', () => {
        const version = app.getVersion();
        win.webContents.executeJavaScript(
            `(function(){var v=document.getElementById('appVersion');if(v)v.textContent='v${version}';})()`
        ).catch(() => { });
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
// HTTP HELPER
// ============================================================

/**
 * POST JSON para o backend local. Retorna { status, body }.
 */
function httpPost(port, urlPath, data, timeout = 8000) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = require('http').request({
            hostname: '127.0.0.1',
            port,
            path: urlPath,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
            timeout,
        }, (res) => {
            let responseData = '';
            res.on('data', chunk => { responseData += chunk; });
            res.on('end', () => {
                let parsed = {};
                try { parsed = JSON.parse(responseData); } catch (_) { }
                resolve({ status: res.statusCode, body: parsed });
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(body);
        req.end();
    });
}

/**
 * Envia um PDF para o endpoint de análise de template do backend.
 * Usa multipart/form-data para compatibilidade com FastAPI UploadFile.
 * @param {number} port
 * @param {Buffer} pdfBuffer
 * @param {string|null} authToken - JWT token para autenticação (obrigatório pelo endpoint)
 * @returns {Promise<{status: number}>}
 */
function uploadPdfTemplateToBackend(port, pdfBuffer, authToken) {
    return new Promise((resolve, reject) => {
        const boundary = `----FormBoundary${Date.now()}`;
        const CRLF = '\r\n';

        const headerPart = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="file"; filename="template.pdf"',
            'Content-Type: application/pdf',
            '',
            '',
        ].join(CRLF);

        const footerPart = `${CRLF}--${boundary}--${CRLF}`;

        const headerBuf = Buffer.from(headerPart, 'utf-8');
        const footerBuf = Buffer.from(footerPart, 'utf-8');
        const body = Buffer.concat([headerBuf, pdfBuffer, footerBuf]);

        const headers = {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
        };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const req = require('http').request({
            hostname: '127.0.0.1',
            port,
            path: '/api/v1/documents/analyze-template',
            method: 'POST',
            headers,
            timeout: 30000,
        }, (res) => {
            let responseData = '';
            res.on('data', chunk => { responseData += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve({ status: res.statusCode });
                } else {
                    reject(new Error(`Backend retornou ${res.statusCode}: ${responseData}`));
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(body);
        req.end();
    });
}

// ============================================================
// FLUXO NORMAL DO APP (após wizard ou em execuções subsequentes)
// ============================================================

/**
 * Inicia o aplicativo normalmente:
 * janela principal (splash) → Python backend → navega para React → tray + IPC + updater
 *
 * Experiência unificada: uma única janela do início ao fim.
 * O splash.html é carregado inicialmente; quando o backend está pronto,
 * a janela navega para o frontend React via loadURL/loadFile.
 */
async function startNormalApp() {
    log.info('[Main] Iniciando app normal...');

    // 1. Criar janela principal imediatamente — exibe splash.html como loading screen
    mainWindow = createMainWindow();

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
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('backend:error', err);
        }
    });

    try {
        // 3. Iniciar backend Python
        updateSplash('Iniciando backend Python...', 20);
        await pythonManager.start();
        log.info('[Main] Backend Python pronto em', pythonManager.getUrl());
        updateSplash('Backend pronto!', 50);

        // 4. Criar conta admin + auto-login se houver pending-admin.json (pós-wizard)
        const pendingAdminPath = path.join(app.getPath('userData'), 'pending-admin.json');
        let autoLoginToken = null;

        if (fs.existsSync(pendingAdminPath)) {
            updateSplash('Configurando usuário administrador...', 60);
            try {
                const adminData = JSON.parse(fs.readFileSync(pendingAdminPath, 'utf-8'));
                const port = pythonManager.getPort();

                // A) Registrar admin (timeout aumentado para 15s — backend pode estar aquecendo)
                const regResult = await httpPost(port, '/api/v1/auth/register', {
                    email: adminData.email,
                    username: adminData.username,
                    password: adminData.password,
                    full_name: adminData.full_name || 'Administrador',
                }, 15000);

                if (regResult.status === 201) {
                    log.info('[Main] Usuário admin criado com sucesso.');
                    updateSplash('Autenticando...', 70);

                    // B) Auto-login para obter token JWT
                    const loginResult = await httpPost(port, '/api/v1/auth/login', {
                        username: adminData.username,
                        password: adminData.password,
                    }, 10000);

                    if (loginResult.status === 200 && loginResult.body.access_token) {
                        autoLoginToken = loginResult.body.access_token;
                        log.info('[Main] Auto-login token obtido.');
                        // Só deletar após sucesso completo (registro + login)
                        try { fs.unlinkSync(pendingAdminPath); } catch (_) { }
                        log.info('[Main] pending-admin.json removido após setup completo.');
                    } else {
                        log.warn(`[Main] Login pós-registro falhou: ${loginResult.status}. pending-admin.json mantido para retry.`);
                    }
                } else if (regResult.status === 403) {
                    // Usuário já existe — pending-admin.json nunca conseguirá registrar um novo.
                    // Limpar o arquivo para evitar loop eterno; usuário deve logar com credenciais originais.
                    try { fs.unlinkSync(pendingAdminPath); } catch (_) { }
                    log.warn('[Main] Sistema já configurado (403). pending-admin.json removido. Login manual necessário.');
                } else {
                    // Falha transitória (500, rede, etc.) — manter para retry na próxima abertura.
                    log.warn(`[Main] Registro admin falhou: ${regResult.status} — ${JSON.stringify(regResult.body)}. pending-admin.json mantido para retry.`);
                }
            } catch (err) {
                log.error('[Main] Erro ao processar pending-admin.json:', err.message);
                // Não deletar: manter para próxima tentativa ao reiniciar o app
            }
        }

        // 4.5 Processar template PDF pendente do wizard (se houver)
        const pendingPdfPath = path.join(app.getPath('userData'), 'pending-template.pdf');
        if (fs.existsSync(pendingPdfPath)) {
            if (!autoLoginToken) {
                // Sem token de auth: arquivo ficou de uma execução anterior sem conta admin válida.
                // Não é possível fazer upload sem autenticação — remover para não poluir logs.
                try { fs.unlinkSync(pendingPdfPath); } catch (_) { }
                log.warn('[Main] pending-template.pdf removido: sem token de auth disponível para upload.');
            } else {
                updateSplash('Processando template de documento...', 75);
                try {
                    const pdfBytes = fs.readFileSync(pendingPdfPath);
                    await uploadPdfTemplateToBackend(pythonManager.getPort(), pdfBytes, autoLoginToken);
                    fs.unlinkSync(pendingPdfPath);
                    log.info('[Main] Template PDF analisado e configurado com sucesso.');
                } catch (err) {
                    log.warn('[Main] Falha ao processar template PDF:', err.message);
                    // Não crítico — manter arquivo para próxima tentativa com token válido
                }
            }
        }

        // 5. Registrar manipulador IPC para o token de auto-login (antes de navegar para o React)
        // Remover handler anterior antes de registrar — previne duplicata em caso de retry
        try { ipcMain.removeHandler('auth:getAutoLoginToken'); } catch (_) { }
        ipcMain.handle('auth:getAutoLoginToken', () => {
            const token = autoLoginToken;
            autoLoginToken = null; // Consume: one-shot, próxima chamada retorna null
            if (token) log.info('[Main] Token auto-login enviado ao React (IPC).');
            return token;
        });

        // 6. Navegar para o frontend React (mesma janela, sem abrir nova)
        updateSplash('Carregando interface...', 90);

        // Notificar renderer que backend está pronto após a interface carregar
        mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('backend:ready');
            log.info('[Main] backend:ready enviado ao renderer.');
        });

        if (isDev) {
            mainWindow.loadURL('http://localhost:5173');
        } else {
            mainWindow.loadFile(
                path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
            );
        }

        // 7. Registrar IPC handlers
        registerIpcHandlers(mainWindow, pythonManager);

        // Completar os handlers de update com as funções reais
        try { ipcMain.removeHandler('update:install'); } catch (e) { /* não existia */ }
        try { ipcMain.removeHandler('update:download'); } catch (e) { /* não existia */ }
        ipcMain.handle('update:download', () => downloadUpdate());
        ipcMain.handle('update:install', () => installUpdate());

        // 8. Criar ícone de bandeja
        createTray(mainWindow, pythonManager);

        // 9. Configurar auto-updater (apenas em produção)
        if (!isDev) {
            setupAutoUpdater(mainWindow);
        }

        // 10. Iniciar polling de notificações
        notificationPoller = startNotificationPoller(pythonManager);

        log.info('[Main] App iniciado com sucesso!');

    } catch (err) {
        log.error('[Main] Falha ao iniciar backend:', err);

        // Destruir janela principal para evitar estado inconsistente
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.destroy();
            mainWindow = null;
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
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 720,
        resizable: true,
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

            // Salvar credenciais do admin em arquivo separado (pending-admin.json)
            // para criar o usuário via API após o backend iniciar.
            // NUNCA incluir no .env — são credenciais de acesso, não configuração.
            if (config.adminEmail && config.adminUsername && config.adminPassword) {
                const pendingAdminPath = path.join(userDataPath, 'pending-admin.json');
                fs.writeFileSync(pendingAdminPath, JSON.stringify({
                    email: config.adminEmail,
                    username: config.adminUsername,
                    password: config.adminPassword,
                    full_name: 'Administrador',
                }), 'utf-8');
                log.info('[Wizard] pending-admin.json salvo (será criado após backend iniciar).');
            } else {
                log.warn('[Wizard] Dados de admin incompletos — usuário não será criado automaticamente.');
            }

            return { success: true };
        } catch (err) {
            log.error('[Wizard] Erro ao salvar config:', err);
            return { success: false, error: err.message };
        }
    });

    /** Salva o PDF do template de autorização em userData como pending-template.pdf */
    registerHandler('wizard:savePdf', async (event, pdfArrayBuffer) => {
        try {
            const userDataPath = app.getPath('userData');
            const pdfPath = path.join(userDataPath, 'pending-template.pdf');

            // Converter ArrayBuffer → Buffer do Node.js
            const buffer = Buffer.from(pdfArrayBuffer);

            // Validação básica: verificar header PDF (%PDF-)
            if (!buffer.slice(0, 5).toString('ascii').startsWith('%PDF')) {
                return { success: false, error: 'Arquivo inválido: não é um PDF' };
            }

            if (buffer.length > 20 * 1024 * 1024) {
                return { success: false, error: 'PDF muito grande (máx. 20MB)' };
            }

            fs.writeFileSync(pdfPath, buffer);
            log.info(`[Wizard] pending-template.pdf salvo (${Math.round(buffer.length / 1024)}KB)`);
            return { success: true };
        } catch (err) {
            log.error('[Wizard] Erro ao salvar PDF template:', err);
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

    /** Finaliza o wizard e sinaliza para iniciar o app */
    registerHandler('wizard:complete', async (event) => {
        try {
            // O backend Python será iniciado por startNormalApp() após o wizard.
            // O admin será criado via /v1/auth/register no primeiro acesso (Login.jsx).
            log.info('[Wizard] Wizard completado - sinalizando para iniciar app...');
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
    // Remover menu nativo do Electron (File/Edit/View/Window/Help)
    Menu.setApplicationMenu(null);
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
