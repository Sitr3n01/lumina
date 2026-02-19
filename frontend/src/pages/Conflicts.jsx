import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, X, Calendar, User } from 'lucide-react';
import { conflictsAPI } from '../services/api';
import { usePropertyId } from '../contexts/PropertyContext';
import { formatDateShort, formatDateTime } from '../utils/formatters';
import './ConflictsPage.css';

const Conflicts = () => {
  const { propertyId } = usePropertyId();
  const [conflicts, setConflicts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [message, setMessage] = useState(null);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        conflictsAPI.getAll({ property_id: propertyId, active_only: true }),
        conflictsAPI.getSummary(propertyId),
      ]);

      if (results[0].status === 'fulfilled') {
        setConflicts(results[0].value.data || []);
      }
      if (results[1].status === 'fulfilled') {
        setSummary(results[1].value.data || {});
      }
    } catch (error) {
      console.error('Error loading conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetectConflicts = async () => {
    try {
      setLoading(true);
      await conflictsAPI.detect(propertyId);
      await loadConflicts();
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      showMessage('Erro ao detectar conflitos', 'error');
    }
  };

  const handleResolve = async () => {
    if (!selectedConflict || !resolutionNotes.trim()) {
      showMessage('Por favor, adicione notas de resolução', 'error');
      return;
    }

    try {
      setResolving(true);
      await conflictsAPI.resolve(selectedConflict.id, resolutionNotes);
      setSelectedConflict(null);
      setResolutionNotes('');
      await loadConflicts();
    } catch (error) {
      console.error('Error resolving conflict:', error);
      showMessage('Erro ao resolver conflito', 'error');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="conflicts-page">
        <div className="loading-state">
          <RefreshCw className="spin" size={32} />
          <p>Carregando conflitos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="conflicts-page">
      <div className="conflicts-header">
        <div>
          <h1>Conflitos de Reservas</h1>
          <p className="subtitle">
            Detecte e resolva sobreposições e duplicatas entre plataformas
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleDetectConflicts}>
          <RefreshCw size={16} />
          Detectar Conflitos
        </button>
      </div>

      {message && (
        <div className={`message message-${message.type}`} style={{ marginBottom: '20px' }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Resumo */}
      {summary && (
        <div className="conflicts-summary">
          <div className={`summary-card ${summary.total > 0 ? 'has-conflicts' : ''}`}>
            <div className="summary-icon">
              {summary.total > 0 ? (
                <AlertTriangle size={32} />
              ) : (
                <CheckCircle size={32} />
              )}
            </div>
            <div className="summary-content">
              <h2 className="summary-number">{summary.total || 0}</h2>
              <p className="summary-label">
                {summary.total === 1 ? 'Conflito Ativo' : 'Conflitos Ativos'}
              </p>
            </div>
          </div>

          <div className="summary-breakdown">
            <div className="breakdown-item">
              <span className="breakdown-label">Por Tipo:</span>
              <div className="breakdown-values">
                <span className="badge badge-warning">
                  {summary.duplicates || 0} Duplicata{summary.duplicates !== 1 ? 's' : ''}
                </span>
                <span className="badge badge-danger">
                  {summary.overlaps || 0} Sobreposiç{summary.overlaps !== 1 ? 'ões' : 'ão'}
                </span>
              </div>
            </div>

            <div className="breakdown-item">
              <span className="breakdown-label">Por Severidade:</span>
              <div className="breakdown-values">
                {summary.critical > 0 && (
                  <span className="badge badge-danger">
                    {summary.critical} Crítico{summary.critical !== 1 ? 's' : ''}
                  </span>
                )}
                {summary.high > 0 && (
                  <span className="badge badge-warning">
                    {summary.high} Alta{summary.high !== 1 ? 's' : ''}
                  </span>
                )}
                {summary.medium > 0 && (
                  <span className="badge badge-info">
                    {summary.medium} Média{summary.medium !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de conflitos */}
      {conflicts.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={64} className="success-icon" />
          <h3>Nenhum conflito detectado!</h3>
          <p>Todas as reservas estão sincronizadas corretamente.</p>
          <button className="btn btn-primary" onClick={handleDetectConflicts}>
            Verificar Novamente
          </button>
        </div>
      ) : (
        <div className="conflicts-list">
          {conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              onResolve={() => setSelectedConflict(conflict)}
            />
          ))}
        </div>
      )}

      {/* Modal de resolução */}
      {selectedConflict && (
        <div className="modal-overlay" onClick={() => setSelectedConflict(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Resolver Conflito</h2>
              <button
                className="modal-close"
                onClick={() => setSelectedConflict(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="conflict-details">
                <h3>Detalhes do Conflito</h3>
                <div className="conflict-info">
                  <span className={`badge badge-${getSeverityColor(selectedConflict.severity)}`}>
                    {getSeverityName(selectedConflict.severity)}
                  </span>
                  <span className={`badge badge-${getTypeColor(selectedConflict.conflict_type)}`}>
                    {getTypeName(selectedConflict.conflict_type)}
                  </span>
                </div>

                <div className="bookings-comparison">
                  <div className="booking-card">
                    <h4>Reserva 1 - {selectedConflict.booking_1_platform}</h4>
                    <p><User size={14} /> {selectedConflict.booking_1_guest}</p>
                    <p><Calendar size={14} /> {selectedConflict.booking_1_dates}</p>
                  </div>

                  <div className="versus">VS</div>

                  <div className="booking-card">
                    <h4>Reserva 2 - {selectedConflict.booking_2_platform}</h4>
                    <p><User size={14} /> {selectedConflict.booking_2_guest}</p>
                    <p><Calendar size={14} /> {selectedConflict.booking_2_dates}</p>
                  </div>
                </div>

                {selectedConflict.overlap_start && (
                  <div className="overlap-info">
                    <p><strong>Período de Sobreposição:</strong></p>
                    <p>
                      {formatDateShort(selectedConflict.overlap_start)} até{' '}
                      {formatDateShort(selectedConflict.overlap_end)}
                    </p>
                    <p>({selectedConflict.overlap_nights} noite{selectedConflict.overlap_nights !== 1 ? 's' : ''})</p>
                  </div>
                )}
              </div>

              <div className="resolution-form">
                <label className="label">
                  Notas de Resolução
                  <span className="required">*</span>
                </label>
                <textarea
                  className="input"
                  rows="4"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Ex: Cancelada reserva do Airbnb, mantida reserva do Booking.com"
                />
                <small className="field-help">
                  Descreva como o conflito foi resolvido
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedConflict(null)}
                disabled={resolving}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleResolve}
                disabled={resolving || !resolutionNotes.trim()}
              >
                {resolving ? 'Resolvendo...' : 'Marcar como Resolvido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de card de conflito
const ConflictCard = ({ conflict, onResolve }) => {
  return (
    <div className={`conflict-card severity-${conflict.severity}`}>
      <div className="conflict-card-header">
        <div className="conflict-badges">
          <span className={`badge badge-${getSeverityColor(conflict.severity)}`}>
            {getSeverityName(conflict.severity)}
          </span>
          <span className={`badge badge-${getTypeColor(conflict.conflict_type)}`}>
            {getTypeName(conflict.conflict_type)}
          </span>
        </div>
        <span className="conflict-date">
          Detectado em {formatDateTime(conflict.detected_at)}
        </span>
      </div>

      <div className="conflict-card-body">
        <div className="booking-row">
          <div className="booking-info">
            <span className={`platform-badge platform-${conflict.booking_1_platform}`}>
              {conflict.booking_1_platform}
            </span>
            <span className="guest-name">{conflict.booking_1_guest}</span>
            <span className="dates">{conflict.booking_1_dates}</span>
          </div>
        </div>

        <div className="conflict-vs">
          <AlertTriangle size={16} />
          <span>CONFLITO</span>
        </div>

        <div className="booking-row">
          <div className="booking-info">
            <span className={`platform-badge platform-${conflict.booking_2_platform}`}>
              {conflict.booking_2_platform}
            </span>
            <span className="guest-name">{conflict.booking_2_guest}</span>
            <span className="dates">{conflict.booking_2_dates}</span>
          </div>
        </div>

        {conflict.overlap_nights > 0 && (
          <div className="overlap-badge">
            Sobreposição de {conflict.overlap_nights} noite{conflict.overlap_nights !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="conflict-card-footer">
        <button className="btn btn-primary" onClick={onResolve}>
          Resolver Conflito
        </button>
      </div>
    </div>
  );
};

// Utilitários
const getSeverityColor = (severity) => {
  const colors = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'success',
  };
  return colors[severity] || 'secondary';
};

const getSeverityName = (severity) => {
  const names = {
    critical: 'Crítico',
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa',
  };
  return names[severity] || severity;
};

const getTypeColor = (type) => {
  const colors = {
    duplicate: 'warning',
    overlap: 'danger',
  };
  return colors[type] || 'secondary';
};

const getTypeName = (type) => {
  const names = {
    duplicate: 'Duplicata',
    overlap: 'Sobreposição',
  };
  return names[type] || type;
};

// formatDate e formatDateTime importados de ../utils/formatters

export default Conflicts;
