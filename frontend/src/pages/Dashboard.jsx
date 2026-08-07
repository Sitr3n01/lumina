import { useEffect, useState } from 'react';
import {
  BarChart,
  Wallet,
  Calendar,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Clock,
  Send,
  FileText,
  Mail,
} from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Skeleton,
  useSnackbar,
} from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import { statisticsAPI, bookingsAPI, conflictsAPI, notificationsAPI } from '../services/api';
import { usePropertyId } from '../contexts/PropertyContext';
import { formatDateShort, formatRelativeTime } from '../utils/formatters';
import './Dashboard.css';

/** Cartão de indicador. O número é o conteúdo; o rótulo apenas o nomeia — daí a
 *  diferença brutal de tamanho entre os dois. */
function Indicador({ rotulo, valor, icone: Icone, tom, nota, acao }) {
  return (
    <Card variant="outlined" className="dash-kpi" data-tom={tom}>
      <div className="dash-kpi__topo">
        <span className="dash-kpi__rotulo">{rotulo}</span>
        <Icone className="dash-kpi__icone" aria-hidden="true" focusable="false" />
      </div>
      <p className="dash-kpi__valor">{valor}</p>
      {nota ? <p className="dash-kpi__nota">{nota}</p> : null}
      {acao ? <div className="dash-kpi__acao">{acao}</div> : null}
    </Card>
  );
}

/** Ícone e papel de cor por tipo de atividade. O papel é semântico, não uma cor:
 *  a mesma chave serve ao ícone e ao token, e nada aqui é hexadecimal. */
const ATIVIDADE = {
  new_booking: { icone: CheckCircle, papel: 'success' },
  booking_update: { icone: Calendar, papel: 'info' },
  booking_cancel: { icone: AlertTriangle, papel: 'warning' },
  conflict: { icone: AlertTriangle, papel: 'error' },
  sync: { icone: RefreshCw, papel: 'success' },
  document: { icone: FileText, papel: 'tertiary' },
  email: { icone: Mail, papel: 'info' },
  system: { icone: Clock, papel: 'neutral' },
};

const COLUNAS = [
  { key: 'guest', header: 'Hóspede' },
  { key: 'platform', header: 'Plataforma' },
  { key: 'period', header: 'Período' },
  { key: 'status', header: 'Situação' },
];

const Dashboard = () => {
  const { propertyId } = usePropertyId();
  const { show } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    occupancyRate: 0,
    totalRevenue: 0,
    activeBookings: 0,
    conflicts: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [confirmarEnvio, setConfirmarEnvio] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          statisticsAPI.getMonthlyReport(
            propertyId,
            new Date().getMonth() + 1,
            new Date().getFullYear(),
          ),
          // `property_id` é obrigatório neste endpoint. Sem ele a resposta é 422
          // e a lista de check-ins ficava permanentemente vazia — como o erro caía
          // num `Promise.allSettled`, nada aparecia no console nem na tela.
          bookingsAPI.getUpcoming({ property_id: propertyId, limit: 5 }),
          conflictsAPI.getSummary(propertyId),
          notificationsAPI.getAll({ limit: 5 }),
        ]);

        if (cancelled) return;

        if (results[0].status === 'fulfilled') {
          const data = results[0].value.data;
          setStats((prev) => ({
            ...prev,
            occupancyRate: data.occupancy_rate || 0,
            totalRevenue: data.total_revenue || 0,
            activeBookings: data.total_bookings || 0,
          }));
        }
        if (results[1].status === 'fulfilled') {
          const data = results[1].value.data;
          setUpcomingBookings(
            Array.isArray(data) ? data.slice(0, 5) : (data.items || []).slice(0, 5),
          );
        }
        if (results[2].status === 'fulfilled') {
          const data = results[2].value.data;
          setStats((prev) => ({ ...prev, conflicts: data.active_conflicts ?? data.total ?? 0 }));
        }
        if (results[3].status === 'fulfilled') {
          setRecentActivity((results[3].value.data.items || []).slice(0, 5));
        }
      } catch (err) {
        if (!cancelled) console.error('Dashboard load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirmSendReport = async () => {
    setEnviando(true);
    try {
      const hoje = new Date();
      await statisticsAPI.getMonthlyReport(
        propertyId,
        hoje.getMonth() + 1,
        hoje.getFullYear(),
        true,
      );
      show('Relatório enviado.');
      setConfirmarEnvio(false);
    } catch (error) {
      console.error('Error sending report:', error);
      show('Falha ao enviar o relatório. Confira as configurações de e-mail.', {
        variant: 'error',
      });
    } finally {
      setEnviando(false);
    }
  };

  const semConflitos = stats.conflicts === 0;

  const linhas = upcomingBookings.map((b, i) => ({
    id: b.id ?? i,
    guest: b.guest_name || 'Hóspede',
    platform: (
      <Chip variant="assist" label={b.platform || 'Manual'} />
    ),
    period: `${formatDateShort(b.check_in_date || b.check_in)} – ${formatDateShort(
      b.check_out_date || b.check_out,
    )}`,
    status: b.status || 'Confirmado',
  }));

  // Esqueleto com a MESMA grade do conteúdo real: um spinner solto no meio da
  // tela faz tudo saltar de posição quando os dados chegam.
  if (loading) {
    return (
      <div className="dash">
        <div className="dash-grade" aria-busy="true" aria-label="Carregando o painel">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} variant="outlined" className="dash-kpi">
              <Skeleton variant="text" />
              <Skeleton variant="rect" />
            </Card>
          ))}
          <Card variant="outlined" className="dash-principal">
            <Skeleton variant="text" lines={5} />
          </Card>
          <Card variant="outlined" className="dash-lateral">
            <Skeleton variant="text" lines={4} />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="dash">
      <PageHeader
        description={`Resumo de ${new Date().toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}.`}
        actions={
          <Button variant="outlined" icon={<Send />} onClick={() => setConfirmarEnvio(true)}>
            Enviar relatório do mês
          </Button>
        }
      />

      <div className="dash-grade">
        <Indicador rotulo="Ocupação" valor={`${Math.round(stats.occupancyRate)}%`} icone={BarChart} />
        <Indicador
          rotulo="Receita do mês"
          valor={`R$ ${Number(stats.totalRevenue).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })}`}
          icone={Wallet}
        />
        <Indicador rotulo="Reservas ativas" valor={stats.activeBookings} icone={Calendar} />

        {/* Conflitos: o tom vem do dado, mas a cor NUNCA carrega a informação
            sozinha — o ícone e a frase abaixo dizem o mesmo. */}
        <Indicador
          rotulo="Conflitos"
          valor={stats.conflicts}
          icone={semConflitos ? CheckCircle : AlertTriangle}
          tom={semConflitos ? 'ok' : 'alerta'}
          nota={semConflitos ? 'Nenhum conflito em aberto' : 'Há pendências para resolver'}
        />

        <Card variant="outlined" className="dash-principal" as="section">
          <h2 className="dash-titulo">Próximos check-ins</h2>
          <DataTable
            caption="Próximos check-ins"
            columns={COLUNAS}
            rows={linhas}
            rowKey={(r) => r.id}
            empty={{
              icon: <Calendar />,
              title: 'Nenhum check-in próximo',
              description: 'Sincronize os calendários para ver as chegadas aqui.',
            }}
          />
        </Card>

        <Card variant="outlined" className="dash-lateral" as="section">
          <h2 className="dash-titulo">Atividade recente</h2>
          {recentActivity.length > 0 ? (
            <ul className="dash-feed" role="list">
              {recentActivity.map((item, i) => {
                const cfg = ATIVIDADE[item.type] || ATIVIDADE.system;
                const Icone = cfg.icone;
                return (
                  <li className="dash-feed__item" key={item.id || i}>
                    <span className="dash-feed__icone" data-papel={cfg.papel}>
                      <Icone aria-hidden="true" focusable="false" />
                    </span>
                    <div className="dash-feed__corpo">
                      <p className="dash-feed__titulo">{item.title}</p>
                      <p className="dash-feed__texto">{item.message}</p>
                      <p className="dash-feed__tempo">{formatRelativeTime(item.created_at)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={<Clock />}
              title="Nenhuma atividade recente"
              description="Sincronizações, reservas e documentos aparecem aqui."
              action={
                <Button variant="text" onClick={() => window.location.reload()}>
                  Atualizar
                </Button>
              }
            />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmarEnvio}
        title="Enviar o relatório do mês?"
        message="O relatório financeiro deste mês vai para o e-mail do proprietário cadastrado em Configurações."
        confirmLabel="Enviar"
        loading={enviando}
        onCancel={() => setConfirmarEnvio(false)}
        onConfirm={handleConfirmSendReport}
      />
    </div>
  );
};

export default Dashboard;
