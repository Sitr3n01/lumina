import { User, Mail, Phone, Users, LogIn, LogOut, Moon, Wallet, Hash, CheckCircle } from 'lucide-react';
import { Chip, Dialog } from './ui';
import { formatDateFull } from '../utils/formatters';
import './EventModal.css';

const PLATAFORMAS = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  manual: 'Manual',
};

/**
 * Detalhes de uma reserva.
 *
 * Antes era `<div className="modal-overlay">` — sem foco preso, sem Escape, sem
 * devolução de foco ao gatilho e sem travar a rolagem do fundo. E o CSS próprio
 * (`EventModal.css`) era CÓDIGO MORTO: redeclarava `.modal-*`, que o `global.css`
 * vencia por chegar depois na cascata. Agora é `<Dialog>`, que traz os quatro.
 */
const EventModal = ({ event, onClose }) => {
  if (!event) return null;

  const plataforma = (event.platform || 'manual').toLowerCase();

  const itens = [
    { icone: User, rotulo: 'Hóspede', valor: event.guest_name },
    { icone: Mail, rotulo: 'E-mail', valor: event.guest_email },
    { icone: Phone, rotulo: 'Telefone', valor: event.guest_phone },
    { icone: Users, rotulo: 'Hóspedes', valor: event.guest_count || 1 },
    {
      icone: LogIn,
      rotulo: 'Check-in',
      valor: formatDateFull(event.check_in_date || event.check_in),
    },
    {
      icone: LogOut,
      rotulo: 'Check-out',
      valor: formatDateFull(event.check_out_date || event.check_out),
    },
    {
      icone: Moon,
      rotulo: 'Duração',
      valor: event.nights_count
        ? `${event.nights_count} noite${event.nights_count > 1 ? 's' : ''}`
        : null,
    },
    {
      icone: Wallet,
      rotulo: 'Total',
      valor: event.total_price
        ? `R$ ${Number(event.total_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : null,
    },
    { icone: Hash, rotulo: 'Identificador externo', valor: event.external_id, mono: true },
    { icone: CheckCircle, rotulo: 'Situação', valor: event.status },
  ].filter((i) => i.valor !== null && i.valor !== undefined && i.valor !== '');

  return (
    <Dialog open title="Detalhes da reserva" onClose={onClose} dismissible>
      <Chip
        variant="assist"
        className="evt__plataforma"
        data-plataforma={plataforma}
        label={PLATAFORMAS[plataforma] || event.platform}
      />

      {/* `<dl>` e não uma pilha de divs: rótulo e valor formam pares, e é isso
          que o leitor de tela precisa para ler "Check-in, 12 de agosto". */}
      <dl className="evt">
        {itens.map((item) => {
          const Icone = item.icone;
          return (
            <div className="evt__item" key={item.rotulo}>
              <span className="evt__icone">
                <Icone aria-hidden="true" focusable="false" />
              </span>
              <dt className="evt__rotulo">{item.rotulo}</dt>
              <dd className="evt__valor" data-mono={item.mono || undefined}>
                {item.valor}
              </dd>
            </div>
          );
        })}
      </dl>
    </Dialog>
  );
};

export default EventModal;
