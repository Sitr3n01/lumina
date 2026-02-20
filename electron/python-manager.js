/**
 * Python Manager - LUMINA Desktop
 * Gerencia o ciclo de vida do processo Python backend.
 * Responsável por: spawn, health check, crash recovery e graceful shutdown.
 */
'use strict';

const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const http = require('http');
const log = require('electron-log');

/**
 * Encontra uma porta TCP livre aleatória
 * @returns {Promise<number>}
 */
function findFreePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

/**
 * Verifica se o backend está respondendo no endpoint /health
 * @param {string} url - URL base do backend
 * @returns {Promise<boolean>}
 */
function checkHealth(url) {
    return new Promise((resolve) => {
        const req = http.get(`${url}/health`, { timeout: 2000 }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

/**
 * Aguarda o health check ficar OK com polling
 * @param {string} url - URL base
 * @param {number} timeoutMs - Timeout total em ms
 * @param {number} intervalMs - Intervalo entre tentativas em ms
 * @returns {Promise<void>}
 */
function waitForHealthy(url, timeoutMs = 30000, intervalMs = 500) {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + timeoutMs;

        const poll = async () => {
            if (Date.now() > deadline) {
                return reject(new Error(`Backend não respondeu em ${timeoutMs}ms`));
            }
            const healthy = await checkHealth(url);
            if (healthy) {
                resolve();
            } else {
                setTimeout(poll, intervalMs);
            }
        };

        poll();
    });
}

/**
 * Gerencia o ciclo de vida do processo Python backend
 */
class PythonManager {
    /**
     * @param {{ isDev: boolean, resourcesPath: string, userDataPath: string }} options
     */
    constructor(options = {}) {
        this.isDev = options.isDev || false;
        this.resourcesPath = options.resourcesPath || path.join(__dirname, '..');
        this.userDataPath = options.userDataPath || path.join(require('electron').app.getPath('userData'));

        this._port = null;
        this._process = null;
        this._running = false;
        this._pid = null;
        this._restartCount = 0;
        this._maxRestarts = 3;
        this._stopping = false;

        // Callbacks de eventos
        this._onReadyCallbacks = [];
        this._onErrorCallbacks = [];
        this._onLogCallbacks = [];
    }

    /**
     * Inicia o backend Python
     * @returns {Promise<void>}
     */
    async start() {
        if (this._running) {
            log.info('[PythonManager] Backend já está rodando na porta', this._port);
            return;
        }

        this._stopping = false;
        this._port = await findFreePort();
        const url = this.getUrl();

        log.info(`[PythonManager] Iniciando backend na porta ${this._port}...`);
        this._emitLog(`Iniciando backend na porta ${this._port}...`);

        // Montar variáveis de ambiente para o processo Python
        const env = {
            ...process.env,
            LUMINA_DESKTOP: 'true',
            LUMINA_DATA_DIR: this.userDataPath,
            LUMINA_ENV_FILE: path.join(this.userDataPath, '.env'),
            APP_ENV: 'desktop',
            DATABASE_URL: `sqlite:///${path.join(this.userDataPath, 'data', 'lumina.db')}`,
            TEMPLATE_DIR: path.join(this.resourcesPath, 'templates'),
            OUTPUT_DIR: path.join(this.userDataPath, 'data', 'generated_docs'),
        };

        let cmd, args;

        if (this.isDev) {
            // Modo desenvolvimento: usar Python do sistema
            const projectRoot = path.join(__dirname, '..');
            cmd = process.platform === 'win32' ? 'python' : 'python3';
            args = ['run_backend.py', String(this._port), '127.0.0.1'];
            this._process = spawn(cmd, args, {
                cwd: projectRoot,
                env,
                windowsHide: true,
            });
        } else {
            // Modo produção: usar executável PyInstaller bundled
            const exeName = process.platform === 'win32'
                ? 'lumina-backend.exe'
                : 'lumina-backend';
            const exePath = path.join(
                this.resourcesPath,
                'python-dist',
                'lumina-backend',
                exeName
            );
            cmd = exePath;
            args = [String(this._port), '127.0.0.1'];
            this._process = spawn(cmd, args, {
                env,
                windowsHide: true,
            });
        }

        // Capturar stdout/stderr
        this._process.stdout?.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) {
                log.info('[Python]', msg);
                this._emitLog(msg);
            }
        });

        this._process.stderr?.on('data', (data) => {
            const msg = data.toString().trim();
            if (msg) {
                log.error('[Python STDERR]', msg);
                this._emitLog(`[STDERR] ${msg}`);
            }
        });

        // Listener para saída do processo
        this._process.on('exit', (code, signal) => {
            const wasRunning = this._running;
            this._running = false;
            this._pid = null;

            if (!this._stopping && wasRunning) {
                // Crash inesperado – tentar recuperar
                const msg = `Backend encerrou inesperadamente (código: ${code}, sinal: ${signal})`;
                log.error('[PythonManager]', msg);
                this._emitLog(msg);
                this._handleCrash();
            }
        });

        this._process.on('error', (err) => {
            log.error('[PythonManager] Erro ao iniciar Python:', err);
            this._emitError(err.message);
        });

        this._pid = this._process.pid;

        // Aguardar backend ficar pronto
        try {
            await waitForHealthy(url, 30000, 500);
            this._running = true;
            this._restartCount = 0; // Reset após startup bem-sucedido
            log.info(`[PythonManager] Backend pronto em ${url}`);
            this._emitLog(`Backend pronto em ${url}`);
            this._onReadyCallbacks.forEach(cb => cb());
        } catch (err) {
            this._process?.kill();
            throw new Error(`Backend não iniciou a tempo: ${err.message}`);
        }
    }

    /**
     * Para o backend Python graciosamente
     * @returns {Promise<void>}
     */
    async stop() {
        if (!this._process) return;
        this._stopping = true;
        this._running = false;

        log.info('[PythonManager] Encerrando backend...');

        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                // Fallback: força encerramento no Windows
                if (this._pid) {
                    try {
                        if (process.platform === 'win32') {
                            spawn('taskkill', ['/PID', String(this._pid), '/F', '/T'], {
                                windowsHide: true,
                            });
                        } else {
                            process.kill(this._pid, 'SIGKILL');
                        }
                    } catch (e) {
                        log.error('[PythonManager] Erro ao forçar encerramento:', e);
                    }
                }
                resolve();
            }, 10000);

            this._process.on('exit', () => {
                clearTimeout(timeout);
                this._process = null;
                this._pid = null;
                log.info('[PythonManager] Backend encerrado.');
                resolve();
            });

            // Tentar shutdown gracioso via SIGTERM
            try {
                this._process.kill('SIGTERM');
            } catch (e) {
                // No Windows, SIGTERM pode falhar - o taskkill do timeout cuidará disso
                log.warn('[PythonManager] SIGTERM falhou (esperado no Windows):', e.message);
            }
        });
    }

    /**
     * Reinicia o backend
     * @returns {Promise<void>}
     */
    async restart() {
        log.info('[PythonManager] Reiniciando backend...');
        await this.stop();
        this._port = null;
        await this.start();
    }

    /**
     * Lida com crash do backend e tenta recuperar
     * @private
     */
    async _handleCrash() {
        if (this._restartCount >= this._maxRestarts) {
            const msg = `Backend crashou ${this._maxRestarts} vezes. Não tentará mais reiniciar.`;
            log.error('[PythonManager]', msg);
            this._emitError(msg);
            return;
        }

        this._restartCount++;
        const delay = Math.pow(2, this._restartCount) * 1000; // 2s, 4s, 8s
        log.info(`[PythonManager] Tentativa de restart ${this._restartCount}/${this._maxRestarts} em ${delay}ms...`);

        setTimeout(async () => {
            try {
                await this.start();
            } catch (err) {
                log.error('[PythonManager] Falha no restart:', err);
                this._emitError(err.message);
            }
        }, delay);
    }

    // === GETTERS ===

    /** @returns {number|null} Porta atual do backend */
    getPort() { return this._port; }

    /** @returns {string} URL completa do backend */
    getUrl() { return `http://127.0.0.1:${this._port}`; }

    /** @returns {boolean} Se o backend está rodando */
    isRunning() { return this._running; }

    /** @returns {number|null} PID do processo Python */
    getPid() { return this._pid; }

    // === CALLBACKS DE EVENTOS ===

    /** @param {() => void} callback */
    onReady(callback) { this._onReadyCallbacks.push(callback); }

    /** @param {(error: string) => void} callback */
    onError(callback) { this._onErrorCallbacks.push(callback); }

    /** @param {(message: string) => void} callback */
    onLog(callback) { this._onLogCallbacks.push(callback); }

    // === EMIT HELPERS ===

    _emitLog(msg) { this._onLogCallbacks.forEach(cb => cb(msg)); }
    _emitError(err) { this._onErrorCallbacks.forEach(cb => cb(err)); }
}

module.exports = PythonManager;
