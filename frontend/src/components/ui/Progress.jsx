import { forwardRef } from 'react';
import './Progress.css';

/**
 * Progress — progresso de uma operação. Ver `docs/design-system/05-componentes.md` Parte 4.
 *
 * `value` presente = determinado: `aria-valuenow` acompanha o desenho. `value` ausente =
 * indeterminado, e aí `aria-valuenow` fica FORA do DOM — um `progressbar` sem valor é o
 * que faz o leitor de tela anunciar "ocupado" em vez de inventar uma porcentagem.
 *
 * Sem prop `density`: nem a altura da pista nem o diâmetro do círculo mudam com a escala
 * de controles — são tokens próprios, `--lm-progress-*`.
 */
const VARIANTS = ['linear', 'circular'];

const Progress = forwardRef(function Progress(
  { variant = 'linear', value, className, style, ...rest },
  ref,
) {
  const determinate = typeof value === 'number' && Number.isFinite(value);
  const percent = determinate ? Math.min(100, Math.max(0, value)) : undefined;

  if (import.meta.env.DEV) {
    if (!VARIANTS.includes(variant)) {
      throw new Error(`<Progress variant="${variant}"> não existe. Use uma de: ${VARIANTS.join(', ')}.`);
    }
    if (!rest['aria-label'] && !rest['aria-labelledby']) {
      throw new Error(
        '<Progress> precisa de `aria-label` ou `aria-labelledby`: "56%" sozinho não diz ' +
          'do que é o progresso.',
      );
    }
  }

  return (
    <div
      ref={ref}
      className={className ? `lm-progress ${className}` : 'lm-progress'}
      data-variant={variant}
      data-indeterminate={determinate ? undefined : 'true'}
      role="progressbar"
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
      aria-valuenow={percent}
      style={determinate ? { ...style, '--_value': percent } : style}
      {...rest}
    >
      {variant === 'linear' ? (
        <span className="lm-progress__track">
          <span className="lm-progress__indicator" />
        </span>
      ) : (
        <span className="lm-progress__circle" />
      )}
    </div>
  );
});

export default Progress;
