import {
  Home,
  Calendar,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileText,
  Mail,
  Bell,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = ({ currentPage, onPageChange, collapsed, onToggleCollapse, onLogout }) => {
  const { user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'calendar', label: 'Calendario', icon: Calendar },
    { id: 'conflicts', label: 'Conflitos', icon: AlertTriangle },
    { id: 'statistics', label: 'Estatisticas', icon: BarChart3 },
    { id: 'documents', label: 'Documentos', icon: FileText },
    { id: 'emails', label: 'Emails', icon: Mail },
    { id: 'notifications', label: 'Notificacoes', icon: Bell },
    { id: 'settings', label: 'Configuracoes', icon: Settings },
  ];

  const displayName = user?.full_name || user?.username || '';

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <h1 className="sidebar-title">
          <span className="sidebar-title-text">LUMINA</span>
        </h1>
        <button
          className="collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => onPageChange(item.id)}
              title={collapsed ? item.label : ''}
            >
              <Icon size={20} />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user" title={collapsed ? displayName : ''}>
            <div className="sidebar-user-info">
              <User size={16} className="sidebar-user-icon" />
              <span className="sidebar-user-name">{displayName}</span>
            </div>
            <button
              className="sidebar-logout-btn"
              onClick={onLogout}
              title="Sair"
            >
              <LogOut size={16} />
              <span className="nav-label">Sair</span>
            </button>
          </div>
        )}
        <div className="sidebar-info">
          <p className="version">v3.0.0</p>
          <p className="status">
            <span className="status-dot"></span>
            <span className="status-text">Sistema Online</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
