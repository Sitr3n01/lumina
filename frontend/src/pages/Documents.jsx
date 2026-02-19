import { useState, useEffect } from 'react';
import {
  FileText,
  FilePlus,
  Download,
  Trash2,
  RefreshCw,
  X,
  Calendar as CalendarIcon,
  User,
  Building,
  Car,
  Users,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus
} from 'lucide-react';
import { documentsAPI, bookingsAPI } from '../services/api';
import { formatDateTimeFull } from '../utils/formatters';
import './Documents.css';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMode, setGenerateMode] = useState('booking');
  const [message, setMessage] = useState(null);
  const [bookingId, setBookingId] = useState('');
  const [formData, setFormData] = useState({
    // Hospede
    guest_name: '',
    guest_cpf: '',
    guest_phone: '',
    guest_celular: '',
    guest_address: '',
    guest_bairro: '',
    guest_cidade: '',
    guest_estado: '',
    guest_cep: '',
    // Veiculo
    guest_vehicle: '',
    guest_plate: '',
    // Reserva
    check_in: '',
    check_out: '',
  });
  const [companions, setCompanions] = useState([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsAPI.list();
      setDocuments(response.data?.documents || response.data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDownload = async (filename) => {
    try {
      const response = await documentsAPI.download(filename);

      if (window.electronAPI) {
        const result = await window.electronAPI.saveFile({
          defaultPath: filename,
          filters: [
            { name: 'Word Documents', extensions: ['docx'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          data: Array.from(new Uint8Array(response.data))
        });
        if (result.success) {
          showMessage('Documento salvo com sucesso!', 'success');
        }
      } else {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      showMessage('Erro ao baixar documento', 'error');
    }
  };

  const handleDelete = async (filename) => {
    let confirmed = false;

    if (window.electronAPI) {
      confirmed = await window.electronAPI.showConfirmDialog({
        title: 'Confirmar Exclusão',
        message: `Deseja realmente excluir "${filename}"?`,
        buttons: ['Cancelar', 'Excluir'],
        defaultId: 0,
        cancelId: 0,
      });
    } else {
      confirmed = window.confirm(`Deseja realmente excluir "${filename}"?`);
    }

    if (!confirmed) return;

    try {
      await documentsAPI.delete(filename);
      showMessage('Documento excluido com sucesso', 'success');
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      showMessage('Erro ao excluir documento', 'error');
    }
  };

  const handleGenerateFromBooking = async () => {
    if (!bookingId.trim()) {
      showMessage('Informe o ID da reserva', 'error');
      return;
    }

    try {
      setGenerating(true);
      await documentsAPI.generateFromBooking({
        booking_id: parseInt(bookingId),
        save_to_file: true,
      });
      showMessage('Documento gerado com sucesso!', 'success');
      setShowGenerateModal(false);
      setBookingId('');
      await loadDocuments();
    } catch (error) {
      console.error('Error generating document:', error);
      showMessage('Erro ao gerar documento. Verifique o ID da reserva.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateReceipt = async () => {
    if (!bookingId.trim()) {
      showMessage('Informe o ID da reserva', 'error');
      return;
    }

    try {
      setGenerating(true);
      await documentsAPI.generateReceiptFromBooking({
        booking_id: parseInt(bookingId),
        save_to_file: true,
      });
      showMessage('Recibo gerado com sucesso!', 'success');
      setShowGenerateModal(false);
      setBookingId('');
      await loadDocuments();
    } catch (error) {
      console.error('Error generating receipt:', error);
      showMessage('Erro ao gerar recibo. Verifique o ID da reserva.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateManual = async () => {
    if (!formData.guest_name || !formData.check_in || !formData.check_out) {
      showMessage('Preencha os campos obrigatorios (nome, check-in, check-out)', 'error');
      return;
    }

    try {
      setGenerating(true);

      // Montar payload no formato esperado pelo backend
      const payload = {
        guest: {
          name: formData.guest_name,
          cpf: formData.guest_cpf || null,
          phone: formData.guest_phone || null,
          celular: formData.guest_celular || null,
          address: formData.guest_address || null,
          bairro: formData.guest_bairro || null,
          cidade: formData.guest_cidade || null,
          estado: formData.guest_estado || null,
          cep: formData.guest_cep || null,
          vehicle: formData.guest_vehicle || null,
          plate: formData.guest_plate || null,
          companions: companions.length > 0
            ? companions.filter(c => c.name.trim()).map(c => ({
              name: c.name,
              document: c.document || null
            }))
            : null,
        },
        property: {
          name: '',   // Preenchido pelo backend via settings
          address: '',
          condo_name: '',
          owner_name: '',
        },
        booking: {
          check_in: formData.check_in,
          check_out: formData.check_out,
        },
        save_to_file: true,
      };

      await documentsAPI.generate(payload);
      showMessage('Documento gerado com sucesso!', 'success');
      setShowGenerateModal(false);
      resetForm();
      await loadDocuments();
    } catch (error) {
      console.error('Error generating document:', error);
      showMessage('Erro ao gerar documento', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      guest_name: '', guest_cpf: '', guest_phone: '', guest_celular: '',
      guest_address: '', guest_bairro: '', guest_cidade: '', guest_estado: '',
      guest_cep: '', guest_vehicle: '', guest_plate: '',
      check_in: '', check_out: '',
    });
    setCompanions([]);
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCompanion = () => {
    if (companions.length >= 5) return;
    setCompanions(prev => [...prev, { name: '', document: '' }]);
  };

  const removeCompanion = (index) => {
    setCompanions(prev => prev.filter((_, i) => i !== index));
  };

  const updateCompanion = (index, field, value) => {
    setCompanions(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  if (loading) {
    return (
      <div className="documents-page">
        <div className="loading-state">
          <RefreshCw className="spin" size={32} />
          <p>Carregando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="documents-page">
      <div className="documents-header">
        <div>
          <h1>Documentos</h1>
          <p className="subtitle">Gere e gerencie autorizacoes de hospedagem do condominio</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadDocuments}>
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button className="btn btn-primary" onClick={() => setShowGenerateModal(true)}>
            <FilePlus size={16} />
            Gerar Autorizacao
          </button>
        </div>
      </div>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Stats */}
      <div className="documents-stats">
        <div className="doc-stat-card">
          <div className="doc-stat-icon">
            <FileText size={20} />
          </div>
          <div className="doc-stat-content">
            <p className="doc-stat-value">{documents.length}</p>
            <p className="doc-stat-label">Total de Documentos</p>
          </div>
        </div>
      </div>

      {/* Lista de documentos */}
      {documents.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>Nenhum documento gerado</h3>
          <p>Clique em "Gerar Autorizacao" para criar uma autorizacao de hospedagem.</p>
        </div>
      ) : (
        <div className="documents-list">
          {documents.map((doc, index) => (
            <div key={doc.filename || index} className="document-card">
              <div className="document-info">
                <div className="document-icon">
                  <FileText size={24} />
                </div>
                <div className="document-details">
                  <p className="document-name">{doc.filename || doc.name}</p>
                  <p className="document-meta">
                    {doc.size_kb && `${doc.size_kb} KB`}
                    {doc.created_at && ` • ${formatDateTimeFull(doc.created_at)}`}
                  </p>
                </div>
              </div>
              <div className="document-actions">
                <button
                  className="btn-icon"
                  onClick={() => handleDownload(doc.filename || doc.name)}
                  title="Baixar"
                >
                  <Download size={16} />
                </button>
                <button
                  className="btn-icon btn-icon-danger"
                  onClick={() => handleDelete(doc.filename || doc.name)}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Geracao */}
      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Gerar Autorizacao de Hospedagem</h2>
              <button className="modal-close" onClick={() => setShowGenerateModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="tabs">
                <button
                  className={`tab ${generateMode === 'booking' ? 'active' : ''}`}
                  onClick={() => setGenerateMode('booking')}
                >
                  A partir de Reserva
                </button>
                <button
                  className={`tab ${generateMode === 'manual' ? 'active' : ''}`}
                  onClick={() => setGenerateMode('manual')}
                >
                  Preenchimento Manual
                </button>
              </div>

              {generateMode === 'booking' ? (
                <div className="generate-form">
                  <div className="form-field">
                    <label className="label">ID da Reserva *</label>
                    <input
                      type="number"
                      className="input"
                      value={bookingId}
                      onChange={(e) => setBookingId(e.target.value)}
                      placeholder="Ex: 1, 2, 3..."
                    />
                    <small className="field-help">
                      O documento sera gerado com os dados da reserva selecionada
                    </small>
                  </div>

                  <div className="button-group" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleGenerateFromBooking}
                      disabled={generating}
                      style={{ flex: 1 }}
                    >
                      <FilePlus size={16} />
                      Gerar Autorizacao
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleGenerateReceipt}
                      disabled={generating}
                      style={{ flex: 1 }}
                    >
                      <FileText size={16} />
                      Gerar Recibo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="generate-form">
                  {/* Dados do Hospede */}
                  <div className="form-section">
                    <h4 className="form-section-title">
                      <User size={16} />
                      Dados do Hospede
                    </h4>
                    <div className="form-grid">
                      <div className="form-field">
                        <label className="label">Nome Completo *</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.guest_name}
                          onChange={(e) => handleFormChange('guest_name', e.target.value)}
                          placeholder="Nome do hospede"
                        />
                      </div>
                      <div className="form-field">
                        <label className="label">CPF</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.guest_cpf}
                          onChange={(e) => handleFormChange('guest_cpf', e.target.value)}
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div className="form-field">
                        <label className="label">Telefone</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.guest_phone}
                          onChange={(e) => handleFormChange('guest_phone', e.target.value)}
                          placeholder="(00) 0000-0000"
                        />
                      </div>
                      <div className="form-field">
                        <label className="label">Celular</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.guest_celular}
                          onChange={(e) => handleFormChange('guest_celular', e.target.value)}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Endereco do Hospede */}
                  <div className="form-section">
                    <h4 className="form-section-title">
                      <Building size={16} />
                      Endereco do Hospede
                    </h4>
                    <div className="form-grid">
                      <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                        <label className="label">Endereco</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.guest_address}
                          onChange={(e) => handleFormChange('guest_address', e.target.value)}
                          placeholder="Rua, Numero, Complemento"
                        />
                      </div>
                      <div className="form-field">
                        <label className="label">Bairro</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.guest_bairro}
                          onChange={(e) => handleFormChange('guest_bairro', e.target.value)}
                          placeholder="Bairro"
                        />
                      </div>
                      <div className="form-field">
                        <label className="label">Cidade</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.guest_cidade}
                          onChange={(e) => handleFormChange('guest_cidade', e.target.value)}
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="form-field">
                        <label className="label">Estado</label>
                        <select
                          className="select"
                          value={formData.guest_estado}
                          onChange={(e) => handleFormChange('guest_estado', e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">Selecione</option>
                          {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field">
                        <label className="label">CEP</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.guest_cep}
                          onChange={(e) => handleFormChange('guest_cep', e.target.value)}
                          placeholder="00000-000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Periodo da Reserva */}
                  <div className="form-section">
                    <h4 className="form-section-title">
                      <CalendarIcon size={16} />
                      Periodo da Reserva
                    </h4>
                    <div className="form-grid">
                      <div className="form-field">
                        <label className="label">Entrada (Check-in) *</label>
                        <input
                          type="date"
                          className="input"
                          value={formData.check_in}
                          onChange={(e) => handleFormChange('check_in', e.target.value)}
                        />
                      </div>
                      <div className="form-field">
                        <label className="label">Saida (Check-out) *</label>
                        <input
                          type="date"
                          className="input"
                          value={formData.check_out}
                          onChange={(e) => handleFormChange('check_out', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acompanhantes */}
                  <div className="form-section">
                    <h4 className="form-section-title">
                      <Users size={16} />
                      Acompanhantes
                      <small style={{ fontWeight: 400, marginLeft: 8, color: 'var(--text-secondary)' }}>
                        (maximo 5)
                      </small>
                    </h4>

                    {companions.map((comp, index) => (
                      <div key={index} className="companion-row">
                        <span className="companion-number">{String(index + 2).padStart(2, '0')}</span>
                        <div className="form-field" style={{ flex: 1 }}>
                          <input
                            type="text"
                            className="input"
                            value={comp.name}
                            onChange={(e) => updateCompanion(index, 'name', e.target.value)}
                            placeholder="Nome do acompanhante"
                          />
                        </div>
                        <div className="form-field" style={{ flex: 0.6 }}>
                          <input
                            type="text"
                            className="input"
                            value={comp.document}
                            onChange={(e) => updateCompanion(index, 'document', e.target.value)}
                            placeholder="RG ou CPF"
                          />
                        </div>
                        <button
                          className="btn-icon btn-icon-danger"
                          onClick={() => removeCompanion(index)}
                          title="Remover"
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    ))}

                    {companions.length < 5 && (
                      <button className="btn btn-secondary btn-sm" onClick={addCompanion}>
                        <Plus size={14} />
                        Adicionar Acompanhante
                      </button>
                    )}
                  </div>

                  {/* Veiculo */}
                  <div className="form-section">
                    <h4 className="form-section-title">
                      <Car size={16} />
                      Veiculo
                    </h4>
                    <div className="form-grid">
                      <div className="form-field">
                        <label className="label">Veiculo / Modelo</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.guest_vehicle}
                          onChange={(e) => handleFormChange('guest_vehicle', e.target.value)}
                          placeholder="Ex: Honda Civic 2022"
                        />
                      </div>
                      <div className="form-field">
                        <label className="label">Placa</label>
                        <input
                          type="text"
                          className="input"
                          value={formData.guest_plate}
                          onChange={(e) => handleFormChange('guest_plate', e.target.value)}
                          placeholder="ABC-1234"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
              >
                Cancelar
              </button>
              {generateMode === 'manual' && (
                <button
                  className="btn btn-primary"
                  onClick={handleGenerateManual}
                  disabled={generating}
                >
                  <FilePlus size={16} />
                  {generating ? 'Gerando...' : 'Gerar Autorizacao'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// formatDate → usando formatDateTimeFull de ../utils/formatters

export default Documents;
