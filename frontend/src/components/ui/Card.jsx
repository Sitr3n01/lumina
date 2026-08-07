import { forwardRef } from 'react';
import './Card.css';

/**
 * Card — agrupa informações de uma MESMA entidade. Ver README.md deste diretório e
 * `docs/design-system/05-componentes.md` §8.
 *
 * Card clicável não é `<div onClick>`. Quando `href` ou `onClick` chegam, o componente
 * monta um `<button>`/`<a>` interno cujo `::after` cobre a área do card: o alvo passa a
 * ser um controle real, alcançável por Tab, anunciado com papel e nome. O código anterior
 * tinha 12 cards clicáveis inalcançáveis por teclado — todos eram `div` com `onClick`.
 *
 * Consequência da mesma escolha: um card clicável tem UMA área clicável. Ação secundária
 * dentro dele é clique aninhado e está proibida (§8, "Regras"); ela sai do card ou o card
 * deixa de ser clicável.
 */
const VARIANTS = ['filled', 'elevated', 'outlined'];

const Card = forwardRef(function Card(
  {
    variant = 'filled',
    // `div` e não `section`: uma `<section>` sem nome acessível não vira landmark e só
    // adiciona ruído na árvore. Quem tem cabeçalho próprio passa `as="section"`.
    as: Root = 'div',
    density,
    interactive = false,
    selected,
    href,
    onClick,
    actionLabel,
    actionProps,
    className,
    children,
    ...rest
  },
  ref,
) {
  const clickable = Boolean(href) || Boolean(onClick);

  if (import.meta.env.DEV) {
    if (!VARIANTS.includes(variant)) {
      throw new Error(`<Card variant="${variant}"> não existe. Use uma de: ${VARIANTS.join(', ')}.`);
    }
    if (clickable && !actionLabel) {
      throw new Error(
        '<Card> clicável precisa de `actionLabel`: o controle que cobre o card não tem ' +
          'texto próprio e ficaria sem nome acessível.',
      );
    }
  }

  const Action = href ? 'a' : 'button';

  return (
    <Root
      ref={ref}
      className={className ? `lm-card ${className}` : 'lm-card'}
      data-variant={variant}
      data-density={density}
      data-interactive={interactive || clickable || undefined}
      data-selected={selected || undefined}
      {...rest}
    >
      {clickable ? (
        <Action
          className="lm-card__action"
          href={href}
          type={href ? undefined : 'button'}
          onClick={onClick}
          aria-label={actionLabel}
          // Escolha persistente vai em ARIA real, nunca só na classe. Só faz sentido no
          // botão: um link navega, não alterna.
          aria-pressed={!href && selected !== undefined ? selected : undefined}
          {...actionProps}
        />
      ) : null}
      {children}
    </Root>
  );
});

export default Card;
