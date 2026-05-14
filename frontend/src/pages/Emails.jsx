import { useState } from 'react';
import {
  Mail,
  Send,
  Inbox,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Zap,
  Search
} from 'lucide-react';
import { emailsAPI } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import './Emails.css';

const Emails = () => {
  const [activeTab, setActiveTab] = useState('send');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [emails, setEmails] = useState([]);

  // Forms
  const [sendForm, setSendForm] = useState({
    to: '',
    subject: '',
    body: '',
    html: false,
  });

  const [confirmationForm, setConfirmationForm] = useState({ booking_id: '' });
  const [reminderForm, setReminderForm] = useState({ booking_id: '' });
  const [bulkForm, setBulkForm] = useState({ days_before: 1 });

  const [fetchForm, setFetchForm] = useState({
    folder: 'INBOX',
    limit: 10,
    unread_only: false,
  });

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // === SEND EMAIL ===
  const handleSendEmail = async () => {
    if (!sendForm.to.trim() || !sendForm.subject.trim() || !sendForm.body.trim()) {
      showMessage('Preencha todos os campos obrigatorios', 'error');
      return;
    }

    try {
      setSending(true);
      const recipients = sendForm.to.split(',').map(email => email.trim()).filter(Boolean);
      await emailsAPI.send({
        to: recipients,
        subject: sendForm.subject,
        body: sendForm.body,
        html: sendForm.html,
      });
      showMessage('Email enviado com sucesso!', 'success');
      setSendForm({ to: '', subject: '', body: '', html: false });
    } catch (error) {
      console.error('Error sending email:', error);
      showMessage('Erro ao enviar email. Verifique as configuracoes SMTP.', 'error');
    } finally {
      setSending(false);
    }
  };

  // === FETCH EMAILS ===
  const handleFetchEmails = async () => {
    try {
      setLoading(true);
      const response = await emailsAPI.fetch({
        folder: fetchForm.folder,
        limit: fetchForm.limit,
        unread_only: fetchForm.unread_only,
      });
      setEmails(response.data?.emails || response.data || []);
      showMessage(`${(response.data?.emails || response.data || []).length} email(s) encontrado(s)`, 'success');
    } catch (error) {
      console.error('Error fetching emails:', error);
      showMessage('Erro ao buscar emails. Verifique as configuracoes IMAP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // === AUTOMATIONS ===
  const handleSendConfirmation = async () => {
    if (!confirmationForm.booking_id) {
      showMessage('Informe o ID da reserva', 'error');
      return;
    }
    try {
      setSending(true);
      await emailsAPI.sendBookingConfirmation({ booking_id: parseInt(confirmationForm.booking_id) });
      showMessage('Confirmacao enviada com sucesso!', 'success');
      setConfirmationForm({ booking_id: '' });
    } catch (error) {
      console.error('Error sending confirmation:', error);
      showMessage('Erro ao enviar confirmacao', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSendReminder = async () => {
    if (!reminderForm.booking_id) {
      showMessage('Informe o ID da reserva', 'error');
      return;
    }
    try {
      setSending(true);
      await emailsAPI.sendCheckinReminder({ booking_id: parseInt(reminderForm.booking_id) });
      showMessage('Lembrete enviado com sucesso!', 'success');
      setReminderForm({ booking_id: '' });
    } catch (error) {
      console.error('Error sending reminder:', error);
      showMessage('Erro ao enviar lembrete', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSendBulkReminders = async () => {
    try {
      setSending(true);
      const response = await emailsAPI.sendBulkReminders({ days_before: bulkForm.days_before });
      const count = response.data?.sent_count || 0;
      showMessage(`${count} lembrete(s) enviado(s) com sucesso!`, 'success');
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      showMessage('Erro ao enviar lembretes em massa', 'error');
    } finally {
      setSending(false);
    }
  };

  // === TEST CONNECTION ===
  const handleTestConnection = async () => {
    try {
      setLoading(true);
      setConnectionStatus(null);
      const response = await emailsAPI.testConnection();
      setConnectionStatus(response.data);
      showMessage('Teste de conexao concluido', 'success');
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionStatus({ smtp: false, imap: false, message: 'Erro ao testar conexao' });
      showMessage('Erro ao testar conexao', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="emails-page">
      <div className="emails-header">
        <div>
          <h1>Emails</h1>
          <p className="subtitle">Envie confirmacoes, lembretes e gerencie comunicacoes</p>
        </div>
      </div>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${activeTab === 'send' ? 'active' : ''}`} onClick={() => setActiveTab('send')}>
          <Send size={14} />
          Enviar Email
        </button>
        <button className={`tab ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
          <Inbox size={14} />
          Caixa de Entrada
        </button>
        <button className={`tab ${activeTab === 'automation' ? 'active' : ''}`} onClick={() => setActiveTab('automation')}>
          <Zap size={14} />
          Automacoes
        </button>
        <button className={`tab ${activeTab === 'connection' ? 'active' : ''}`} onClick={() => setActiveTab('connection')}>
          <RefreshCw size={14} />
          Conexao
        </button>
      </div>

      <div className="emails-content">
        {activeTab === 'send' && (
          <SendTab
            form={sendForm}
            onChange={setSendForm}
            onSend={handleSendEmail}
            sending={sending}
          />
        )}
        {activeTab === 'inbox' && (
          <InboxTab
            emails={emails}
            fetchForm={fetchForm}
            onFetchFormChange={setFetchForm}
            onFetch={handleFetchEmails}
            loading={loading}
          />
        )}
        {activeTab === 'automation' && (
          <AutomationTab
            confirmationForm={confirmationForm}
            reminderForm={reminderForm}
            bulkForm={bulkForm}
            onConfirmationChange={setConfirmationForm}
            onReminderChange={setReminderForm}
            onBulkChange={setBulkForm}
            onSendConfirmation={handleSendConfirmation}
            onSendReminder={handleSendReminder}
            onSendBulk={handleSendBulkReminders}
            sending={sending}
          />
        )}
        {activeTab === 'connection' && (
          <ConnectionTab
            status={connectionStatus}
            onTest={handleTestConnection}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

// === TAB: ENVIAR EMAIL ===
const SendTab = ({ form, onChange, onSend, sending }) => {
  const handleChange = (field, value) => {
    onChange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="email-form">
      <div className="form-field">
        <label className="label">Para *</label>
        <input
          type="text"
          className="input"
          value={form.to}
          onChange={(e) => handleChange('to', e.target.value)}
          placeholder="email@exemplo.com (separe multiplos com virgula)"
        />
      </div>
      <div className="form-field">
        <label className="label">Assunto *</label>
        <input
          type="text"
          className="input"
          value={form.subject}
          onChange={(e) => handleChange('subject', e.target.value)}
          placeholder="Assunto do email"
        />
      </div>
      <div className="form-field">
        <label className="label">Corpo *</label>
        <textarea
          className="textarea"
          rows="8"
          value={form.body}
          onChange={(e) => handleChange('body', e.target.value)}
          placeholder="Conteudo do email..."
        />
      </div>
      <div className="form-field checkbox-field">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.html}
            onChange={(e) => handleChange('html', e.target.checked)}
          />
          <span>Enviar como HTML</span>
        </label>
      </div>
      <div className="form-actions">
        <button className="btn btn-primary" onClick={onSend} disabled={sending}>
          <Send size={16} />
          {sending ? 'Enviando...' : 'Enviar Email'}
        </button>
      </div>
    </div>
  );
};

// === TAB: CAIXA DE ENTRADA ===
const InboxTab = ({ emails, fetchForm, onFetchFormChange, onFetch, loading }) => {
  const handleChange = (field, value) => {
    onFetchFormChange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="inbox-section">
      <div className="inbox-filters">
        <div className="filter-group">
          <label className="label">Pasta</label>
          <select
            className="select"
            value={fetchForm.folder}
            onChange={(e) => handleChange('folder', e.target.value)}
          >
            <option value="INBOX">Caixa de Entrada</option>
            <option value="SENT">Enviados</option>
            <option value="DRAFTS">Rascunhos</option>
          </select>
        </div>
        <div className="filter-group">
          <label className="label">Limite</label>
          <input
            type="number"
            className="input filter-input"
            value={fetchForm.limit}
            onChange={(e) => handleChange('limit', parseInt(e.target.value) || 10)}
            min="1"
            max="50"
          />
        </div>
        <div className="filter-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={fetchForm.unread_only}
              onChange={(e) => handleChange('unread_only', e.target.checked)}
            />
            <span>Somente nao lidos</span>
          </label>
        </div>
        <button className="btn btn-primary" onClick={onFetch} disabled={loading}>
          <Search size={16} />
          {loading ? 'Buscando...' : 'Buscar Emails'}
        </button>
      </div>

      {emails.length === 0 ? (
        <div className="empty-state">
          <Inbox size={48} />
          <h3>Nenhum email encontrado</h3>
          <p>Clique em "Buscar Emails" para carregar a caixa de entrada.</p>
        </div>
      ) : (
        <div className="email-list">
          {emails.map((email, index) => (
            <div key={index} className={`email-card ${email.unread ? 'unread' : ''}`}>
              <div className="email-card-header">
                <div className="email-sender">
                  <Mail size={14} />
                  <span>{email.from || email.sender || 'Desconhecido'}</span>
                </div>
                <span className="email-date">{email.date ? formatDateTime(email.date) : ''}</span>
              </div>
              <p className="email-subject">{email.subject || '(Sem assunto)'}</p>
              {email.body_preview && (
                <p className="email-preview">{email.body_preview}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// === TAB: AUTOMACOES ===
const AutomationTab = ({
  confirmationForm, reminderForm, bulkForm,
  onConfirmationChange, onReminderChange, onBulkChange,
  onSendConfirmation, onSendReminder, onSendBulk,
  sending
}) => {
  return (
    <div className="automation-grid">
      <div className="automation-card">
        <h3 className="automation-title">
          <CheckCircle size={20} />
          Confirmacao de Reserva
        </h3>
        <p className="automation-description">
          Envia um email de confirmacao com os detalhes da reserva para o hospede.
        </p>
        <div className="form-field">
          <label className="label">ID da Reserva</label>
          <input
            type="number"
            className="input"
            value={confirmationForm.booking_id}
            onChange={(e) => onConfirmationChange({ booking_id: e.target.value })}
            placeholder="Ex: 1, 2, 3..."
          />
        </div>
        <button className="btn btn-primary" onClick={onSendConfirmation} disabled={sending}>
          <Send size={16} />
          Enviar Confirmacao
        </button>
      </div>

      <div className="automation-card">
        <h3 className="automation-title">
          <Clock size={20} />
          Lembrete de Check-in
        </h3>
        <p className="automation-description">
          Envia um lembrete automatico com informacoes de check-in para o hospede.
        </p>
        <div className="form-field">
          <label className="label">ID da Reserva</label>
          <input
            type="number"
            className="input"
            value={reminderForm.booking_id}
            onChange={(e) => onReminderChange({ booking_id: e.target.value })}
            placeholder="Ex: 1, 2, 3..."
          />
        </div>
        <button className="btn btn-primary" onClick={onSendReminder} disabled={sending}>
          <Send size={16} />
          Enviar Lembrete
        </button>
      </div>

      <div className="automation-card">
        <h3 className="automation-title">
          <Zap size={20} />
          Lembretes em Massa
        </h3>
        <p className="automation-description">
          Envia lembretes automaticos para todos os hospedes com check-in proximo.
        </p>
        <div className="form-field">
          <label className="label">Dias antes do check-in</label>
          <input
            type="number"
            className="input"
            value={bulkForm.days_before}
            onChange={(e) => onBulkChange({ days_before: parseInt(e.target.value) || 1 })}
            min="1"
            max="7"
          />
          <small className="field-help">
            Enviar para reservas com check-in nos proximos X dias
          </small>
        </div>
        <button className="btn btn-primary" onClick={onSendBulk} disabled={sending}>
          <Zap size={16} />
          Enviar Lembretes
        </button>
      </div>
    </div>
  );
};

// === TAB: CONEXAO ===
const ConnectionTab = ({ status, onTest, loading }) => {
  return (
    <div className="connection-section">
      <div className="connection-info">
        <p>
          Teste a conexao SMTP (envio) e IMAP (recebimento) para verificar se as
          configuracoes de email estao corretas.
        </p>
      </div>

      <button className="btn btn-primary" onClick={onTest} disabled={loading}>
        <RefreshCw size={16} className={loading ? 'spin' : ''} />
        {loading ? 'Testando...' : 'Testar Conexao'}
      </button>

      {status && (
        <div className="connection-grid">
          <div className={`connection-card ${status.smtp ? 'success' : 'error'}`}>
            <div className="connection-icon">
              {status.smtp ? <CheckCircle size={36} /> : <XCircle size={36} />}
            </div>
            <h3>SMTP (Envio)</h3>
            <p className="connection-status-text">
              {status.smtp ? 'Conectado' : 'Falha na conexao'}
            </p>
          </div>

          <div className={`connection-card ${status.imap ? 'success' : 'error'}`}>
            <div className="connection-icon">
              {status.imap ? <CheckCircle size={36} /> : <XCircle size={36} />}
            </div>
            <h3>IMAP (Recebimento)</h3>
            <p className="connection-status-text">
              {status.imap ? 'Conectado' : 'Falha na conexao'}
            </p>
          </div>
        </div>
      )}

      {status?.message && (
        <div className="connection-message">
          <p>{status.message}</p>
        </div>
      )}
    </div>
  );
};

// formatDate → usando formatDateTime de ../utils/formatters

export default Emails;
