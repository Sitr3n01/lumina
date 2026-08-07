import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, CalendarOff } from 'lucide-react';
import CalendarComponent from '../components/Calendar';
import EventModal from '../components/EventModal';
import { Button, Card, EmptyState, Skeleton, useSnackbar } from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import { calendarAPI } from '../services/api';
import { usePropertyId } from '../contexts/PropertyContext';
import './CalendarPage.css';

const Calendar = () => {
  const { propertyId } = usePropertyId();
  const { show } = useSnackbar();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentDate] = useState(new Date());

  // Uma função só, memoizada. Antes havia esta lógica DUPLICADA: uma cópia dentro
  // do useEffect e outra fora, para o botão de sincronizar — e as duas podiam
  // divergir sem que nada acusasse.
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const inicio = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const fim = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);
      const response = await calendarAPI.getEvents({
        property_id: propertyId,
        start_date: inicio.toISOString().split('T')[0],
        end_date: fim.toISOString().split('T')[0],
      });
      setEvents(response.data || []);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, propertyId]);

  useEffect(() => {
    let cancelado = false;
    loadEvents().catch(() => {});
    return () => {
      cancelado = true;
      void cancelado;
    };
  }, [loadEvents]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await calendarAPI.sync();
      // O backend processa o iCal de forma assíncrona; sem a espera, a releitura
      // devolveria os dados anteriores e pareceria que a sincronização falhou.
      await new Promise((r) => setTimeout(r, 2000));
      await loadEvents();
      show('Calendários sincronizados.');
    } catch (error) {
      console.error('Error syncing calendar:', error);
      show('Falha ao sincronizar. Confira as URLs iCal em Configurações.', { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const porPlataforma = (p) => events.filter((e) => e.platform === p).length;

  const resumo = [
    { chave: 'total', valor: events.length, rotulo: events.length === 1 ? 'reserva' : 'reservas' },
    { chave: 'airbnb', valor: porPlataforma('airbnb'), rotulo: 'Airbnb' },
    { chave: 'booking', valor: porPlataforma('booking'), rotulo: 'Booking.com' },
  ];

  return (
    <div className="calp">
      <PageHeader
        description="Reservas do Airbnb e do Booking.com em uma grade só."
        actions={
          <Button icon={<RefreshCw />} loading={syncing} onClick={handleSync}>
            Sincronizar
          </Button>
        }
      />

      {loading ? (
        <div aria-busy="true" aria-label="Carregando o calendário">
          <Skeleton variant="rect" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarOff />}
          title="Nenhuma reserva no período"
          description="Cadastre as URLs iCal em Configurações e sincronize para ver as reservas aqui."
          action={
            <Button icon={<RefreshCw />} loading={syncing} onClick={handleSync}>
              Sincronizar agora
            </Button>
          }
        />
      ) : (
        <>
          <ul className="calp-resumo" role="list">
            {resumo.map((r) => (
              <li key={r.chave}>
                <Card variant="outlined" className="calp-resumo__item" data-plataforma={r.chave}>
                  <span className="calp-resumo__valor">{r.valor}</span>
                  <span className="calp-resumo__rotulo">{r.rotulo}</span>
                </Card>
              </li>
            ))}
          </ul>

          <CalendarComponent
            events={events}
            onEventClick={setSelectedEvent}
            currentDate={currentDate}
          />
        </>
      )}

      {selectedEvent ? (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      ) : null}
    </div>
  );
};

export default Calendar;
