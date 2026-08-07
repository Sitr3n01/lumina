import { useEffect, useState } from 'react';
import { useAppearance } from '../contexts/AppearanceContext';

/**
 * Tema de gráfico lido do CSS.
 *
 * Recharts recebe cor por prop em JavaScript, não por classe, então não há como um
 * `<Line stroke="...">` seguir o tema sozinho. Este módulo resolve isso lendo os
 * tokens do estilo computado e devolvendo valores concretos — o CSS continua sendo a
 * fonte única, e a troca de tema reemite as cores.
 *
 * Foi assim que o código anterior acabou com `background: 'white'` num tooltip de app
 * escuro, `fill="#8884d8"` (a cor padrão do Recharts, esquecida) e três verdes
 * diferentes para a mesma série.
 */

/** Ordem fixa dos oito slots. Determinada por enumeração das 40.320 permutações
 *  contra o validador de daltonismo, não por gosto. NUNCA cicle: uma nona série
 *  não recebe cor gerada — vira "Outros", pequenos múltiplos, ou muda de forma. */
const SLOTS = 8;

function lerVar(estilo, nome) {
  return estilo.getPropertyValue(nome).trim();
}

export function lerTemaDeGrafico() {
  if (typeof document === 'undefined') return null;
  const cs = getComputedStyle(document.documentElement);

  return {
    /** Categórico — identidade. Cor segue a ENTIDADE, nunca a posição no ranking:
     *  um filtro que muda a contagem de séries não pode repintar as sobreviventes. */
    series: Array.from({ length: SLOTS }, (_, i) => lerVar(cs, `--lm-chart-series-${i + 1}`)),
    /** Sequencial — magnitude. Uma matiz só, claro para escuro. */
    sequential: Array.from({ length: 8 }, (_, i) => lerVar(cs, `--lm-chart-sequential-${i + 1}`)),
    /** Ordinal — poucos degraus ordenados. */
    ordinal: Array.from({ length: 5 }, (_, i) => lerVar(cs, `--lm-chart-ordinal-${i + 1}`)),
    /** Divergente — polaridade, com cinza neutro no meio (nunca uma matiz). */
    diverging: {
      negative: lerVar(cs, '--lm-chart-diverging-negative'),
      neutral: lerVar(cs, '--lm-chart-diverging-neutral'),
      positive: lerVar(cs, '--lm-chart-diverging-positive'),
    },
    /** Status — reservado. Nunca reaproveitado como "série 4". */
    status: {
      good: lerVar(cs, '--lm-chart-status-good'),
      warning: lerVar(cs, '--lm-chart-status-warning'),
      serious: lerVar(cs, '--lm-chart-status-serious'),
      critical: lerVar(cs, '--lm-chart-status-critical'),
    },
    /** Plataformas: cor de entidade, não de série. Vêm dos papéis semânticos e não
     *  dos hexadecimais de marca de terceiros que estavam no código. */
    platform: {
      airbnb: lerVar(cs, '--lm-color-airbnb'),
      booking: lerVar(cs, '--lm-color-booking'),
      manual: lerVar(cs, '--lm-color-secondary'),
    },
    /** Anatomia. Grade e eixo são recessivos de propósito: quem carrega o dado é a
     *  marca, não a régua. */
    surface: lerVar(cs, '--lm-color-chart-surface'),
    ink: lerVar(cs, '--lm-color-chart-ink'),
    inkMuted: lerVar(cs, '--lm-color-chart-ink-muted'),
    grid: lerVar(cs, '--lm-color-chart-grid'),
    axis: lerVar(cs, '--lm-color-chart-axis'),
    tooltip: {
      background: lerVar(cs, '--lm-color-chart-tooltip-bg'),
      label: lerVar(cs, '--lm-color-chart-tooltip-label'),
    },
    font: {
      family: lerVar(cs, '--lm-font-sans'),
      size: lerVar(cs, '--lm-type-body-sm-size'),
      sizeLabel: lerVar(cs, '--lm-type-label-sm-size'),
    },
    radius: lerVar(cs, '--lm-radius-xs'),
  };
}

/** Relê os tokens quando o tema pintado muda — inclusive quando muda por preferência
 *  do sistema estando em modo 'system'. */
export function useChartTheme() {
  const { resolvedTheme } = useAppearance();
  const [tema, setTema] = useState(lerTemaDeGrafico);

  useEffect(() => {
    setTema(lerTemaDeGrafico());
  }, [resolvedTheme]);

  return tema;
}

/**
 * Cor estável por entidade.
 *
 * `chaves` é a lista COMPLETA de entidades possíveis, em ordem fixa e conhecida de
 * antemão — não a lista filtrada da tela. É isso que garante que esconder uma série
 * não repinte as outras.
 */
export function paletaPorEntidade(chaves, tema) {
  const mapa = {};
  chaves.forEach((chave, i) => {
    if (i < SLOTS) mapa[chave] = tema.series[i];
  });
  return mapa;
}

/** Acima de 8 séries não existe cor: o excedente vira "Outros". */
export function agruparExcedente(itens, limite = SLOTS, rotulo = 'Outros') {
  if (itens.length <= limite) return itens;
  const mantidos = itens.slice(0, limite - 1);
  const resto = itens.slice(limite - 1);
  return [
    ...mantidos,
    { name: rotulo, value: resto.reduce((soma, i) => soma + (i.value ?? 0), 0), agrupado: resto.length },
  ];
}

export { SLOTS };
