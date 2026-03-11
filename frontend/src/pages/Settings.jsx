import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, Bot, Zap, Monitor, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { settingsAPI, aiAPI } from '../services/api';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('easy');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(
    localStorage.getItem('lumina_remember_login') !== 'false'
  );

  const [settings, setSettings] = useState({
    // Dados do imovel (carregados do servidor)
    propertyName: '',
    propertyAddress: '',
    maxGuests: 6,
    condoName: '',
    condoAdminName: '',
    condoEmail: '',

    // Proprietario (carregados do servidor)
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerApto: '',
    ownerBloco: '',
    ownerGaragem: '',

    // URLs iCal
    airbnbIcalUrl: '',
    bookingIcalUrl: '',

    // Sincronizacao
    syncIntervalMinutes: 30,

    // Telegram
    telegramBotToken: '',
    telegramAdminUserIds: '',

    // Email (read-only — configurado no assistente de instalação)
    emailProvider: '',
    emailFrom: '',
    emailPasswordSet: false,
    emailSmtpHost: '',
    emailSmtpPort: 587,
    emailImapHost: '',
    emailImapPort: 993,

    // Features
    enableAutoDocumentGeneration: false,
    enableConflictNotifications: true,

    // AI Settings
    aiProvider: 'anthropic',
    aiApiKey: '',
    aiModel: '',
    aiBaseUrl: '',
    aiApiKeySet: false,

    // Document / branding
    condoLogoUrl: '',
  });

  // Carregar estado do auto-launch via Electron IPC
  useEffect(() => {
    if (window.electronAPI?.getAutoLaunch) {
      window.electronAPI.getAutoLaunch().then(setAutoLaunch).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const response = await settingsAPI.getAll();
        if (cancelled) return;
        const data = response.data;

        setSettings(prev => ({
          ...prev,
          propertyName: data.propertyName || prev.propertyName,
          propertyAddress: data.propertyAddress || prev.propertyAddress,
          maxGuests: data.maxGuests ?? prev.maxGuests,
          condoName: data.condoName || prev.condoName,
          condoAdminName: data.condoAdminName || prev.condoAdminName,
          condoEmail: data.condoEmail || prev.condoEmail,
          // iCal (read-only, do .env)
          airbnbIcalUrl: data.airbnbIcalUrl || prev.airbnbIcalUrl,
          bookingIcalUrl: data.bookingIcalUrl || prev.bookingIcalUrl,
          // Email (read-only, do .env)
          emailProvider: data.emailProvider || prev.emailProvider,
          emailFrom: data.emailFrom || prev.emailFrom,
          emailPasswordSet: data.emailPasswordSet ?? prev.emailPasswordSet,
          // Telegram (read-only, do .env)
          telegramBotToken: data.telegramBotToken || prev.telegramBotToken,
          ownerName: data.ownerName || prev.ownerName,
          ownerEmail: data.ownerEmail || prev.ownerEmail,
          ownerPhone: data.ownerPhone || prev.ownerPhone,
          ownerApto: data.ownerApto || prev.ownerApto,
          ownerBloco: data.ownerBloco || prev.ownerBloco,
          ownerGaragem: data.ownerGaragem || prev.ownerGaragem,
          syncIntervalMinutes: data.syncIntervalMinutes || prev.syncIntervalMinutes,
          enableAutoDocumentGeneration: data.enableAutoDocumentGeneration ?? prev.enableAutoDocumentGeneration,
          enableConflictNotifications: data.enableConflictNotifications ?? prev.enableConflictNotifications,
          aiProvider: data.aiProvider || prev.aiProvider,
          aiApiKeySet: data.aiApiKeySet ?? prev.aiApiKeySet,
          aiModel: data.aiModel || prev.aiModel,
          aiBaseUrl: data.aiBaseUrl || prev.aiBaseUrl,
          condoLogoUrl: data.condoLogoUrl ?? prev.condoLogoUrl,
        }));
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading settings:', error);
          showMessage('Erro ao carregar configuracoes', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleHardReset = async () => {
    const msg =
      'ATENÇÃO: Hard Reset vai apagar TODAS as configurações editadas ' +
      '(incluindo chaves de IA configuradas pela interface) e reverter para os dados de fábrica.\n\n' +
      'O aplicativo será reiniciado e voltará à tela do wizard de configuração inicial.\n\n' +
      'Esta ação não pode ser desfeita. Deseja continuar?';
    let confirmed = false;
    if (window.electronAPI?.showConfirmDialog) {
      confirmed = await window.electronAPI.showConfirmDialog({
        title: 'Hard Reset — Reverter para Fábrica',
        message: msg,
        buttons: ['Cancelar', 'Sim, Resetar Tudo'],
        defaultId: 0,
        cancelId: 0,
      });
    } else {
      confirmed = window.confirm(msg);
    }
    if (!confirmed) return;
    try {
      await settingsAPI.reset();
      if (window.electronAPI?.factoryReset) {
        // Electron: remove .env do userData e relança o app → wizard abre automaticamente
        await window.electronAPI.factoryReset();
        // Código abaixo não é executado (app já foi encerrado)
      } else {
        // Web mode: limpar tokens e redirecionar para login
        localStorage.removeItem('lumina_token');
        sessionStorage.removeItem('lumina_token');
        window.dispatchEvent(new Event('auth:logout'));
      }
    } catch (err) {
      console.error('Hard reset failed:', err);
      showMessage('Erro ao resetar configurações.', 'error');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await settingsAPI.update(settings);
      showMessage('Configuracoes salvas com sucesso!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('Erro ao salvar configuracoes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAutoLaunchChange = async (enabled) => {
    setAutoLaunch(enabled);
    if (window.electronAPI?.setAutoLaunch) {
      await window.electronAPI.setAutoLaunch(enabled);
    }
  };

  const handleRememberLoginChange = (enabled) => {
    setRememberLogin(enabled);
    localStorage.setItem('lumina_remember_login', enabled ? 'true' : 'false');
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="loading-state">
          <RefreshCw className="spin" size={32} />
          <p>Carregando configuracoes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Configuracoes</h1>
        <p className="subtitle">Configure todos os parametros do sistema aqui</p>
      </div>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'easy' ? 'active' : ''}`}
          onClick={() => setActiveTab('easy')}
        >
          Configuracao Facil
        </button>
        <button
          className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          Configuracao Avancada
        </button>
        <button
          className={`tab ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
          style={activeTab === 'ai' ? { color: '#8b5cf6', borderBottomColor: '#8b5cf6' } : {}}
        >
          <Bot size={14} style={{ display: 'inline', marginRight: 5 }} />
          Inteligencia Artificial
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'easy' ? (
          <EasySettings settings={settings} onChange={handleChange} editMode={editMode} />
        ) : activeTab === 'ai' ? (
          <AISettings settings={settings} onChange={handleChange} showMessage={showMessage} />
        ) : (
          <AdvancedSettings
            settings={settings}
            onChange={handleChange}
            autoLaunch={autoLaunch}
            onAutoLaunchChange={handleAutoLaunchChange}
            rememberLogin={rememberLogin}
            onRememberLoginChange={handleRememberLoginChange}
          />
        )}
      </div>

      <div className="settings-actions">
        <button
          className="btn"
          onClick={handleHardReset}
          disabled={saving}
          title="Hard Reset — Apaga todas as configurações editadas e retorna ao wizard"
          style={{ background: '#e53e3e', color: '#fff', border: 'none' }}
        >
          <AlertTriangle size={16} />
          Hard Reset
        </button>
        <button
          className={`btn ${editMode ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setEditMode(v => !v)}
          title={editMode ? 'Desativar edição de campos críticos' : 'Editar campos do wizard'}
        >
          {editMode ? <><Unlock size={16} /> Edição Ativa</> : <><Lock size={16} /> Editar Dados</>}
        </button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar Configuracoes'}
        </button>
      </div>
    </div>
  );
};

// ========== ABA FACIL ==========
const EasySettings = ({ settings, onChange, editMode }) => {
  return (
    <div className="settings-section">

      {/* Banner de aviso do modo de edição */}
      {editMode && (
        <div className="message message-warning" style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} />
          <span>
            Modo de edição ativo — alterações nos campos do wizard serão salvas no banco de dados
            e terão precedência sobre os valores originais do wizard.
          </span>
        </div>
      )}

      <div className="section-group">
        <h3 className="section-title">Dados do Imovel</h3>
        <p className="section-description">
          Informacoes basicas sobre o apartamento
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">Nome do Imovel</label>
            <input
              type="text"
              className="input"
              value={settings.propertyName}
              readOnly={!editMode}
              onChange={(e) => onChange('propertyName', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="label">Endereco Completo</label>
            <input
              type="text"
              className="input"
              value={settings.propertyAddress}
              readOnly={!editMode}
              onChange={(e) => onChange('propertyAddress', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="label">Maximo de Hospedes</label>
            <input
              type="number"
              className="input"
              value={settings.maxGuests}
              onChange={(e) => onChange('maxGuests', parseInt(e.target.value))}
              min="1"
              max="20"
            />
          </div>
        </div>

        {!editMode && (
          <div className="info-box">
            <p>Nome e endereço do imóvel são configurados durante a instalação. Ative o <strong>Modo de Edição</strong> para alterá-los.</p>
          </div>
        )}
      </div>

      <div className="section-group">
        <h3 className="section-title">Dados do Condominio</h3>
        <p className="section-description">
          Informacoes para geracao de documentos de autorizacao
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">Nome do Condominio</label>
            <input
              type="text"
              className="input"
              value={settings.condoName}
              readOnly={!editMode}
              onChange={(e) => onChange('condoName', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="label">Nome da Administracao</label>
            <input
              type="text"
              className="input"
              value={settings.condoAdminName}
              readOnly={!editMode}
              onChange={(e) => onChange('condoAdminName', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="label">URL do Logo (opcional)</label>
            <input
              type="text"
              className="input"
              value={settings.condoLogoUrl}
              onChange={(e) => onChange('condoLogoUrl', e.target.value)}
              placeholder="https://exemplo.com/logo.png  ou  data:image/png;base64,..."
            />
            <small className="field-help">
              URL pública ou imagem base64 — exibida no cabeçalho da Autorização de Hospedagem
            </small>
          </div>

          <div className="form-field">
            <label className="label">Email do Condominio</label>
            <input
              type="email"
              className="input"
              value={settings.condoEmail}
              onChange={(e) => onChange('condoEmail', e.target.value)}
              placeholder="condominio@exemplo.com"
            />
            <small className="field-help">
              Email para envio automatico de autorizacoes de hospedagem
            </small>
          </div>
        </div>
      </div>

      <div className="section-group">
        <h3 className="section-title">Dados do Proprietario</h3>
        <p className="section-description">
          {editMode
            ? 'Modo de edição ativo — os campos abaixo podem ser alterados'
            : 'Informacoes do proprietario (ative o Modo de Edição para alterar)'}
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">Nome Completo</label>
            <input
              type="text"
              className="input"
              value={settings.ownerName}
              readOnly={!editMode}
              onChange={(e) => onChange('ownerName', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={settings.ownerEmail}
              readOnly={!editMode}
              onChange={(e) => onChange('ownerEmail', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="label">Telefone</label>
            <input
              type="text"
              className="input"
              value={settings.ownerPhone}
              readOnly={!editMode}
              onChange={(e) => onChange('ownerPhone', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="label">Apartamento</label>
            <input
              type="text"
              className="input"
              value={settings.ownerApto}
              readOnly={!editMode}
              onChange={(e) => onChange('ownerApto', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="label">Bloco</label>
            <input
              type="text"
              className="input"
              value={settings.ownerBloco}
              readOnly={!editMode}
              onChange={(e) => onChange('ownerBloco', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="label">Garagem</label>
            <input
              type="text"
              className="input"
              value={settings.ownerGaragem}
              readOnly={!editMode}
              onChange={(e) => onChange('ownerGaragem', e.target.value)}
            />
          </div>
        </div>

        {!editMode && (
          <div className="info-box">
            <p><strong>Nota:</strong> Os dados do proprietario sao configurados no wizard e utilizados nos documentos de autorizacao. Ative o <strong>Modo de Edição</strong> para alterá-los.</p>
          </div>
        )}
      </div>

      <div className="section-group">
        <h3 className="section-title">Conexao com Plataformas</h3>
        <p className="section-description">
          URLs de sincronizacao do calendario (iCal)
        </p>

        <div className="info-box">
          <p><strong>Como obter as URLs:</strong></p>
          <ul>
            <li><strong>Airbnb:</strong> Va em Calendario &rarr; Disponibilidade &rarr; Exportar calendario</li>
            <li><strong>Booking:</strong> Va em Calendario &rarr; Sincronizacao &rarr; Link de exportacao iCal</li>
          </ul>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">URL iCal do Airbnb</label>
            <input
              type="url"
              className="input"
              value={settings.airbnbIcalUrl}
              readOnly
              placeholder="Configurado durante a instalação"
            />
          </div>

          <div className="form-field">
            <label className="label">URL iCal do Booking.com</label>
            <input
              type="url"
              className="input"
              value={settings.bookingIcalUrl}
              readOnly
              placeholder="Configurado durante a instalação"
            />
          </div>
        </div>

        <div className="info-box">
          <p>As URLs iCal são configuradas durante a instalação e usadas pelo sistema de sincronização. Para alterá-las, reconfigure o aplicativo.</p>
        </div>
      </div>
    </div>
  );
};

// ========== ABA AVANCADA ==========
const AdvancedSettings = ({ settings, onChange, autoLaunch, onAutoLaunchChange, rememberLogin, onRememberLoginChange }) => {
  const isElectron = Boolean(window.electronAPI);

  return (
    <div className="settings-section">

      {/* Seção Sistema — apenas no Electron */}
      {isElectron && (
        <div className="section-group">
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Monitor size={16} />
            Sistema
          </h3>
          <p className="section-description">
            Preferências do aplicativo desktop
          </p>

          <div className="form-grid">
            <div className="form-field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoLaunch}
                  onChange={(e) => onAutoLaunchChange(e.target.checked)}
                />
                <span>Iniciar com o Windows</span>
              </label>
              <small className="field-help">
                Abre o LUMINA automaticamente quando o Windows inicializa
              </small>
            </div>

            <div className="form-field checkbox-field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => onRememberLoginChange(e.target.checked)}
                />
                <span>Manter sessão ativa entre reinicializações</span>
              </label>
              <small className="field-help">
                Mantém o login salvo ao fechar e reabrir o aplicativo. Desative para exigir login a cada abertura.
              </small>
            </div>
          </div>
        </div>
      )}

      <div className="section-group">
        <h3 className="section-title">Sincronizacao</h3>
        <p className="section-description">
          Controle de frequencia de atualizacao dos calendarios
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">Intervalo de Sincronizacao (minutos)</label>
            <input
              type="number"
              className="input"
              value={settings.syncIntervalMinutes}
              onChange={(e) => onChange('syncIntervalMinutes', parseInt(e.target.value))}
              min="5"
              max="1440"
            />
            <small className="field-help">
              Frequencia de atualizacao automatica (recomendado: 30 minutos)
            </small>
          </div>
        </div>
      </div>

      <div className="section-group">
        <h3 className="section-title">Telegram Bot</h3>
        <p className="section-description">
          Configuracoes de Telegram definidas durante a instalacao (somente leitura)
        </p>

        <div className="info-box">
          <p>
            <strong>Configurado na instalação.</strong> Para alterar o token ou IDs de administrador,
            reconfigure o aplicativo pelo assistente de instalação.
          </p>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">Token do Bot (mascarado)</label>
            <input
              type="text"
              className="input"
              value={settings.telegramBotToken}
              readOnly
              placeholder="Não configurado"
            />
          </div>
        </div>
      </div>

      <div className="section-group">
        <h3 className="section-title">Configuracoes de Email</h3>
        <p className="section-description">
          Configuracoes de email definidas durante a instalacao (somente leitura)
        </p>

        <div className="info-box">
          <p>
            <strong>Configurado na instalação.</strong> Para alterar provedor, credenciais ou configurações
            SMTP, reconfigure o aplicativo pelo assistente de instalação.
            {settings.emailPasswordSet && (
              <span style={{ marginLeft: 8, color: 'var(--success)', fontWeight: 500 }}>
                ✓ Senha configurada
              </span>
            )}
          </p>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">Provedor de Email</label>
            <input
              type="text"
              className="input"
              value={settings.emailProvider}
              readOnly
              placeholder="Não configurado"
            />
          </div>

          <div className="form-field">
            <label className="label">Email de Envio</label>
            <input
              type="email"
              className="input"
              value={settings.emailFrom}
              readOnly
              placeholder="Não configurado"
            />
          </div>
        </div>
      </div>

      <div className="section-group">
        <h3 className="section-title">Funcionalidades</h3>
        <p className="section-description">
          Ative ou desative recursos do sistema
        </p>

        <div className="form-grid">
          <div className="form-field checkbox-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.enableConflictNotifications}
                onChange={(e) => onChange('enableConflictNotifications', e.target.checked)}
              />
              <span>Notificacoes de Conflitos</span>
            </label>
            <small className="field-help">
              Enviar alertas quando conflitos de reserva forem detectados
            </small>
          </div>

          <div className="form-field checkbox-field">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.enableAutoDocumentGeneration}
                onChange={(e) => onChange('enableAutoDocumentGeneration', e.target.checked)}
              />
              <span>Geracao Automatica de Documentos</span>
            </label>
            <small className="field-help">
              Gerar automaticamente documentos de autorizacao do condominio
            </small>
          </div>
        </div>
      </div>

    </div>
  );
};

// ========== ABA IA ==========
const AI_PURPLE = '#8b5cf6';

const AISettings = ({ settings, onChange, showMessage }) => {
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!settings.aiApiKey) {
      showMessage('Informe a API Key antes de testar', 'error');
      return;
    }
    setTesting(true);
    try {
      const res = await aiAPI.testConnection({
        provider: settings.aiProvider,
        api_key: settings.aiApiKey,
        model: settings.aiModel || getDefaultModel(settings.aiProvider),
        base_url: settings.aiBaseUrl || null,
      });
      const result = res.data;
      showMessage(result.success ? `Conexao OK: ${result.message}` : result.message, result.success ? 'success' : 'error');
    } catch {
      showMessage('Erro ao testar conexao', 'error');
    } finally {
      setTesting(false);
    }
  };

  const getDefaultModel = (provider) => {
    if (provider === 'openai') return 'gpt-4o-mini';
    if (provider === 'compatible') return 'llama3';
    return 'claude-3-5-haiku-latest';
  };

  return (
    <div className="settings-section">
      <div className="section-group">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={18} style={{ color: AI_PURPLE }} />
          Configurar Assistente de IA
        </h3>
        <p className="section-description">
          Configure o provider e credenciais para o assistente LUMINA AI.
          Suporta Claude (Anthropic), GPT (OpenAI) e qualquer provider compativel com API OpenAI.
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">Provider de IA</label>
            <select
              className="select"
              value={settings.aiProvider}
              onChange={(e) => onChange('aiProvider', e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="compatible">Compativel (Ollama, Groq, LM Studio...)</option>
            </select>
          </div>

          <div className="form-field">
            <label className="label">
              API Key
              {settings.aiApiKeySet && (
                <span style={{ marginLeft: 8, fontSize: 11, color: '#22c55e', fontWeight: 400 }}>
                  (configurada no servidor)
                </span>
              )}
            </label>
            <div style={{ position: 'relative', display: 'flex' }}>
              <input
                type={showKey ? 'text' : 'password'}
                className="input"
                value={settings.aiApiKey}
                onChange={(e) => onChange('aiApiKey', e.target.value)}
                placeholder={settings.aiApiKeySet ? '••••••••••••••••••••' : 'sk-ant-... ou sk-...'}
                style={{ flex: 1, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  padding: 0,
                }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <small className="field-help">
              {settings.aiProvider === 'anthropic' && 'Obtenha em: console.anthropic.com'}
              {settings.aiProvider === 'openai' && 'Obtenha em: platform.openai.com'}
              {settings.aiProvider === 'compatible' && 'Chave do provider compativel (pode ser qualquer valor para Ollama local)'}
            </small>
          </div>

          <div className="form-field">
            <label className="label">Modelo</label>
            <input
              type="text"
              className="input"
              value={settings.aiModel}
              onChange={(e) => onChange('aiModel', e.target.value)}
              placeholder={getDefaultModel(settings.aiProvider)}
            />
            <small className="field-help">
              {settings.aiProvider === 'anthropic' && 'Ex: claude-3-5-haiku-latest, claude-3-5-sonnet-latest'}
              {settings.aiProvider === 'openai' && 'Ex: gpt-4o-mini, gpt-4o, gpt-3.5-turbo'}
              {settings.aiProvider === 'compatible' && 'Ex: llama3, gemma3:4b, mistral'}
            </small>
          </div>

          {settings.aiProvider === 'compatible' && (
            <div className="form-field">
              <label className="label">Base URL</label>
              <input
                type="url"
                className="input"
                value={settings.aiBaseUrl}
                onChange={(e) => onChange('aiBaseUrl', e.target.value)}
                placeholder="http://localhost:11434/v1"
              />
              <small className="field-help">
                URL base do provider (ex: Ollama: http://localhost:11434/v1, Groq: https://api.groq.com/openai/v1)
              </small>
            </div>
          )}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            className="btn"
            onClick={handleTest}
            disabled={testing}
            style={{
              background: 'rgba(139, 92, 246, 0.12)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: AI_PURPLE,
            }}
          >
            <Zap size={15} />
            {testing ? 'Testando...' : 'Testar Conexao'}
          </button>
          <small style={{ color: 'var(--text-disable)' }}>
            Testa a conectividade sem salvar
          </small>
        </div>

        <div className="info-box" style={{ marginTop: 20 }}>
          <p>
            <strong>Nota de seguranca:</strong> A API Key e salva de forma segura no banco de dados local.
            Para uso em producao, prefira definir <code>AI_API_KEY</code> no arquivo <code>.env</code>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
