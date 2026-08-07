import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppearanceProvider } from './contexts/AppearanceContext';
import { PropertyProvider } from './contexts/PropertyContext';
import { SnackbarProvider } from './components/ui';
import AppShell from './components/layout/AppShell';
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
import './App.css';

function AppContent() {
  const { isAuthenticated, loading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="app-boot" role="status" aria-label="Carregando o LUMINA">
        <RefreshCw className="app-boot__icon" aria-hidden="true" />
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
        return <Documents onPageChange={setCurrentPage} />;
      case 'emails':
        return <Emails />;
      case 'notifications':
        return <Notifications />;
      case 'ai-pricing':
        return <AISuggestions onPageChange={setCurrentPage} />;
      // Não é destino primário: é um documento que se gera, alcançado de dentro
      // de Documentos. Continua no switch porque continua sendo uma tela.
      case 'condo-template':
        return <CondoTemplate onBack={() => setCurrentPage('documents')} />;
      case 'settings':
        return <Settings onLogout={logout} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <PropertyProvider>
      <SnackbarProvider>
        <AppShell currentPage={currentPage} onPageChange={setCurrentPage}>
          {/* `key` remonta a fronteira de erro a cada troca de página: sem ela,
              uma página que quebrou deixaria a seguinte presa no fallback. */}
          <ErrorBoundary key={currentPage}>{renderPage()}</ErrorBoundary>
        </AppShell>
      </SnackbarProvider>
    </PropertyProvider>
  );
}

export default function App() {
  return (
    <AppearanceProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppearanceProvider>
  );
}
