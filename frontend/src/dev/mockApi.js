import {
  aiAPI,
  authAPI,
  bookingsAPI,
  calendarAPI,
  conflictsAPI,
  documentsAPI,
  emailsAPI,
  notificationsAPI,
  settingsAPI,
  statisticsAPI,
} from '../services/api';

/**
 * Dublê da API, para a bancada de páginas.
 *
 * Substitui os métodos NOS PRÓPRIOS objetos exportados: `export const xAPI = {…}`
 * cria uma ligação constante, mas o objeto continua mutável, e é ele que as
 * páginas já capturaram no import. Trocar as propriedades alcança todo mundo sem
 * precisar de injeção de dependência nem de bundler especial.
 *
 * Existe para exercitar os caminhos de RENDER das nove telas sem subir o backend
 * e sem tocar no banco do usuário. Não substitui o teste com o servidor real:
 * aqui os formatos são os que EU assumi ao escrever as telas, então isto pega
 * erro de render, não divergência de contrato com o backend.
 */

const hoje = new Date();
const emDias = (n) => {
  const d = new Date(hoje);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};
const mes = (n) => {
  const d = new Date(hoje);
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const RESERVAS = [
  { id: 1, guest_name: 'Ana Ribeiro', platform: 'airbnb', check_in_date: emDias(2), check_out_date: emDias(6), guest_count: 2, nights_count: 4, total_price: 1480, external_id: 'HMABC123', status: 'Confirmado', guest_email: 'ana@exemplo.com', guest_phone: '(61) 90000-0000' },
  { id: 2, guest_name: 'Bruno Sales', platform: 'booking', check_in_date: emDias(7), check_out_date: emDias(9), guest_count: 4, nights_count: 2, total_price: 690, external_id: 'BK-99887', status: 'Confirmado' },
  { id: 3, guest_name: 'Clara Moura', platform: 'manual', check_in_date: emDias(12), check_out_date: emDias(19), guest_count: 6, nights_count: 7, total_price: 2310, status: 'Pendente' },
  { id: 4, guest_name: 'Diego Prado', platform: 'airbnb', check_in_date: emDias(-3), check_out_date: emDias(1), guest_count: 2, nights_count: 4, total_price: 1200, status: 'Em estadia' },
];

const OCUPACAO = [5, 4, 3, 2, 1, 0].map((n) => ({
  month: mes(n),
  occupancy_rate: [48, 61, 55, 72, 83, 67][5 - n],
  booked_nights: [14, 18, 17, 22, 26, 20][5 - n],
}));

const RECEITA = OCUPACAO.map((o, i) => ({
  month: o.month,
  total_revenue: [4200, 5300, 4900, 6800, 8100, 6200][i],
}));

const ok = (data) => () => Promise.resolve({ data });

export default function instalarDubles() {
  Object.assign(authAPI, {
    getMe: () => Promise.resolve({ id: 1, username: 'proprietaria', full_name: 'Proprietária' }),
    checkSetup: () => Promise.resolve({ needs_setup: false }),
    login: () => Promise.resolve({ user: { id: 1, username: 'proprietaria' } }),
    logout: () => Promise.resolve({}),
  });

  Object.assign(bookingsAPI, { getUpcoming: ok(RESERVAS.slice(0, 3)) });

  Object.assign(calendarAPI, {
    getEvents: ok(RESERVAS),
    sync: () => new Promise((r) => setTimeout(() => r({ data: { synced: 4 } }), 300)),
  });

  Object.assign(conflictsAPI, {
    getAll: ok([
      {
        id: 1, severity: 'critical', conflict_type: 'overlap', overlap_nights: 2,
        detected_at: new Date().toISOString(),
        booking_1: RESERVAS[0],
        booking_2: { ...RESERVAS[1], check_in_date: emDias(4), check_out_date: emDias(8) },
      },
      {
        id: 2, severity: 'medium', conflict_type: 'duplicate', overlap_nights: 0,
        detected_at: new Date().toISOString(),
        booking_1: RESERVAS[2], booking_2: RESERVAS[2],
      },
    ]),
    getSummary: ok({ total: 2, critical: 1, high: 0, medium: 1, duplicates: 1, overlaps: 1 }),
    detect: ok({ found: 2 }),
    resolve: ok({ ok: true }),
  });

  Object.assign(statisticsAPI, {
    getOccupancy: ok({ months: OCUPACAO }),
    getRevenue: ok(RECEITA),
    getPlatforms: ok([
      { platform: 'Airbnb', bookings_count: 18, total_revenue: 21400 },
      { platform: 'Booking.com', bookings_count: 11, total_revenue: 12800 },
      { platform: 'Manual', bookings_count: 4, total_revenue: 3900 },
    ]),
    getMonthlyReport: ok({ occupancy_rate: 67.4, total_revenue: 6200, total_bookings: 8 }),
  });

  Object.assign(documentsAPI, {
    list: ok([
      { filename: 'autorizacao-ana-ribeiro.pdf', name: 'Autorização — Ana Ribeiro', created_at: new Date().toISOString(), size_kb: 84 },
      { filename: 'recibo-bruno-sales.pdf', name: 'Recibo — Bruno Sales', created_at: new Date().toISOString(), size_kb: 46 },
    ]),
    generate: ok({ ok: true }),
    generateFromBooking: ok({ ok: true }),
    generateReceiptFromBooking: ok({ ok: true }),
    delete: ok({ ok: true }),
  });

  Object.assign(emailsAPI, {
    send: ok({ ok: true }),
    fetch: ok({
      emails: [
        { id: 1, sender: 'Airbnb', subject: 'Nova reserva confirmada', date: new Date().toISOString(), body_preview: 'Ana Ribeiro reservou de 12 a 16 de agosto.', unread: true },
        { id: 2, sender: 'Booking.com', subject: 'Alteração de reserva', date: new Date().toISOString(), body_preview: 'Bruno Sales alterou a data de saída.' },
      ],
    }),
    testConnection: ok({ success: true, smtp: true, imap: true, message: 'SMTP e IMAP responderam.' }),
    sendBookingConfirmation: ok({ ok: true }),
    sendCheckinReminder: ok({ ok: true }),
    sendBulkReminders: ok({ sent: 3 }),
  });

  Object.assign(settingsAPI, {
    getAll: ok({
      propertyName: 'Apto 803 — Bloco C', propertyAddress: 'Rua das Thermas, 100', maxGuests: 6,
      condoName: 'Condomínio Exemplo', condoAdminName: 'Administração', condoEmail: 'adm@exemplo.com',
      ownerName: 'Proprietária Exemplo', ownerEmail: 'proprietaria@exemplo.com', ownerPhone: '(61) 90000-0000',
      ownerApto: '803', ownerBloco: 'C', ownerGaragem: '176',
      airbnbIcalUrl: 'https://airbnb.com/calendar/ical/exemplo.ics',
      bookingIcalUrl: 'https://admin.booking.com/exemplo.ics',
      syncIntervalMinutes: 30, telegramBotToken: '••••••••',
      emailProvider: 'gmail', emailFrom: 'contato@exemplo.com', emailPasswordSet: true,
      enableAutoDocumentGeneration: true, enableConflictNotifications: true,
      aiProvider: 'anthropic', aiApiKeySet: true, aiModel: '', aiBaseUrl: '',
    }),
    update: ok({ ok: true }),
    reset: ok({ ok: true }),
  });

  Object.assign(notificationsAPI, {
    getAll: ok({
      total: 5,
      unread_count: 2,
      items: [
        { id: 1, type: 'new_booking', title: 'Nova reserva no Airbnb', message: 'Ana Ribeiro, 4 noites a partir de quinta.', created_at: new Date().toISOString(), is_read: false },
        { id: 2, type: 'conflict', title: 'Conflito detectado', message: 'Airbnb e Booking reservaram as mesmas datas.', created_at: new Date().toISOString(), is_read: false },
        { id: 3, type: 'sync', title: 'Calendários sincronizados', message: '4 reservas atualizadas.', created_at: new Date().toISOString(), is_read: true },
        { id: 4, type: 'document', title: 'Autorização gerada', message: 'Documento de Ana Ribeiro pronto.', created_at: new Date().toISOString(), is_read: true },
        { id: 5, type: 'email', title: 'Lembrete enviado', message: 'Check-in de amanhã avisado.', created_at: new Date().toISOString(), is_read: true },
      ],
    }),
    getSummary: ok({ total: 5, unread: 2, today: 3, by_type: { conflict: 1, new_booking: 1, sync: 1 } }),
    markAsRead: ok({ ok: true }),
    markAllAsRead: ok({ ok: true }),
  });

  Object.assign(aiAPI, {
    chat: () =>
      new Promise((r) =>
        setTimeout(
          () => r({ data: { success: true, reply: 'Sua ocupação neste mês está em 67%, acima da média dos últimos seis meses. As datas livres mais próximas são 10 a 12 de agosto.' } }),
          400,
        ),
      ),
    getPriceSuggestions: ok({
      generated_at: new Date().toISOString(),
      suggestions: [
        { date: emDias(3), suggested_price: 380, reasoning: 'Fim de semana com alta procura na região.' },
        { date: emDias(4), suggested_price: 420, reasoning: 'Feriado prolongado.' },
        { date: emDias(10), suggested_price: 290, reasoning: 'Meio de semana, procura baixa.' },
      ],
    }),
    testConnection: ok({ success: true, message: 'Conexão com Anthropic estabelecida.' }),
  });
}
