// ============================================================
// LUMINA Design System — Breakpoints
// ARQUIVO GERADO por scripts/design/generate_tokens.py
// Não edite à mão. Altere as sementes no gerador e rode-o novamente.
// ============================================================

/** Limite inferior de cada classe de janela, em px CSS. */
export const BREAKPOINTS = Object.freeze({
  compact: 0,
  medium: 600,
  expanded: 840,
  large: 1200,
  xlarge: 1600,
});

/** Media queries prontas. Só `min-width` — nunca `max-width`. */
export const MEDIA = Object.freeze({
  compact: 'all',
  medium: '(min-width: 600px)',
  expanded: '(min-width: 840px)',
  large: '(min-width: 1200px)',
  xlarge: '(min-width: 1600px)',
});

/** Classe de janela para uma largura em px CSS. */
export function windowClass(width) {
  if (width >= BREAKPOINTS.xlarge) return 'xlarge';
  if (width >= BREAKPOINTS.large) return 'large';
  if (width >= BREAKPOINTS.expanded) return 'expanded';
  if (width >= BREAKPOINTS.medium) return 'medium';
  return 'compact';
}
