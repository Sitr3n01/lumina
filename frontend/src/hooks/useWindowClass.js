import { useSyncExternalStore } from 'react';
import { BREAKPOINTS, windowClass } from '../styles/tokens/breakpoints';

/**
 * Classe de janela atual: compact | medium | expanded | large | xlarge.
 *
 * Lê os limites de `styles/tokens/breakpoints.js`, que é GERADO pelo mesmo script
 * que emite os tokens de CSS. Uma media query no CSS e um `matchMedia` no JS que
 * discordam produzem o pior tipo de defeito: o layout troca num ponto e a lógica
 * noutro, e nada erra alto o suficiente para aparecer.
 *
 * `useSyncExternalStore` em vez de useEffect + useState: sem quadro intermediário
 * com o valor errado durante a hidratação.
 */

const CONSULTAS = Object.entries(BREAKPOINTS)
  .filter(([, min]) => min > 0)
  .map(([, min]) => window.matchMedia(`(min-width: ${min}px)`));

function assinar(callback) {
  CONSULTAS.forEach((mq) => mq.addEventListener('change', callback));
  return () => CONSULTAS.forEach((mq) => mq.removeEventListener('change', callback));
}

function ler() {
  return windowClass(window.innerWidth);
}

export default function useWindowClass() {
  return useSyncExternalStore(assinar, ler, ler);
}

/**
 * Forma da navegação para a classe de janela.
 *
 * `bottom` NÃO é usado, apesar de a decisão inicial tê-lo previsto: uma barra
 * inferior comporta no máximo 5 destinos, e o LUMINA tem 7. Espremer sete ícones
 * numa faixa de 360px produz alvos abaixo do mínimo e rótulos truncados. Acima de
 * cinco destinos a resposta é drawer modal.
 */
export function formaDaNavegacao(classe) {
  if (classe === 'compact') return 'drawer';
  if (classe === 'large' || classe === 'xlarge') return 'expanded';
  return 'rail';
}
