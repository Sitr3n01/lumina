// Nomes da API do lucide-react 0.344 — a versão instalada. `TriangleAlert` e
// `ChartColumn` são renomeações posteriores e não existem aqui.
import {
  Home,
  CalendarDays,
  AlertTriangle,
  BarChart3,
  FileText,
  Mail,
  Sparkles,
} from 'lucide-react';

/**
 * Os destinos primários. Sete — o teto de um rail antes de a lista virar um menu
 * que se lê em vez de se reconhecer.
 *
 * "Template do condomínio" saiu daqui e virou uma ação dentro de Documentos: é um
 * documento que se gera, exatamente como a autorização de hóspede, e não um lugar
 * onde se está. Notificações e Configurações também não são destinos primários —
 * são utilidades, e moram na app bar.
 *
 * A ORDEM é a do fluxo de trabalho, não alfabética: chega-se pelo panorama
 * (Início), olha-se o que vem (Calendário), resolve-se o que está errado
 * (Conflitos), mede-se (Estatísticas), produz-se (Documentos, Emails) e por fim
 * pergunta-se (Assistente).
 */
const DESTINOS = [
  { id: 'dashboard', label: 'Início', icon: Home },
  { id: 'calendar', label: 'Calendário', icon: CalendarDays },
  { id: 'conflicts', label: 'Conflitos', icon: AlertTriangle },
  { id: 'statistics', label: 'Estatísticas', icon: BarChart3 },
  { id: 'documents', label: 'Documentos', icon: FileText },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'ai-pricing', label: 'Assistente', icon: Sparkles },
];

/** Título mostrado na app bar. Inclui as telas que não são destinos primários. */
export const TITULOS = {
  ...Object.fromEntries(DESTINOS.map((d) => [d.id, d.label])),
  notifications: 'Notificações',
  settings: 'Configurações',
  'condo-template': 'Template do condomínio',
};

export default DESTINOS;
