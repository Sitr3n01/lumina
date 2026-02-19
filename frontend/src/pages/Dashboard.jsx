import React, { useEffect, useState } from 'react';
import {
  BarChart, Wallet, Calendar, AlertTriangle,
  ArrowUpRight, ArrowDownRight, RefreshCw, CheckCircle,
  User, Clock, FileText, Send, X
} from 'lucide-react';
import { statisticsAPI, bookingsAPI, conflictsAPI, notificationsAPI } from '../services/api';
import { usePropertyId } from '../contexts/PropertyContext';
import { formatDateShort, formatRelativeTime } from '../utils/formatters';
import './Dashboard.css';

const StatCard = ({ title, value, trend, trendValue, icon: Icon, extraAction }) => (
  <div className="glass-card stat-card">
    <div className="stat-header">
      <span>{title}</span>
      <Icon size={20} />
    </div>
    <div className="stat-value">{value}</div>
    {trendValue && (
      <div className="stat-footer">
        <span className={trend === 'up' ? 'trend-up' : 'trend-down'}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trendValue}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>vs mês passado</span>
      </div>
    )}
    {extraAction}
  </div>
);

const NOTIFICATION_ICONS = {
  new_booking: { icon: CheckCircle, color: 'var(--success)' },
  booking_update: { icon: Calendar, color: 'var(--info)' },
  booking_cancel: { icon: AlertTriangle, color: 'var(--warning)' },
  conflict: { icon: AlertTriangle, color: 'var(--danger)' },
  sync: { icon: RefreshCw, color: 'var(--success)' },
  document: { icon: User, color: '#8b5cf6' },
  email: { icon: User, color: '#06b6d4' },
  system: { icon: Clock, color: 'var(--secondary)' },
};

// formatTime → usando formatRelativeTime de ../utils/formatters

// Modal Component
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>Cancelar</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Enviando...' : 'Confirmar Envio'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { propertyId } = usePropertyId();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    occupancyRate: 0,
    totalRevenue: 0,
    activeBookings: 0,
    conflicts: 0
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // Modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [message, setMessage] = useState(null);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        statisticsAPI.getMonthlyReport(propertyId, new Date().getMonth() + 1, new Date().getFullYear()), // Usar monthly-report para dados precisos
        bookingsAPI.getUpcoming({ limit: 5 }),
        conflictsAPI.getSummary(propertyId),
        notificationsAPI.getAll({ limit: 5 }),
      ]);

      // Statistics (Monthly Report)
      if (results[0].status === 'fulfilled') {
        const data = results[0].value.data;
        setStats(prev => ({
          ...prev,
          occupancyRate: data.occupancy_rate || 0,
          totalRevenue: data.total_revenue || 0,
          activeBookings: data.total_bookings || 0, // Usar total_bookings do mes
        }));
      }

      // Upcoming bookings
      if (results[1].status === 'fulfilled') {
        const data = results[1].value.data;
        setUpcomingBookings(Array.isArray(data) ? data.slice(0, 5) : (data.items || []).slice(0, 5));
      }

      // Conflicts
      if (results[2].status === 'fulfilled') {
        const data = results[2].value.data;
        setStats(prev => ({
          ...prev,
          conflicts: data.active_conflicts ?? data.total ?? 0,
        }));
      }

      // Recent notifications for activity feed
      if (results[3].status === 'fulfilled') {
        const data = results[3].value.data;
        setRecentActivity((data.items || []).slice(0, 5));
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // formatDate → usando formatDateShort de ../utils/formatters

  const handleSendReportClick = () => {
    setShowEmailModal(true);
  };

  const handleConfirmSendReport = async () => {
    setSendingReport(true);
    try {
      const today = new Date();
      await statisticsAPI.getMonthlyReport(propertyId, today.getMonth() + 1, today.getFullYear(), true);
      showMessage('Relatório enviado com sucesso!', 'success');
      setShowEmailModal(false);
    } catch (error) {
      console.error('Error sending report:', error);
      showMessage('Erro ao enviar relatório. Verifique as configurações de email.', 'error');
    } finally {
      setSendingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <RefreshCw size={32} className="spin" />
          <p>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="welcome-text">
          <h1>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Resumo do sistema Lumina</p>
        </div>
        <div className="date-badge">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </header>

      {message && (
        <div className={`message message-${message.type}`} style={{ marginBottom: '20px' }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bento-grid">
        {/* KPI Cards */}
        <StatCard
          title="Ocupação"
          value={`${Math.round(stats.occupancyRate)}%`}
          trend="up"
          icon={BarChart}
        />
        <StatCard
          title="Receita Mensal"
          value={`R$ ${Number(stats.totalRevenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trend="up"
          icon={Wallet}
          extraAction={
            <button
              className="btn btn-secondary"
              onClick={handleSendReportClick}
              style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
            >
              <Send size={14} />
              Enviar Relatório
            </button>
          }
        />
        <StatCard
          title="Reservas Ativas"
          value={stats.activeBookings}
          icon={Calendar}
        />

        {/* Conflict alert card */}
        <div className="glass-card stat-card" style={{
          borderColor: stats.conflicts > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
          background: stats.conflicts > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)'
        }}>
          <div className="stat-header" style={{ color: stats.conflicts > 0 ? 'var(--danger)' : 'var(--success)' }}>
            <span>Conflitos</span>
            <AlertTriangle size={20} />
          </div>
          <div className="stat-value" style={{ color: stats.conflicts > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {stats.conflicts}
          </div>
          <div className="stat-footer">
            <span style={{ color: stats.conflicts > 0 ? 'var(--danger)' : 'var(--success)', fontSize: '12px' }}>
              {stats.conflicts > 0 ? 'Resolver pendências' : 'Nenhum conflito'}
            </span>
          </div>
        </div>

        {/* Upcoming bookings table */}
        <div className="glass-card main-chart-section">
          <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: '600' }}>Próximos Check-ins</h3>
          {upcomingBookings.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Hóspede</th>
                  <th>Plataforma</th>
                  <th>Data</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingBookings.map((b, i) => (
                  <tr key={b.id || i}>
                    <td>{b.guest_name || 'Hóspede'}</td>
                    <td>
                      <span className={`badge badge-${(b.platform || 'manual').toLowerCase()}`}>
                        {b.platform || 'Manual'}
                      </span>
                    </td>
                    <td>{formatDateShort(b.check_in_date || b.check_in)} - {formatDateShort(b.check_out_date || b.check_out)}</td>
                    <td>{b.status || 'Confirmado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <Calendar size={32} />
              <p>Nenhum check-in próximo</p>
            </div>
          )}
        </div>

        {/* Activity feed */}
        <div className="glass-card side-feed-section">
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '10px' }}>Atividade Recente</h3>

          {recentActivity.length > 0 ? (
            <div className="activity-feed">
              {recentActivity.map((item, i) => {
                const cfg = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.system;
                const Icon = cfg.icon;
                return (
                  <div className="feed-item" key={item.id || i}>
                    <div className="feed-icon" style={{ color: cfg.color }}>
                      <Icon size={18} />
                    </div>
                    <div className="feed-content">
                      <h4>{item.title}</h4>
                      <p>{item.message}</p>
                      <div className="feed-time">{formatRelativeTime(item.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 10px' }}>
              <Clock size={24} />
              <p>Nenhuma atividade recente</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onConfirm={handleConfirmSendReport}
        title="Enviar Relatório"
        message="Deseja enviar o relatório financeiro deste mês para o email do proprietário configurado?"
        isLoading={sendingReport}
      />
    </div>
  );
};

export default Dashboard;
