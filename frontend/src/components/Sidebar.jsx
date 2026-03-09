import { useState, useEffect, useRef } from 'react';
import {
  Home,
  Calendar,
  AlertTriangle,
  Settings,
  BarChart3,
  FileText,
  Mail,
  Bell,
  LogOut,
  User,
  Bot,
  MoreHorizontal,
  Download,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

/**
 * TopNav — replaces the left sidebar with a fixed top header + horizontal nav tabs.
 * Props:
 *   currentPage   string   active page ID
 *   onPageChange  fn       called with new page ID
 *   onLogout      fn       called on logout
 */
const TopNav = ({ currentPage, onPageChange, onLogout }) => {
  const { user } = useAuth();
  const [showAppMenu, setShowAppMenu] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [updateInfo, setUpdateInfo] = useState(null);       // { version, releaseNotes }
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const appMenuRef = useRef(null);

  // Buscar versão do app (apenas no Electron)
  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion).catch(() => {});
    }
  }, []);

  // Registrar listeners de atualização (apenas no Electron)
  useEffect(() => {
    if (!window.electronAPI) return;
    const cleanups = [];

    if (window.electronAPI.onUpdateAvailable) {
      cleanups.push(window.electronAPI.onUpdateAvailable((info) => {
        setUpdateInfo(info);
        setCheckingUpdate(false);
      }));
    }
    if (window.electronAPI.onUpdateDownloaded) {
      cleanups.push(window.electronAPI.onUpdateDownloaded(() => {
        setUpdateDownloaded(true);
      }));
    }
    if (window.electronAPI.onUpdateNotAvailable) {
      cleanups.push(window.electronAPI.onUpdateNotAvailable(() => {
        setCheckingUpdate(false);
      }));
    }

    return () => cleanups.forEach(fn => fn?.());
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    if (!showAppMenu) return;
    const handleOutsideClick = (e) => {
      if (appMenuRef.current && !appMenuRef.current.contains(e.target)) {
        setShowAppMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showAppMenu]);

  const handleCheckForUpdates = () => {
    setCheckingUpdate(true);
    window.electronAPI?.checkForUpdates?.();
    // Reset se demorar mais de 15s sem resposta
    setTimeout(() => setCheckingUpdate(false), 15000);
  };

  const handleDownloadUpdate = () => {
    window.electronAPI?.downloadUpdate?.();
  };

  const handleInstallUpdate = () => {
    window.electronAPI?.installUpdate?.();
  };

  const navItems = [
    { id: 'dashboard',     label: 'Dashboard',     icon: Home },
    { id: 'calendar',      label: 'Calendário',    icon: Calendar },
    { id: 'conflicts',     label: 'Conflitos',     icon: AlertTriangle },
    { id: 'statistics',    label: 'Estatísticas',  icon: BarChart3 },
    { id: 'documents',     label: 'Documentos',    icon: FileText },
    { id: 'emails',        label: 'Emails',        icon: Mail },
    { id: 'ai-pricing',    label: 'Sugestões IA',  icon: Bot },
    { id: 'condo-template',label: 'Template',      icon: FileText },
  ];

  const displayName = user?.full_name || user?.username || '';

  return (
    <>
      {/* ===== TOP HEADER ===== */}
      <header className="app-header">
        <div className="header-brand">
          <span className="header-logo">LUMINA</span>
        </div>

        <div className="header-actions">
          {displayName && (
            <div className="header-user">
              <User size={15} />
              <span>{displayName}</span>
            </div>
          )}

          <div className="header-divider" />

          <button
            className="header-icon-btn"
            onClick={() => onPageChange('notifications')}
            title="Notificações"
          >
            <Bell size={18} />
          </button>

          <button
            className="header-icon-btn"
            onClick={() => onPageChange('settings')}
            title="Configurações"
          >
            <Settings size={18} />
          </button>

          <button className="header-logout-btn" onClick={onLogout}>
            <LogOut size={15} />
            Sair
          </button>

          {/* ── 3-dot menu: apenas no Electron ── */}
          {window.electronAPI && (
            <div className="app-menu-wrapper" ref={appMenuRef}>
              <button
                className="header-icon-btn"
                title="Menu do aplicativo"
                onClick={() => setShowAppMenu((v) => !v)}
                style={updateInfo ? { borderColor: '#f59e0b', color: '#f59e0b' } : {}}
              >
                {updateInfo
                  ? <Sparkles size={18} />
                  : <MoreHorizontal size={18} />
                }
              </button>
              {showAppMenu && (
                <div className="app-dropdown">
                  {appVersion && (
                    <div className="app-dropdown-version">LUMINA v{appVersion}</div>
                  )}

                  {/* ── Update available badge ── */}
                  {updateInfo && (
                    <div className="app-dropdown-item update-badge" style={{ pointerEvents: 'none' }}>
                      <Sparkles size={14} style={{ flexShrink: 0 }} />
                      Nova versão {updateInfo.version} disponível!
                    </div>
                  )}

                  {/* ── Download / Install update ── */}
                  {updateInfo && !updateDownloaded && (
                    <div
                      className="app-dropdown-item"
                      onClick={() => { handleDownloadUpdate(); setShowAppMenu(false); }}
                    >
                      <Download size={14} style={{ flexShrink: 0 }} />
                      Baixar atualização
                    </div>
                  )}
                  {updateInfo && updateDownloaded && (
                    <div
                      className="app-dropdown-item"
                      style={{ color: '#22c55e' }}
                      onClick={() => { handleInstallUpdate(); setShowAppMenu(false); }}
                    >
                      <Download size={14} style={{ flexShrink: 0 }} />
                      Instalar e reiniciar
                    </div>
                  )}

                  {/* ── Check for updates ── */}
                  {!updateInfo && (
                    <div
                      className="app-dropdown-item"
                      onClick={() => { handleCheckForUpdates(); }}
                    >
                      <RefreshCw size={14} style={{ flexShrink: 0 }} className={checkingUpdate ? 'spin' : ''} />
                      {checkingUpdate ? 'Verificando...' : 'Verificar atualizações'}
                    </div>
                  )}

                  <div
                    className="app-dropdown-item danger"
                    onClick={() => {
                      setShowAppMenu(false);
                      window.electronAPI.quit();
                    }}
                  >
                    <LogOut size={14} style={{ flexShrink: 0 }} />
                    Sair do LUMINA
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ===== HORIZONTAL NAV TABS ===== */}
      <nav className="app-nav">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-tab ${currentPage === id ? 'active' : ''}`}
            onClick={() => onPageChange(id)}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>
    </>
  );
};

export default TopNav;
