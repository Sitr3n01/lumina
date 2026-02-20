import { useState, useEffect } from 'react';
import {
  Bell,
  RefreshCw,
  CheckCheck,
  Calendar,
  AlertTriangle,
  FileText,
  Mail,
  Zap,
  Clock,
  Eye,
  XCircle,
  ArrowDownCircle
} from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/formatters';
import './Notifications.css';

const TYPE_CONFIG = {
  new_booking: { label: 'Nova Reserva', icon: Calendar, color: '#2563eb' },
  booking_update: { label: 'Atualizacao', icon: Calendar, color: '#2563eb' },
  booking_cancel: { label: 'Cancelamento', icon: XCircle, color: '#f59e0b' },
  conflict: { label: 'Conflito', icon: AlertTriangle, color: '#ef4444' },
  sync: { label: 'Sincronizacao', icon: RefreshCw, color: '#10b981' },
  document: { label: 'Documento', icon: FileText, color: '#8b5cf6' },
  email: { label: 'Email', icon: Mail, color: '#06b6d4' },
  system: { label: 'Sistema', icon: Zap, color: '#64748b' },
};

const FILTER_TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'new_booking,booking_update,booking_cancel', label: 'Reservas' },
  { id: 'conflict', label: 'Conflitos' },
  { id: 'sync', label: 'Sync' },
  { id: 'document', label: 'Documentos' },
  { id: 'email', label: 'Emails' },
];

const Notifications = () => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unread: 0, today: 0, by_type: {} });
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadSummary(),
          loadNotifications(1),
        ]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = { page: 1, limit: 20 };
        if (activeFilter !== 'all') {
          params.type = activeFilter;
        }
        const response = await notificationsAPI.getAll(params);
        if (cancelled) return;
        const data = response.data;

        setNotifications(data.items);
        setTotal(data.total);
        setUnreadCount(data.unread_count);
        setPage(1);
      } catch (error) {
        if (!cancelled) console.error('Error loading notifications:', error);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSummary(),
        loadNotifications(1),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await notificationsAPI.getSummary();
      setSummary(response.data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const loadNotifications = async (pageNum) => {
    try {
      const params = { page: pageNum, limit: 20 };
      if (activeFilter !== 'all') {
        params.type = activeFilter;
      }
      const response = await notificationsAPI.getAll(params);
      const data = response.data;

      if (pageNum === 1) {
        setNotifications(data.items);
      } else {
        setNotifications(prev => [...prev, ...data.items]);
      }
      setTotal(data.total);
      setUnreadCount(data.unread_count);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      setSummary(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      setSummary(prev => ({ ...prev, unread: 0 }));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleLoadMore = () => {
    loadNotifications(page + 1);
  };

  // formatTime → usando formatRelativeTime de ../utils/formatters

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="loading-state">
          <RefreshCw className="spin" size={32} />
          <p>Carregando notificacoes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notifications-header">
        <div>
          <h1>Central de Notificacoes</h1>
          <p className="subtitle">Acompanhe todos os eventos do sistema em tempo real</p>
        </div>
        <div className="header-actions">
          {summary.unread > 0 && (
            <button className="btn btn-secondary" onClick={handleMarkAllAsRead}>
              <CheckCheck size={16} />
              Marcar tudo como lido
            </button>
          )}
          <button className="btn btn-primary" onClick={loadData}>
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Bento Grid - Summary Cards */}
      <div className="bento-grid">
        <div className="glass-card glass-card-unread">
          <div className="glass-card-icon">
            <Bell size={22} />
          </div>
          <div className="glass-card-value">{summary.unread}</div>
          <div className="glass-card-label">Nao Lidas</div>
        </div>

        <div className="glass-card glass-card-today">
          <div className="glass-card-icon">
            <Clock size={22} />
          </div>
          <div className="glass-card-value">{summary.today}</div>
          <div className="glass-card-label">Hoje</div>
        </div>

        <div className="glass-card glass-card-conflicts">
          <div className="glass-card-icon">
            <AlertTriangle size={22} />
          </div>
          <div className="glass-card-value">{summary.by_type?.conflict || 0}</div>
          <div className="glass-card-label">Conflitos</div>
        </div>

        <div className="glass-card glass-card-total">
          <div className="glass-card-icon">
            <Zap size={22} />
          </div>
          <div className="glass-card-value">{summary.total}</div>
          <div className="glass-card-label">Total</div>
        </div>
      </div>

      {/* Type Breakdown Chips */}
      {Object.keys(summary.by_type || {}).length > 0 && (
        <div className="type-breakdown">
          {Object.entries(summary.by_type).map(([type, count]) => {
            const config = TYPE_CONFIG[type] || { label: type, color: '#64748b' };
            return (
              <div key={type} className={`type-chip type-${type}`}>
                <span className="type-chip-dot" style={{ background: config.color }} />
                <span>{config.label}</span>
                <span className="type-chip-count">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="notification-filters">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            className={`filter-tab ${activeFilter === tab.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification Feed */}
      <div className="notification-feed">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>Nenhuma notificacao</h3>
            <p>As notificacoes do sistema apareceriao aqui</p>
          </div>
        ) : (
          notifications.map(notification => {
            const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
            const Icon = config.icon;

            return (
              <div
                key={notification.id}
                className={`notification-card type-${notification.type} ${!notification.is_read ? 'unread' : ''}`}
                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
              >
                {!notification.is_read && <div className="unread-dot" />}

                <div className={`notification-icon type-${notification.type}`}>
                  <Icon size={20} />
                </div>

                <div className="notification-content">
                  <div className="notification-title">{notification.title}</div>
                  {notification.message && (
                    <div className="notification-message">{notification.message}</div>
                  )}
                  <div className="notification-meta">
                    <span className="notification-time">
                      <Clock size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                      {formatRelativeTime(notification.created_at)}
                    </span>
                    <span className={`notification-badge ${notification.is_read ? 'read' : 'unread'}`}>
                      {notification.is_read ? (
                        <><Eye size={11} /> Lida</>
                      ) : (
                        <><Bell size={11} /> Nova</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More */}
      {notifications.length < total && (
        <div className="load-more-container">
          <button className="btn btn-secondary" onClick={handleLoadMore}>
            <ArrowDownCircle size={16} />
            Carregar mais ({total - notifications.length} restantes)
          </button>
        </div>
      )}
    </div>
  );
};

export default Notifications;
