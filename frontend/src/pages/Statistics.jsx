import { useCallback, useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
// Nomes da API do lucide-react 0.344: `ChartNoAxesColumn` é renomeação posterior.
import { RefreshCw, TrendingUp, Calendar, DollarSign, Percent, BarChart3, Table } from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  IconButton,
  Select,
  Skeleton,
  useSnackbar,
} from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import { useChartTheme } from '../charts/theme';
import { statisticsAPI } from '../services/api';
import { usePropertyId } from '../contexts/PropertyContext';
import { formatCurrency, formatCurrencyShort, formatMonth } from '../utils/formatters';
import './Statistics.css';

/**
 * Tooltip do gráfico.
 *
 * Existe porque o Recharts recebe cor por prop em JavaScript e não por classe: o
 * padrão dele não segue tema nenhum. A versão anterior tinha
 * `contentStyle={{ background: 'white' }}` — branco puro num aplicativo escuro.
 */
function Dica({ active, payload, label, tema, formatar }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="sta-dica"
      style={{ backgroundColor: tema.tooltip.background, color: tema.tooltip.label }}
    >
      <p className="sta-dica__rotulo">{label}</p>
      {payload.map((p) => (
        <p className="sta-dica__valor" key={p.dataKey}>
          {p.name}: {formatar ? formatar(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

/**
 * Moldura de gráfico com alternância para TABELA.
 *
 * A tabela não é acessório: é o mesmo dado numa forma que não depende de
 * enxergar a marca, de distinguir cor ou de usar o mouse. Sem ela, quem lê por
 * leitor de tela não tem acesso nenhum ao conteúdo do gráfico.
 */
function Grafico({ titulo, icone: Icone, vazio, colunas, linhas, children }) {
  const [tabela, setTabela] = useState(false);

  return (
    <Card variant="outlined" className="sta-grafico" as="section">
      <header className="sta-grafico__topo">
        <h2 className="sta-grafico__titulo">
          <Icone aria-hidden="true" focusable="false" />
          {titulo}
        </h2>
        <IconButton
          density="compact"
          aria-label={tabela ? `Ver ${titulo} como gráfico` : `Ver ${titulo} como tabela`}
          aria-pressed={tabela}
          onClick={() => setTabela((v) => !v)}
        >
          {tabela ? <BarChart3 /> : <Table />}
        </IconButton>
      </header>

      {vazio ? (
        <p className="sta-grafico__vazio">Sem dados no período selecionado.</p>
      ) : tabela ? (
        <DataTable
          caption={titulo}
          columns={colunas}
          rows={linhas}
          rowKey={(r) => r.id}
          empty={{ title: 'Sem dados', description: 'Nada a mostrar no período.' }}
        />
      ) : (
        <div className="sta-grafico__palco">{children}</div>
      )}
    </Card>
  );
}

const PERIODOS = [
  { valor: '6months', rotulo: 'Últimos 6 meses' },
  { valor: 'year', rotulo: 'Último ano' },
  { valor: 'all', rotulo: 'Todo o histórico' },
];

const Statistics = () => {
  const { propertyId } = usePropertyId();
  const { show } = useSnackbar();
  const tema = useChartTheme();
  const [loading, setLoading] = useState(true);
  const [occupancyData, setOccupancyData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [platformData, setPlatformData] = useState([]);
  const [period, setPeriod] = useState('6months');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const fim = new Date();
      const inicio = new Date();
      if (period === '6months') inicio.setMonth(inicio.getMonth() - 6);
      else if (period === 'year') inicio.setFullYear(inicio.getFullYear() - 1);
      else inicio.setFullYear(inicio.getFullYear() - 3);

      const params = {
        property_id: propertyId,
        start_date: inicio.toISOString().split('T')[0],
        end_date: fim.toISOString().split('T')[0],
      };

      const [ocup, rec, plat] = await Promise.allSettled([
        statisticsAPI.getOccupancy(params),
        statisticsAPI.getRevenue(params),
        statisticsAPI.getPlatforms(params),
      ]);

      if (ocup.status === 'fulfilled') setOccupancyData(ocup.value.data?.months || ocup.value.data || []);
      if (rec.status === 'fulfilled') setRevenueData(Array.isArray(rec.value.data) ? rec.value.data : []);
      if (plat.status === 'fulfilled') setPlatformData(Array.isArray(plat.value.data) ? plat.value.data : []);
    } catch (error) {
      console.error('Error loading statistics:', error);
      show('Falha ao carregar as estatísticas.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [period, propertyId, show]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!tema) return null;

  const totalBookings = platformData.reduce((s, p) => s + (p.bookings_count || 0), 0);
  const totalRevenue = platformData.reduce((s, p) => s + (p.total_revenue || 0), 0);
  const ocupacaoMedia =
    occupancyData.length > 0
      ? (
          occupancyData.reduce((s, d) => s + (d.occupancy_rate || 0), 0) / occupancyData.length
        ).toFixed(1)
      : 0;

  /* Cor por ENTIDADE, com a lista COMPLETA de plataformas — não a filtrada.
     É isto que garante que esconder o Booking não repinte o Airbnb. */
  const CHAVES = ['airbnb', 'booking', 'manual'];
  const corDaPlataforma = (nome) => {
    const chave = String(nome).toLowerCase().replace('.com', '');
    return tema.platform[chave] ?? tema.series[CHAVES.length];
  };

  const dadosDePlataforma = platformData.map((p) => ({
    name: p.platform || 'Manual',
    value: p.bookings_count || 0,
    revenue: p.total_revenue || 0,
  }));

  const eixo = { stroke: tema.axis, tick: { fill: tema.inkMuted, fontSize: 12 } };

  const resumo = [
    { chave: 'reservas', rotulo: 'Reservas', valor: totalBookings, icone: Calendar },
    { chave: 'receita', rotulo: 'Receita', valor: formatCurrency(totalRevenue), icone: DollarSign },
    { chave: 'ocupacao', rotulo: 'Ocupação média', valor: `${ocupacaoMedia}%`, icone: Percent },
    {
      chave: 'ticket',
      rotulo: 'Receita por reserva',
      valor: totalBookings > 0 ? formatCurrency(totalRevenue / totalBookings) : formatCurrency(0),
      icone: TrendingUp,
    },
  ];

  const semDados = totalBookings === 0 && occupancyData.length === 0;

  return (
    <div className="sta">
      <PageHeader
        description="Ocupação, receita e distribuição por plataforma. Cada gráfico tem uma visão de tabela equivalente."
        actions={
          <Button icon={<RefreshCw />} loading={loading} onClick={carregar}>
            Atualizar
          </Button>
        }
        filters={
          <Select
            label="Período"
            density="compact"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </Select>
        }
      />

      {loading ? (
        <div aria-busy="true" aria-label="Carregando estatísticas">
          <Skeleton variant="text" lines={4} />
        </div>
      ) : semDados ? (
        <EmptyState
          icon={<BarChart3 />}
          title="Ainda não há dados"
          description="Sincronize os calendários para que ocupação e receita passem a ser calculadas."
          action={
            <Button icon={<RefreshCw />} onClick={carregar}>
              Atualizar
            </Button>
          }
        />
      ) : (
        <>
          <ul className="sta-resumo" role="list">
            {resumo.map((r) => {
              const Icone = r.icone;
              return (
                <li key={r.chave}>
                  <Card variant="outlined" className="sta-resumo__item">
                    <span className="sta-resumo__icone">
                      <Icone aria-hidden="true" focusable="false" />
                    </span>
                    <span className="sta-resumo__corpo">
                      <span className="sta-resumo__rotulo">{r.rotulo}</span>
                      <span className="sta-resumo__valor">{r.valor}</span>
                    </span>
                  </Card>
                </li>
              );
            })}
          </ul>

          <div className="sta-grade">
            <Grafico
              titulo="Taxa de ocupação por mês"
              icone={TrendingUp}
              vazio={occupancyData.length === 0}
              colunas={[
                { key: 'mes', header: 'Mês' },
                { key: 'taxa', header: 'Ocupação', align: 'end' },
              ]}
              linhas={occupancyData.map((d, i) => ({
                id: i,
                mes: formatMonth(d.month),
                taxa: `${Math.round(d.occupancy_rate || 0)}%`,
              }))}
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={occupancyData}>
                  {/* Grade só na horizontal: linhas verticais competem com a
                      própria série numa série temporal. */}
                  <CartesianGrid stroke={tema.grid} vertical={false} />
                  <XAxis dataKey="month" {...eixo} tickFormatter={formatMonth} />
                  <YAxis {...eixo} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    content={<Dica tema={tema} formatar={(v) => `${Math.round(v)}%`} />}
                    cursor={{ stroke: tema.grid }}
                  />
                  <Line
                    type="monotone"
                    dataKey="occupancy_rate"
                    name="Ocupação"
                    stroke={tema.series[0]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Grafico>

            <Grafico
              titulo="Receita por mês"
              icone={DollarSign}
              vazio={revenueData.length === 0}
              colunas={[
                { key: 'mes', header: 'Mês' },
                { key: 'valor', header: 'Receita', align: 'end' },
              ]}
              linhas={revenueData.map((d, i) => ({
                id: i,
                mes: formatMonth(d.month),
                valor: formatCurrency(d.total_revenue || 0),
              }))}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueData}>
                  <CartesianGrid stroke={tema.grid} vertical={false} />
                  <XAxis dataKey="month" {...eixo} tickFormatter={formatMonth} />
                  <YAxis {...eixo} tickFormatter={formatCurrencyShort} />
                  <Tooltip
                    content={<Dica tema={tema} formatar={formatCurrency} />}
                    cursor={{ fill: tema.grid }}
                  />
                  {/* Cantos arredondados só no topo: a base fica ancorada à
                      linha de zero, que é de onde a barra é lida. */}
                  <Bar
                    dataKey="total_revenue"
                    name="Receita"
                    fill={tema.series[1]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Grafico>

            <Grafico
              titulo="Reservas por plataforma"
              icone={Calendar}
              vazio={dadosDePlataforma.length === 0}
              colunas={[
                { key: 'plataforma', header: 'Plataforma' },
                { key: 'reservas', header: 'Reservas', align: 'end' },
                { key: 'receita', header: 'Receita', align: 'end' },
              ]}
              linhas={dadosDePlataforma.map((d, i) => ({
                id: i,
                plataforma: d.name,
                reservas: d.value,
                receita: formatCurrency(d.revenue),
              }))}
            >
              <div className="sta-pizza">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={dadosDePlataforma}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={54}
                      outerRadius={84}
                      // Anel de superfície entre as fatias: sem ele, duas cores
                      // adjacentes se tocam e a fronteira some.
                      stroke={tema.surface}
                      strokeWidth={2}
                    >
                      {dadosDePlataforma.map((d) => (
                        <Cell key={d.name} fill={corDaPlataforma(d.name)} />
                      ))}
                    </Pie>
                    <Tooltip content={<Dica tema={tema} />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legenda com rótulo direto: identidade nunca depende só da cor. */}
                <ul className="sta-legenda" role="list">
                  {dadosDePlataforma.map((d) => (
                    <li className="sta-legenda__item" key={d.name}>
                      <span
                        className="sta-legenda__marca"
                        style={{ backgroundColor: corDaPlataforma(d.name) }}
                        aria-hidden="true"
                      />
                      <span className="sta-legenda__nome">{d.name}</span>
                      <span className="sta-legenda__valor">
                        {d.value} · {formatCurrency(d.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Grafico>

            <Grafico
              titulo="Noites reservadas por mês"
              icone={Calendar}
              vazio={occupancyData.length === 0}
              colunas={[
                { key: 'mes', header: 'Mês' },
                { key: 'noites', header: 'Noites', align: 'end' },
              ]}
              linhas={occupancyData.map((d, i) => ({
                id: i,
                mes: formatMonth(d.month),
                noites: d.booked_nights || 0,
              }))}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={occupancyData}>
                  <CartesianGrid stroke={tema.grid} vertical={false} />
                  <XAxis dataKey="month" {...eixo} tickFormatter={formatMonth} />
                  <YAxis {...eixo} />
                  <Tooltip content={<Dica tema={tema} />} cursor={{ fill: tema.grid }} />
                  <Bar
                    dataKey="booked_nights"
                    name="Noites"
                    fill={tema.series[4]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Grafico>
          </div>
        </>
      )}
    </div>
  );
};

export default Statistics;
