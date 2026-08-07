import { useCallback, useEffect, useState } from 'react';
import {
  BellOff,
  RefreshCw,
  CheckCheck,
  Calendar,
  AlertTriangle,
  FileText,
  Mail,
  Zap,
  XCircle,
} from 'lucide-react';
import { Button, Card, Chip, EmptyState, Skeleton, useSnackbar } from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import { notificationsAPI } from '../services/api';
import { formatRelativeTime } from '../utils/formatters';
import './Notifications.css';

/**
 * Tipo → rótulo, ícone e PAPEL semântico.
 *
 * O papel substitui a cor: antes esta tabela guardava sete hexadecimais, e os
 * mesmos sete estavam repetidos mais duas vezes no CSS (ponto, borda e ícone) —
 * 21 valores para sete conceitos. Agora o CSS resolve tudo por `data-tipo`.
 */
const TIPOS = {
  new_booking: { rotulo: 'Nova reserva', icone: Calendar, papel: 'info' },
  booking_update: { rotulo: 'Atualização', icone: Calendar, papel: 'info' },
  booking_cancel: { rotulo: 'Cancelamento', icone: XCircle, papel: 'warning' },
  conflict: { rotulo: 'Conflito', icone: AlertTriangle, papel: 'error' },
  sync: { rotulo: 'Sincronização', icone: RefreshCw, papel: 'success' },
  document: { rotulo: 'Documento', icone: FileText, papel: 'tertiary' },
  email: { rotulo: 'E-mail', icone: Mail, papel: 'info' },
  system: { rotulo: 'Sistema', icone: Zap, papel: 'neutral' },
};

const FILTROS = [
  { id: 'all', rotulo: 'Todas' },
  { id: 'new_booking,booking_update,booking_cancel', rotulo: 'Reservas' },
  { id: 'conflict', rotulo: 'Conflitos' },
  { id: 'sync', rotulo: 'Sincronização' },
  { id: 'document', rotulo: 'Documentos' },
  { id: 'email', rotulo: 'E-mails' },
];

const Notifications = () => {
  const { show } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unread: 0, today: 0, by_type: {} });
  const [filtro, setFiltro] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const carregarResumo = useCallback(async () => {
    try {
      const r = await notificationsAPI.getSummary();
      setSummary(r.data);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  }, []);

  const carregarLista = useCallback(
    async (pagina) => {
      try {
        const params = { page: pagina, limit: 20 };
        if (filtro !== 'all') params.type = filtro;
        const { data } = await notificationsAPI.getAll(params);
        setNotifications((prev) => (pagina === 1 ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
        setPage(pagina);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    },
    [filtro],
  );

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    Promise.all([carregarResumo(), carregarLista(1)]).finally(() => {
      if (!cancelado) setLoading(false);
    });
    return () => {
      cancelado = true;
    };
  }, [carregarResumo, carregarLista]);

  const marcarComoLida = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setSummary((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (error) {
      console.error('Error marking as read:', error);
      show('Não foi possível marcar como lida.', { variant: 'error' });
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setSummary((prev) => ({ ...prev, unread: 0 }));
      show('Todas marcadas como lidas.');
    } catch (error) {
      console.error('Error marking all as read:', error);
      show('Não foi possível marcar todas como lidas.', { variant: 'error' });
    }
  };

  const resumo = [
    { chave: 'unread', rotulo: 'Não lidas', valor: summary.unread, papel: 'error' },
    { chave: 'today', rotulo: 'Hoje', valor: summary.today, papel: 'success' },
    { chave: 'conflicts', rotulo: 'Conflitos', valor: summary.by_type?.conflict ?? 0, papel: 'warning' },
    { chave: 'total', rotulo: 'Total', valor: summary.total, papel: 'neutral' },
  ];

  return (
    <div className="ntf">
      <PageHeader
        description="Reservas, conflitos, sincronizações e documentos, em ordem cronológica."
        actions={
          <>
            {summary.unread > 0 ? (
              <Button variant="outlined" icon={<CheckCheck />} onClick={marcarTodasComoLidas}>
                Marcar tudo como lido
              </Button>
            ) : null}
            <Button
              icon={<RefreshCw />}
              onClick={() => {
                carregarResumo();
                carregarLista(1);
              }}
            >
              Atualizar
            </Button>
          </>
        }
        filters={FILTROS.map((f) => (
          <Chip
            key={f.id}
            variant="filter"
            label={f.rotulo}
            selected={filtro === f.id}
            onClick={() => setFiltro(f.id)}
          />
        ))}
      />

      <ul className="ntf-resumo" role="list">
        {resumo.map((r) => (
          <li key={r.chave}>
            <Card variant="outlined" className="ntf-resumo__item" data-papel={r.papel}>
              <span className="ntf-resumo__valor">{r.valor}</span>
              <span className="ntf-resumo__rotulo">{r.rotulo}</span>
            </Card>
          </li>
        ))}
      </ul>

      {loading ? (
        <div aria-busy="true" aria-label="Carregando notificações">
          <Skeleton variant="text" lines={6} />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff />}
          title="Nada por aqui"
          description={
            filtro === 'all'
              ? 'Quando houver reservas, conflitos ou sincronizações, elas aparecem nesta lista.'
              : 'Nenhuma notificação deste tipo. Experimente outro filtro.'
          }
          action={
            filtro === 'all' ? null : (
              <Button variant="text" onClick={() => setFiltro('all')}>
                Ver todas
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul className="ntf-lista" role="list">
            {notifications.map((n) => {
              const cfg = TIPOS[n.type] || TIPOS.system;
              const Icone = cfg.icone;
              const naoLida = !n.is_read;
              return (
                <li key={n.id}>
                  {/* Um <button> de verdade. Antes era `<div onClick>`: sem
                      teclado, sem papel e sem estado anunciável. */}
                  <button
                    type="button"
                    className="ntf-item"
                    data-papel={cfg.papel}
                    data-nao-lida={naoLida || undefined}
                    aria-label={`${cfg.rotulo}: ${n.title}${naoLida ? '. Não lida' : ''}`}
                    onClick={() => naoLida && marcarComoLida(n.id)}
                  >
                    <span className="ntf-item__icone">
                      <Icone aria-hidden="true" focusable="false" />
                    </span>
                    <span className="ntf-item__corpo">
                      <span className="ntf-item__titulo">{n.title}</span>
                      <span className="ntf-item__texto">{n.message}</span>
                      <span className="ntf-item__meta">
                        <span className="ntf-item__tipo">{cfg.rotulo}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatRelativeTime(n.created_at)}</span>
                      </span>
                    </span>
                    {/* Não lida por forma E por texto, nunca só pelo ponto: um
                        ponto colorido some para quem não distingue a cor. */}
                    {naoLida ? <span className="ntf-item__novo">Nova</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>

          {notifications.length < total ? (
            <div className="ntf-mais">
              <Button variant="outlined" onClick={() => carregarLista(page + 1)}>
                Carregar mais ({notifications.length} de {total})
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default Notifications;
