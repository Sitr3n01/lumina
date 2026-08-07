import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, IconButton } from './ui';
import './Calendar.css';

const DIAS_DA_SEMANA = [
  { curto: 'Dom', longo: 'domingo' },
  { curto: 'Seg', longo: 'segunda-feira' },
  { curto: 'Ter', longo: 'terça-feira' },
  { curto: 'Qua', longo: 'quarta-feira' },
  { curto: 'Qui', longo: 'quinta-feira' },
  { curto: 'Sex', longo: 'sexta-feira' },
  { curto: 'Sáb', longo: 'sábado' },
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const CELULAS = 42; // 6 semanas x 7 dias, sempre — a grade não muda de altura

const mesmoDia = (a, b) =>
  a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

/**
 * Grade mensal de reservas.
 *
 * `role="grid"` com tabindex itinerante: o mês inteiro é UMA parada de Tab, e as
 * setas percorrem os dias — o padrão de 03-acessibilidade.md §4.2 para grade
 * temporal. Antes cada dia era uma `<div>` e os eventos eram `<div onClick>`:
 * a tela mais usada do produto não tinha nenhum acesso por teclado.
 */
const CalendarComponent = ({ events = [], onEventClick, currentDate = new Date() }) => {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [ativo, setAtivo] = useState(null); // índice da célula com tabindex 0
  const gradeRef = useRef(null);

  const ano = selectedDate.getFullYear();
  const mes = selectedDate.getMonth();

  const dias = (() => {
    const primeiro = new Date(ano, mes, 1);
    const totalNoMes = new Date(ano, mes + 1, 0).getDate();
    const inicioSemana = primeiro.getDay();
    const ultimoDoAnterior = new Date(ano, mes, 0).getDate();
    const lista = [];

    for (let i = inicioSemana - 1; i >= 0; i--) {
      lista.push({ date: new Date(ano, mes - 1, ultimoDoAnterior - i), doMes: false });
    }
    for (let d = 1; d <= totalNoMes; d++) {
      lista.push({ date: new Date(ano, mes, d), doMes: true });
    }
    for (let d = 1; lista.length < CELULAS; d++) {
      lista.push({ date: new Date(ano, mes + 1, d), doMes: false });
    }
    return lista;
  })();

  // Índice padrão: hoje, se estiver no mês; senão o dia 1. Sem isto, a primeira
  // seta do teclado começaria numa célula arbitrária.
  const indicePadrao = (() => {
    const hoje = dias.findIndex((d) => d.doMes && mesmoDia(d.date, new Date()));
    return hoje >= 0 ? hoje : dias.findIndex((d) => d.doMes);
  })();
  const indiceAtivo = ativo ?? indicePadrao;

  const eventosDoDia = (date) =>
    events.filter((e) => {
      const inicio = new Date(e.check_in_date);
      const fim = new Date(e.check_out_date);
      const abre = new Date(date);
      abre.setHours(0, 0, 0, 0);
      const fecha = new Date(date);
      fecha.setHours(23, 59, 59, 999);
      return inicio <= fecha && fim >= abre;
    });

  const focarCelula = useCallback((indice) => {
    setAtivo(indice);
    // O foco tem de ir depois do render que troca o tabindex, senão o navegador
    // recusa focar um elemento ainda com tabindex -1.
    requestAnimationFrame(() => {
      gradeRef.current?.querySelector(`[data-indice="${indice}"]`)?.focus();
    });
  }, []);

  const handleKeyDown = (event, indice) => {
    const passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

    if (event.key in passos) {
      const alvo = indice + passos[event.key];
      if (alvo < 0 || alvo >= CELULAS) return; // fim da grade: não dá a volta
      event.preventDefault();
      focarCelula(alvo);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const inicioDaSemana = Math.floor(indice / 7) * 7;
      focarCelula(event.key === 'Home' ? inicioDaSemana : inicioDaSemana + 6);
      return;
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault();
      setAtivo(null);
      setSelectedDate(new Date(ano, mes + (event.key === 'PageUp' ? -1 : 1), 1));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const primeiro = eventosDoDia(dias[indice].date)[0];
      if (primeiro) {
        event.preventDefault();
        onEventClick?.(primeiro);
      }
    }
  };

  const irParaHoje = () => {
    setAtivo(null);
    setSelectedDate(new Date());
  };

  const trocarMes = (delta) => {
    setAtivo(null);
    setSelectedDate(new Date(ano, mes + delta, 1));
  };

  return (
    <section className="cal" aria-label={`Calendário de ${MESES[mes]} de ${ano}`}>
      <header className="cal__topo">
        {/* `aria-live` para que a troca de mês seja anunciada: quem navega por
            teclado muda de mês com PageUp/PageDown sem ver o cabeçalho. */}
        <h2 className="cal__titulo" aria-live="polite">
          {MESES[mes]} {ano}
        </h2>
        <div className="cal__nav">
          <Button variant="text" density="compact" onClick={irParaHoje}>
            Hoje
          </Button>
          <IconButton
            density="compact"
            aria-label={`Mês anterior, ${MESES[(mes + 11) % 12]}`}
            onClick={() => trocarMes(-1)}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            density="compact"
            aria-label={`Próximo mês, ${MESES[(mes + 1) % 12]}`}
            onClick={() => trocarMes(1)}
          >
            <ChevronRight />
          </IconButton>
        </div>
      </header>

      <div className="cal__grade" role="grid" ref={gradeRef}>
        <div className="cal__semana" role="row">
          {DIAS_DA_SEMANA.map((d) => (
            <span key={d.curto} className="cal__cabecalho" role="columnheader" abbr={d.longo}>
              {d.curto}
            </span>
          ))}
        </div>

        {Array.from({ length: 6 }, (_, semana) => (
          <div className="cal__semana" role="row" key={semana}>
            {dias.slice(semana * 7, semana * 7 + 7).map((dia, coluna) => {
              const indice = semana * 7 + coluna;
              const doDia = eventosDoDia(dia.date);
              const ehHoje = mesmoDia(dia.date, new Date());

              return (
                <div
                  key={indice}
                  role="gridcell"
                  data-indice={indice}
                  className="cal__dia"
                  data-fora={!dia.doMes || undefined}
                  data-hoje={ehHoje || undefined}
                  tabIndex={indice === indiceAtivo ? 0 : -1}
                  aria-current={ehHoje ? 'date' : undefined}
                  aria-label={`${dia.date.getDate()} de ${MESES[dia.date.getMonth()]}${
                    doDia.length ? `, ${doDia.length} reserva${doDia.length > 1 ? 's' : ''}` : ''
                  }`}
                  onKeyDown={(e) => handleKeyDown(e, indice)}
                  onFocus={() => setAtivo(indice)}
                >
                  <span className="cal__numero">{dia.date.getDate()}</span>
                  <div className="cal__eventos">
                    {doDia.slice(0, 3).map((evento, i) => (
                      <button
                        key={evento.id ?? i}
                        type="button"
                        className="cal__evento"
                        data-plataforma={(evento.platform || 'manual').toLowerCase()}
                        // Fora da ordem de Tab por desenho: a grade é uma parada
                        // só. Pelo teclado se chega ao evento com Enter no dia.
                        tabIndex={-1}
                        onClick={() => onEventClick?.(evento)}
                      >
                        {evento.guest_name}
                      </button>
                    ))}
                    {doDia.length > 3 ? (
                      <span className="cal__mais">+{doDia.length - 3}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legenda: a plataforma é distinguida por cor E por rótulo. A cor sozinha
          desapareceria para quem não a enxerga. */}
      <ul className="cal__legenda" role="list">
        {[
          ['airbnb', 'Airbnb'],
          ['booking', 'Booking.com'],
          ['manual', 'Manual'],
        ].map(([chave, rotulo]) => (
          <li className="cal__legenda-item" key={chave}>
            <span className="cal__legenda-marca" data-plataforma={chave} aria-hidden="true" />
            {rotulo}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CalendarComponent;
