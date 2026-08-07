import { useState } from 'react';
import instalarDubles from './mockApi';
import { AuthProvider } from '../contexts/AuthContext';
import { PropertyProvider } from '../contexts/PropertyContext';
import { SnackbarProvider } from '../components/ui';
import AppShell from '../components/layout/AppShell';
import ErrorBoundary from '../components/ErrorBoundary';
import Dashboard from '../pages/Dashboard';
import Calendar from '../pages/Calendar';
import Conflicts from '../pages/Conflicts';
import Statistics from '../pages/Statistics';
import Documents from '../pages/Documents';
import Emails from '../pages/Emails';
import Notifications from '../pages/Notifications';
import Settings from '../pages/Settings';
import AISuggestions from '../pages/AISuggestions';
import CondoTemplate from '../pages/CondoTemplate';

/**
 * Bancada de páginas — em #pages.
 *
 * Renderiza as DEZ telas de verdade, dentro do shell de verdade, com a API
 * dublada. Serve para exercitar os caminhos de render sem subir o backend nem
 * tocar no banco: pega `map` sobre indefinido, campo com formato diferente do
 * assumido e erro de prop, que compilar e passar no lint não pegam.
 *
 * O que ela NÃO substitui: o contrato com o backend real. Os formatos aqui são
 * os que eu assumi ao escrever as telas — se o servidor devolver outro, só o
 * teste com ele rodando revela.
 */
instalarDubles();

const TELAS = {
  dashboard: Dashboard,
  calendar: Calendar,
  conflicts: Conflicts,
  statistics: Statistics,
  documents: Documents,
  emails: Emails,
  notifications: Notifications,
  settings: Settings,
  'ai-pricing': AISuggestions,
  'condo-template': CondoTemplate,
};

export const IDS_DAS_TELAS = Object.keys(TELAS);

function Conteudo() {
  const [pagina, setPagina] = useState('dashboard');
  const Tela = TELAS[pagina] ?? Dashboard;

  // Exposto para o harness de medição percorrer as telas de fora.
  window.__irPara = setPagina;
  window.__telas = IDS_DAS_TELAS;

  return (
    <AppShell currentPage={pagina} onPageChange={setPagina} naoLidas={2}>
      <ErrorBoundary key={pagina}>
        <Tela onPageChange={setPagina} onBack={() => setPagina('documents')} />
      </ErrorBoundary>
    </AppShell>
  );
}

export default function PageSandbox() {
  return (
    <AuthProvider>
      <PropertyProvider>
        <SnackbarProvider>
          <Conteudo />
        </SnackbarProvider>
      </PropertyProvider>
    </AuthProvider>
  );
}
