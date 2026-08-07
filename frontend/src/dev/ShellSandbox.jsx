import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import PageHeader from '../components/layout/PageHeader';
import { Button, Card, Chip, SnackbarProvider } from '../components/ui';
import { AuthProvider } from '../contexts/AuthContext';
import DESTINOS, { TITULOS } from '../components/layout/destinations';

/**
 * Bancada do shell — ferramenta de desenvolvimento, em #shell.
 *
 * Exercita a navegação real (os mesmos AppShell, NavigationRail, AppBar e
 * PageHeader do produto) sem exigir backend nem sessão. É o que permite medir as
 * três formas de navegação redimensionando a janela.
 */
export default function ShellSandbox() {
  const [pagina, setPagina] = useState('dashboard');

  return (
    <AuthProvider>
      <SnackbarProvider>
        <AppShell currentPage={pagina} onPageChange={setPagina} naoLidas={7}>
          <PageHeader
            description={`Conteúdo de exemplo para "${TITULOS[pagina] ?? pagina}". A app bar carrega o título; esta faixa carrega o apoio e a ação primária.`}
            actions={
              <>
                <Button variant="outlined" icon={<RefreshCw />}>
                  Atualizar
                </Button>
                <Button icon={<Plus />}>Nova reserva</Button>
              </>
            }
            filters={
              <>
                <Chip variant="filter" label="Airbnb" selected />
                <Chip variant="filter" label="Booking" />
                <Chip variant="filter" label="Direto" />
              </>
            }
          />
          <div className="sb-shell-grade">
            {DESTINOS.map((d) => (
              <Card key={d.id} variant="outlined">
                <strong>{d.label}</strong>
                <p>Destino primário do rail.</p>
              </Card>
            ))}
          </div>
        </AppShell>
      </SnackbarProvider>
    </AuthProvider>
  );
}
