import { useEffect, useState } from 'react';
import {
  Menu as MenuIcon,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  User,
  Sun,
  Moon,
  Monitor,
  Download,
  RefreshCw,
  Rows3,
} from 'lucide-react';
import { IconButton, Badge, Menu, Tooltip } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useAppearance } from '../../contexts/AppearanceContext';
import { TITULOS } from './destinations';
import './AppBar.css';

/**
 * Barra superior fixa. Carrega o TÍTULO DA PÁGINA como `<h1>` e as utilidades.
 *
 * O título mora aqui e não se repete no corpo: com um rail permanente à esquerda,
 * dizer duas vezes onde o usuário está é ruído. Antes eram onze cabeçalhos de
 * página com onze formatos diferentes.
 *
 * Notificações e Configurações são utilidades, não destinos — por isso ficam na
 * barra e não no rail. Elas respondem "o que mudou?" e "como isto funciona?", não
 * "onde eu estou?".
 */

const ICONE_DE_TEMA = { light: Sun, dark: Moon, system: Monitor };

export default function AppBar({
  currentPage,
  onPageChange,
  onOpenNav,
  mostrarBotaoDeNav,
  naoLidas = 0,
}) {
  const { user, logout } = useAuth();
  const { theme, setTheme, density, setDensity } = useAppearance();
  const [versao, setVersao] = useState('');
  const [atualizacao, setAtualizacao] = useState(null);
  const [baixada, setBaixada] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const noElectron = Boolean(window.electronAPI);

  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then(setVersao).catch(() => {});
  }, []);

  useEffect(() => {
    if (!noElectron) return undefined;
    const limpezas = [
      window.electronAPI.onUpdateAvailable?.((info) => {
        setAtualizacao(info);
        setVerificando(false);
      }),
      window.electronAPI.onUpdateDownloaded?.(() => setBaixada(true)),
      window.electronAPI.onUpdateNotAvailable?.(() => setVerificando(false)),
    ];
    return () => limpezas.forEach((fn) => fn?.());
  }, [noElectron]);

  const IconeDeTema = ICONE_DE_TEMA[theme] ?? Sun;

  const itensDeConta = [
    ...(noElectron
      ? [
          ...(atualizacao && !baixada
            ? [
                {
                  label: `Baixar atualização ${atualizacao.version ?? ''}`.trim(),
                  icon: <Download />,
                  onSelect: () => window.electronAPI?.downloadUpdate?.(),
                },
              ]
            : []),
          ...(baixada
            ? [
                {
                  label: 'Instalar e reiniciar',
                  icon: <RefreshCw />,
                  onSelect: () => window.electronAPI?.installUpdate?.(),
                },
              ]
            : []),
          {
            label: verificando ? 'Verificando…' : 'Verificar atualizações',
            icon: <RefreshCw />,
            disabled: verificando,
            onSelect: () => {
              setVerificando(true);
              window.electronAPI?.checkForUpdates?.();
              // Sem resposta em 15s o menu voltaria a dizer "Verificando…" para
              // sempre; o produto não tem como distinguir demora de falha.
              setTimeout(() => setVerificando(false), 15000);
            },
          },
          { separator: true },
        ]
      : []),
    { label: 'Sair', icon: <LogOut />, destructive: true, onSelect: logout },
  ];

  return (
    <header className="lm-app-bar">
      {mostrarBotaoDeNav ? (
        <IconButton aria-label="Abrir navegação" onClick={onOpenNav}>
          <MenuIcon />
        </IconButton>
      ) : null}

      <h1 className="lm-app-bar__titulo">{TITULOS[currentPage] ?? 'LUMINA'}</h1>

      <div className="lm-app-bar__acoes">
        <Tooltip content="Notificações">
          <IconButton
            aria-label={
              naoLidas > 0 ? `Notificações, ${naoLidas} não lidas` : 'Notificações'
            }
            selected={currentPage === 'notifications'}
            onClick={() => onPageChange('notifications')}
          >
            <span className="lm-app-bar__com-badge">
              <Bell />
              {naoLidas > 0 ? (
                <Badge
                  className="lm-app-bar__badge"
                  count={naoLidas}
                  label={`${naoLidas} notificações não lidas`}
                />
              ) : null}
            </span>
          </IconButton>
        </Tooltip>

        <Menu
          ariaLabel="Aparência"
          trigger={
            <IconButton aria-label="Aparência">
              <IconeDeTema />
            </IconButton>
          }
          items={[
            {
              label: 'Tema claro',
              icon: <Sun />,
              selected: theme === 'light',
              onSelect: () => setTheme('light'),
            },
            {
              label: 'Tema escuro',
              icon: <Moon />,
              selected: theme === 'dark',
              onSelect: () => setTheme('dark'),
            },
            {
              label: 'Seguir o sistema',
              icon: <Monitor />,
              selected: theme === 'system',
              onSelect: () => setTheme('system'),
            },
            { separator: true },
            ...['comfortable', 'standard', 'compact'].map((d) => ({
              key: `densidade-${d}`,
              label: { comfortable: 'Espaçoso', standard: 'Padrão', compact: 'Compacto' }[d],
              icon: <Rows3 />,
              selected: density === d,
              onSelect: () => setDensity(d),
            })),
          ]}
        />

        <Tooltip content="Configurações">
          <IconButton
            aria-label="Configurações"
            selected={currentPage === 'settings'}
            onClick={() => onPageChange('settings')}
          >
            <SettingsIcon />
          </IconButton>
        </Tooltip>

        <Menu
          ariaLabel={`Conta de ${user?.username ?? 'usuário'}`}
          align="end"
          trigger={
            <button type="button" className="lm-app-bar__conta">
              <User className="lm-app-bar__avatar" aria-hidden="true" focusable="false" />
              <span className="lm-app-bar__usuario">{user?.username ?? 'Conta'}</span>
            </button>
          }
          items={itensDeConta}
        />
      </div>

      {versao ? <span className="lm-app-bar__versao">v{versao}</span> : null}
    </header>
  );
}
