import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PropertyProvider } from './contexts/PropertyContext';
import TopNav from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Conflicts from './pages/Conflicts';
import Statistics from './pages/Statistics';
import Documents from './pages/Documents';
import Emails from './pages/Emails';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import AISuggestions from './pages/AISuggestions';
import CondoTemplate from './pages/CondoTemplate';
import { RefreshCw } from 'lucide-react';
import './App.css';

function AppContent() {
  const { isAuthenticated, loading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#101922' }}>
        <RefreshCw size={32} className="spin" style={{ color: 'var(--primary)' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendar':
        return <Calendar />;
      case 'conflicts':
        return <Conflicts />;
      case 'statistics':
        return <Statistics />;
      case 'documents':
        return <Documents />;
      case 'emails':
        return <Emails />;
      case 'notifications':
        return <Notifications />;
      case 'ai-pricing':
        return <AISuggestions onPageChange={setCurrentPage} />;
      case 'condo-template':
        return <CondoTemplate onBack={() => setCurrentPage('dashboard')} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <PropertyProvider>
      <div className="app">
        <TopNav
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onLogout={logout}
        />
        <main className="main-content">
          <ErrorBoundary key={currentPage}>
            {renderPage()}
          </ErrorBoundary>
        </main>
      </div>
    </PropertyProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
