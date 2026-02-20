import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { settingsAPI } from '../services/api';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('easy');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

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

    // Email
    emailProvider: 'gmail',
    emailFrom: '',
    emailPassword: '',
    emailSmtpHost: '',
    emailSmtpPort: 587,
    emailImapHost: '',
    emailImapPort: 993,

    // Features
    enableAutoDocumentGeneration: false,
    enableConflictNotifications: true,
  });

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
          condoName: data.condoName || prev.condoName,
          condoAdminName: data.condoAdminName || prev.condoAdminName,
          condoEmail: data.condoEmail || prev.condoEmail,
          ownerName: data.ownerName || prev.ownerName,
          ownerEmail: data.ownerEmail || prev.ownerEmail,
          ownerPhone: data.ownerPhone || prev.ownerPhone,
          ownerApto: data.ownerApto || prev.ownerApto,
          ownerBloco: data.ownerBloco || prev.ownerBloco,
          ownerGaragem: data.ownerGaragem || prev.ownerGaragem,
          syncIntervalMinutes: data.syncIntervalMinutes || prev.syncIntervalMinutes,
          enableAutoDocumentGeneration: data.enableAutoDocumentGeneration ?? prev.enableAutoDocumentGeneration,
          enableConflictNotifications: data.enableConflictNotifications ?? prev.enableConflictNotifications,
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

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getAll();
      const data = response.data;

      setSettings(prev => ({
        ...prev,
        propertyName: data.propertyName || prev.propertyName,
        propertyAddress: data.propertyAddress || prev.propertyAddress,
        condoName: data.condoName || prev.condoName,
        condoAdminName: data.condoAdminName || prev.condoAdminName,
        condoEmail: data.condoEmail || prev.condoEmail,
        ownerName: data.ownerName || prev.ownerName,
        ownerEmail: data.ownerEmail || prev.ownerEmail,
        ownerPhone: data.ownerPhone || prev.ownerPhone,
        ownerApto: data.ownerApto || prev.ownerApto,
        ownerBloco: data.ownerBloco || prev.ownerBloco,
        ownerGaragem: data.ownerGaragem || prev.ownerGaragem,
        syncIntervalMinutes: data.syncIntervalMinutes || prev.syncIntervalMinutes,
        enableAutoDocumentGeneration: data.enableAutoDocumentGeneration ?? prev.enableAutoDocumentGeneration,
        enableConflictNotifications: data.enableConflictNotifications ?? prev.enableConflictNotifications,
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('Erro ao carregar configuracoes', 'error');
    } finally {
      setLoading(false);
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
      </div>

      <div className="settings-content">
        {activeTab === 'easy' ? (
          <EasySettings settings={settings} onChange={handleChange} />
        ) : (
          <AdvancedSettings settings={settings} onChange={handleChange} />
        )}
      </div>

      <div className="settings-actions">
        <button className="btn btn-secondary" onClick={loadSettings} disabled={saving}>
          <RefreshCw size={16} />
          Restaurar
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
const EasySettings = ({ settings, onChange }) => {
  return (
    <div className="settings-section">
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
              onChange={(e) => onChange('propertyName', e.target.value)}
              placeholder="Ex: Apartamento 2 Quartos - Centro"
            />
          </div>

          <div className="form-field">
            <label className="label">Endereco Completo</label>
            <input
              type="text"
              className="input"
              value={settings.propertyAddress}
              onChange={(e) => onChange('propertyAddress', e.target.value)}
              placeholder="Rua, Numero, Bairro, CEP, Cidade - Estado"
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
              onChange={(e) => onChange('condoName', e.target.value)}
              placeholder="Ex: Condominio Residencial Exemplo"
            />
          </div>

          <div className="form-field">
            <label className="label">Nome da Administracao</label>
            <input
              type="text"
              className="input"
              value={settings.condoAdminName}
              onChange={(e) => onChange('condoAdminName', e.target.value)}
              placeholder="Ex: Administradora XYZ Ltda"
            />
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
          Informacoes fixas do proprietario (carregadas do servidor)
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">Nome Completo</label>
            <input
              type="text"
              className="input"
              value={settings.ownerName}
              readOnly
            />
          </div>

          <div className="form-field">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={settings.ownerEmail}
              readOnly
            />
          </div>

          <div className="form-field">
            <label className="label">Telefone</label>
            <input
              type="text"
              className="input"
              value={settings.ownerPhone}
              readOnly
            />
          </div>

          <div className="form-field">
            <label className="label">Apartamento</label>
            <input
              type="text"
              className="input"
              value={settings.ownerApto}
              readOnly
            />
          </div>

          <div className="form-field">
            <label className="label">Bloco</label>
            <input
              type="text"
              className="input"
              value={settings.ownerBloco}
              readOnly
            />
          </div>

          <div className="form-field">
            <label className="label">Garagem</label>
            <input
              type="text"
              className="input"
              value={settings.ownerGaragem}
              readOnly
            />
          </div>
        </div>

        <div className="info-box">
          <p><strong>Nota:</strong> Os dados do proprietario sao configurados no servidor (.env) e utilizados automaticamente nos documentos de autorizacao.</p>
        </div>
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
              onChange={(e) => onChange('airbnbIcalUrl', e.target.value)}
              placeholder="https://www.airbnb.com/calendar/ical/XXXXXXX.ics"
            />
          </div>

          <div className="form-field">
            <label className="label">URL iCal do Booking.com</label>
            <input
              type="url"
              className="input"
              value={settings.bookingIcalUrl}
              onChange={(e) => onChange('bookingIcalUrl', e.target.value)}
              placeholder="https://admin.booking.com/hotel/hoteladmin/ical/XXXXXXX.ics"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== ABA AVANCADA ==========
const AdvancedSettings = ({ settings, onChange }) => {
  return (
    <div className="settings-section">
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
          Configuracoes para notificacoes via Telegram
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">Token do Bot</label>
            <input
              type="text"
              className="input"
              value={settings.telegramBotToken}
              onChange={(e) => onChange('telegramBotToken', e.target.value)}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            />
            <small className="field-help">
              Obtenha em: @BotFather no Telegram
            </small>
          </div>

          <div className="form-field">
            <label className="label">IDs de Usuarios Admin</label>
            <input
              type="text"
              className="input"
              value={settings.telegramAdminUserIds}
              onChange={(e) => onChange('telegramAdminUserIds', e.target.value)}
              placeholder="123456789,987654321"
            />
            <small className="field-help">
              IDs separados por virgula. Obtenha em: @userinfobot
            </small>
          </div>
        </div>
      </div>

      <div className="section-group">
        <h3 className="section-title">Configuracoes de Email</h3>
        <p className="section-description">
          Configure o provedor e credenciais de email para envio automatico
        </p>

        <div className="form-grid">
          <div className="form-field">
            <label className="label">Provedor de Email</label>
            <select
              className="select"
              value={settings.emailProvider}
              onChange={(e) => onChange('emailProvider', e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
              <option value="yahoo">Yahoo</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          <div className="form-field">
            <label className="label">Email de Envio</label>
            <input
              type="email"
              className="input"
              value={settings.emailFrom}
              onChange={(e) => onChange('emailFrom', e.target.value)}
              placeholder="seu-email@gmail.com"
            />
          </div>

          <div className="form-field">
            <label className="label">Senha / App Password</label>
            <input
              type="password"
              className="input"
              value={settings.emailPassword}
              onChange={(e) => onChange('emailPassword', e.target.value)}
              placeholder="Senha do aplicativo"
            />
            <small className="field-help">
              Para Gmail, use uma Senha de Aplicativo (App Password)
            </small>
          </div>
        </div>

        {settings.emailProvider === 'custom' && (
          <div className="form-grid" style={{ marginTop: '16px' }}>
            <div className="form-field">
              <label className="label">SMTP Host</label>
              <input
                type="text"
                className="input"
                value={settings.emailSmtpHost}
                onChange={(e) => onChange('emailSmtpHost', e.target.value)}
                placeholder="smtp.example.com"
              />
            </div>
            <div className="form-field">
              <label className="label">SMTP Porta</label>
              <input
                type="number"
                className="input"
                value={settings.emailSmtpPort}
                onChange={(e) => onChange('emailSmtpPort', parseInt(e.target.value))}
              />
            </div>
            <div className="form-field">
              <label className="label">IMAP Host</label>
              <input
                type="text"
                className="input"
                value={settings.emailImapHost}
                onChange={(e) => onChange('emailImapHost', e.target.value)}
                placeholder="imap.example.com"
              />
            </div>
            <div className="form-field">
              <label className="label">IMAP Porta</label>
              <input
                type="number"
                className="input"
                value={settings.emailImapPort}
                onChange={(e) => onChange('emailImapPort', parseInt(e.target.value))}
              />
            </div>
          </div>
        )}
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

export default Settings;
