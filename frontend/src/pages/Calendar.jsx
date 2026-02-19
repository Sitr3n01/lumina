import { useState, useEffect } from 'react';
import { RefreshCw, Loader, AlertTriangle, CheckCircle } from 'lucide-react';
import CalendarComponent from '../components/Calendar';
import EventModal from '../components/EventModal';
import { calendarAPI } from '../services/api';
import { usePropertyId } from '../contexts/PropertyContext';
import './CalendarPage.css';

const Calendar = () => {
  const { propertyId } = usePropertyId();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [message, setMessage] = useState(null);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);

      // Calcular range do mês atual +/- 1 mês
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

      const response = await calendarAPI.getEvents({
        property_id: propertyId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });

      setEvents(response.data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await calendarAPI.sync();

      // Aguardar 2 segundos para dar tempo do backend processar
      await new Promise(resolve => setTimeout(resolve, 2000));

      await loadEvents();
    } catch (error) {
      console.error('Error syncing calendar:', error);
      showMessage('Erro ao sincronizar. Verifique se as URLs iCal estão configuradas.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <div className="calendar-page">
        <div className="loading-state">
          <Loader className="spin" size={32} />
          <p>Carregando calendário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      <div className="calendar-page-header">
        <div>
          <h1>Calendário</h1>
          <p className="subtitle">
            Visualize todas as reservas do Airbnb e Booking.com
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <Loader className="spin" size={16} />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Sincronizar
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`message message-${message.type}`} style={{ marginBottom: '20px' }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {events.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma reserva encontrada para este período.</p>
          <p className="empty-hint">
            Configure as URLs iCal nas Configurações e clique em Sincronizar.
          </p>
        </div>
      ) : (
        <>
          <div className="calendar-stats">
            <div className="stat-badge">
              <span className="stat-number">{events.length}</span>
              <span className="stat-label">
                {events.length === 1 ? 'reserva' : 'reservas'} no período
              </span>
            </div>
            <div className="stat-badge">
              <span className="stat-number">
                {events.filter(e => e.platform === 'airbnb').length}
              </span>
              <span className="stat-label">Airbnb</span>
            </div>
            <div className="stat-badge">
              <span className="stat-number">
                {events.filter(e => e.platform === 'booking').length}
              </span>
              <span className="stat-label">Booking</span>
            </div>
          </div>

          <CalendarComponent
            events={events}
            onEventClick={handleEventClick}
            currentDate={currentDate}
          />
        </>
      )}

      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={closeModal} />
      )}
    </div>
  );
};

export default Calendar;
