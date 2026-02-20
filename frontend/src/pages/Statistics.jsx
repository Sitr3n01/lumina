import { useState, useEffect } from 'react';
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
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { RefreshCw, TrendingUp, Calendar, DollarSign, Percent } from 'lucide-react';
import { statisticsAPI } from '../services/api';
import { usePropertyId } from '../contexts/PropertyContext';
import { formatCurrency, formatCurrencyShort, formatMonth } from '../utils/formatters';
import './Statistics.css';

const Statistics = () => {
  const { propertyId } = usePropertyId();
  const [loading, setLoading] = useState(true);
  const [occupancyData, setOccupancyData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [platformData, setPlatformData] = useState([]);
  const [period, setPeriod] = useState('6months'); // 6months, year, all

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);

        const endDate = new Date();
        const startDate = new Date();

        if (period === '6months') {
          startDate.setMonth(startDate.getMonth() - 6);
        } else if (period === 'year') {
          startDate.setFullYear(startDate.getFullYear() - 1);
        } else {
          startDate.setFullYear(startDate.getFullYear() - 3);
        }

        const params = {
          property_id: propertyId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        };

        const results = await Promise.allSettled([
          statisticsAPI.getOccupancy(params),
          statisticsAPI.getRevenue(params),
          statisticsAPI.getPlatforms(params),
        ]);
        if (cancelled) return;

        if (results[0].status === 'fulfilled') {
          const data = results[0].value.data;
          setOccupancyData(data?.months || data || []);
        }
        if (results[1].status === 'fulfilled') {
          setRevenueData(results[1].value.data || []);
        }
        if (results[2].status === 'fulfilled') {
          setPlatformData(results[2].value.data || []);
        }
      } catch (error) {
        if (!cancelled) console.error('Error loading statistics:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [period]);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      const endDate = new Date();
      const startDate = new Date();

      if (period === '6months') {
        startDate.setMonth(startDate.getMonth() - 6);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      } else {
        startDate.setFullYear(startDate.getFullYear() - 3);
      }

      const params = {
        property_id: propertyId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      };

      const results = await Promise.allSettled([
        statisticsAPI.getOccupancy(params),
        statisticsAPI.getRevenue(params),
        statisticsAPI.getPlatforms(params),
      ]);

      if (results[0].status === 'fulfilled') {
        const data = results[0].value.data;
        setOccupancyData(data?.months || data || []);
      }
      if (results[1].status === 'fulfilled') {
        setRevenueData(results[1].value.data || []);
      }
      if (results[2].status === 'fulfilled') {
        setPlatformData(results[2].value.data || []);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="statistics-page">
        <div className="loading-state">
          <RefreshCw className="spin" size={32} />
          <p>Carregando estatísticas...</p>
        </div>
      </div>
    );
  }

  // Dados para o gráfico de pizza de plataformas
  const platformChartData = platformData.map((item) => ({
    name: item.platform === 'airbnb' ? 'Airbnb' : item.platform === 'booking' ? 'Booking.com' : 'Manual',
    value: item.bookings_count,
    revenue: item.total_revenue,
  }));

  const COLORS = {
    Airbnb: '#FF5A5F',
    'Booking.com': '#003580',
    Manual: '#64748b',
  };

  // Calcular totais
  const totalBookings = platformData.reduce((sum, p) => sum + (p.bookings_count || 0), 0);
  const totalRevenue = platformData.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
  const avgOccupancy = occupancyData.length > 0
    ? (occupancyData.reduce((sum, d) => sum + (d.occupancy_rate || 0), 0) / occupancyData.length).toFixed(1)
    : 0;

  return (
    <div className="statistics-page">
      <div className="statistics-header">
        <div>
          <h1>Estatísticas e Relatórios</h1>
          <p className="subtitle">Análise detalhada de ocupação, receita e desempenho</p>
        </div>
        <div className="header-controls">
          <select
            className="period-selector"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="6months">Últimos 6 meses</option>
            <option value="year">Último ano</option>
            <option value="all">Todos os dados</option>
          </select>
          <button className="btn btn-primary" onClick={loadStatistics}>
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="stats-summary">
        <div className="summary-card">
          <div className="summary-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
            <Calendar size={24} />
          </div>
          <div className="summary-content">
            <p className="summary-label">Total de Reservas</p>
            <p className="summary-value">{totalBookings}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            <DollarSign size={24} />
          </div>
          <div className="summary-content">
            <p className="summary-label">Receita Total</p>
            <p className="summary-value">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>
            <Percent size={24} />
          </div>
          <div className="summary-content">
            <p className="summary-label">Ocupação Média</p>
            <p className="summary-value">{avgOccupancy}%</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon" style={{ background: '#e0e7ff', color: '#6366f1' }}>
            <TrendingUp size={24} />
          </div>
          <div className="summary-content">
            <p className="summary-label">Receita Média/Reserva</p>
            <p className="summary-value">
              {totalBookings > 0 ? formatCurrency(totalRevenue / totalBookings) : 'R$ 0,00'}
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        {/* Gráfico de Ocupação */}
        <div className="chart-card">
          <h2 className="chart-title">
            <TrendingUp size={20} />
            Taxa de Ocupação Mensal
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => formatMonth(value)}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value) => [`${value}%`, 'Ocupação']}
                labelFormatter={(label) => formatMonth(label)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="occupancy_rate"
                stroke="#2563eb"
                strokeWidth={2}
                name="Taxa de Ocupação"
                dot={{ fill: '#2563eb', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Receita */}
        <div className="chart-card">
          <h2 className="chart-title">
            <DollarSign size={20} />
            Receita Mensal
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => formatMonth(value)}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => formatCurrencyShort(value)}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value) => [formatCurrency(value), 'Receita']}
                labelFormatter={(label) => formatMonth(label)}
              />
              <Legend />
              <Bar
                dataKey="total_revenue"
                fill="#16a34a"
                name="Receita Total"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Plataformas */}
        <div className="chart-card">
          <h2 className="chart-title">
            <Calendar size={20} />
            Distribuição por Plataforma
          </h2>
          <div className="pie-chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={platformChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {platformChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value, name, props) => [
                    `${value} reservas (${formatCurrency(props.payload.revenue)})`,
                    props.payload.name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legenda personalizada */}
            <div className="platform-legend">
              {platformChartData.map((item) => (
                <div key={item.name} className="legend-item">
                  <div
                    className="legend-color"
                    style={{ background: COLORS[item.name] }}
                  />
                  <div className="legend-info">
                    <span className="legend-name">{item.name}</span>
                    <span className="legend-details">
                      {item.value} reservas • {formatCurrency(item.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gráfico de Noites Reservadas */}
        <div className="chart-card">
          <h2 className="chart-title">
            <Calendar size={20} />
            Noites Reservadas por Mês
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={occupancyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => formatMonth(value)}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value) => [value, 'Noites']}
                labelFormatter={(label) => formatMonth(label)}
              />
              <Legend />
              <Bar
                dataKey="booked_nights"
                fill="#6366f1"
                name="Noites Reservadas"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Estado vazio */}
      {totalBookings === 0 && (
        <div className="empty-state">
          <TrendingUp size={48} />
          <h3>Nenhum dado disponível</h3>
          <p>Sincronize suas reservas para visualizar estatísticas detalhadas.</p>
        </div>
      )}
    </div>
  );
};

// formatCurrency, formatCurrencyShort, formatMonth importados de ../utils/formatters

export default Statistics;
