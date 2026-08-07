import { forwardRef } from 'react';
import './Skeleton.css';

/**
 * Skeleton — a geometria do que está chegando. Ver
 * `docs/design-system/05-componentes.md` Parte 4.
 *
 * `aria-hidden` sempre: o desenho não anuncia nada. Quem anuncia o carregamento é a região
 * que contém o skeleton, com `aria-busy="true"` e, quando o dado demora, uma mensagem em
 * região `polite`. Skeleton audível vira uma rajada de nada para o leitor de tela.
 *
 * Sem prop de tamanho: a escala é `density`. Um círculo em `compact` é menor porque
 * `--lm-density-control` é menor, não porque alguém passou `size="sm"`.
 */
const VARIANTS = ['text', 'circle', 'rect'];

const Skeleton = forwardRef(function Skeleton(
  { variant = 'text', lines = 1, density, className, ...rest },
  ref,
) {
  if (import.meta.env.DEV) {
    if (!VARIANTS.includes(variant)) {
      throw new Error(`<Skeleton variant="${variant}"> não existe. Use uma de: ${VARIANTS.join(', ')}.`);
    }
    if (lines > 1 && variant !== 'text') {
      throw new Error('<Skeleton lines> só existe em `variant="text"`: bloco e círculo não têm linhas.');
    }
  }

  if (lines > 1) {
    return (
      <div
        ref={ref}
        className={className ? `lm-skeleton-group ${className}` : 'lm-skeleton-group'}
        data-density={density}
        aria-hidden="true"
        {...rest}
      >
        {Array.from({ length: lines }, (_unused, index) => (
          <span key={index} className="lm-skeleton" data-variant="text" />
        ))}
      </div>
    );
  }

  return (
    <span
      ref={ref}
      className={className ? `lm-skeleton ${className}` : 'lm-skeleton'}
      data-variant={variant}
      data-density={density}
      aria-hidden="true"
      {...rest}
    />
  );
});

export default Skeleton;
