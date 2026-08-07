import { forwardRef } from 'react';
import './Badge.css';

/**
 * Badge — contagem ou presença de novidade, ancorada a outro elemento.
 * Ver README.md deste diretório e 05-componentes.md §15.
 *
 * O badge NUNCA é alvo de toque: quem recebe o clique é o elemento ancorado.
 * O posicionamento também é do ancorador — o badge só se desenha.
 */
const VARIANTS = ['dot', 'numeric'];

/* Acima disto a contagem satura. Um badge de 16px de altura não comporta quatro
   dígitos, e "127 não lidas" já não muda nenhuma decisão de quem lê. */
const MAX_COUNT = 99;

const Badge = forwardRef(function Badge(
  { variant = 'numeric', count = 0, label, className, ...rest },
  ref,
) {
  if (import.meta.env.DEV && !VARIANTS.includes(variant)) {
    throw new Error(`<Badge variant="${variant}"> não existe. Use uma de: ${VARIANTS.join(', ')}.`);
  }

  return (
    <span
      ref={ref}
      className={className ? `lm-badge ${className}` : 'lm-badge'}
      data-variant={variant}
      // Sem `label` o badge é assumido decorativo, porque a contagem então tem
      // de estar no nome acessível do ancorador ("Notificações, 3 não lidas").
      // Anunciá-la nos dois lugares faz o leitor de tela repetir o número.
      aria-hidden={label ? undefined : 'true'}
      {...rest}
    >
      {variant === 'numeric' ? (
        // O dígito visível é escondido do leitor: quem narra é o texto de
        // `label`, que diz DE QUE a contagem é. "3" sozinho não informa nada.
        <span className="lm-badge__value" aria-hidden="true">
          {count > MAX_COUNT ? `${MAX_COUNT}+` : count}
        </span>
      ) : null}
      {label ? <span className="lm-badge__sr">{label}</span> : null}
    </span>
  );
});

export default Badge;
