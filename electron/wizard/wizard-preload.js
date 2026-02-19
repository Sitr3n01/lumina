/**
 * Preload do Wizard - LUMINA Desktop
 * Expõe window.wizardAPI ao renderer do wizard via contextBridge.
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wizardAPI', {
    /**
     * Retorna as configurações padrão para preencher o wizard
     * @returns {Promise<Object>}
     */
    getDefaultConfig: () => ipcRenderer.invoke('wizard:getDefaults'),

    /**
     * Salva a configuração no arquivo .env do userData
     * @param {Object} data - Todos os dados do formulário
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    saveConfig: (data) => ipcRenderer.invoke('wizard:save', data),

    /**
     * Testa se uma URL iCal é válida
     * @param {string} url - URL do feed iCal
     * @returns {Promise<{ success: boolean, events?: number, error?: string }>}
     */
    testIcalUrl: (url) => ipcRenderer.invoke('wizard:testIcal', url),

    /**
     * Testa a conexão com o servidor de email (SMTP)
     * @param {Object} config - Configurações de email
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    testEmailConnection: (config) => ipcRenderer.invoke('wizard:testEmail', config),

    /**
     * Finaliza o wizard, cria usuário admin e abre o app principal
     * @returns {Promise<{ success: boolean, error?: string }>}
     */
    complete: () => ipcRenderer.invoke('wizard:complete'),
});
