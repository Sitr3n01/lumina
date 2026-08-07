import { forwardRef } from 'react';
import './Chip.css';

/**
 * Chip — filtro, entidade ou sugestão. Ver README.md deste diretório e
 * 05-componentes.md §14.
 *
 * Duas formas de árvore, e a diferença não é cosmética:
 *
 * - sem `onRemove` a raiz É o botão;
 * - com `onRemove` a raiz é um contêiner com DOIS botões irmãos.
 *
 * Botão dentro de botão é HTML inválido, e o alvo de "remover" precisa ser
 * distinto do alvo do chip — quem quer filtrar não pode apagar por um pixel de
 * diferença. Por isso a segunda forma existe.
 */
const VARIANTS = ['assist', 'filter', 'input', 'suggestion'];

function CheckIcon() {
  return (
    <svg
      className="lm-chip__check"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 10.5 8 14.5 16 6" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5.5 5.5 14.5 14.5M14.5 5.5 5.5 14.5" />
    </svg>
  );
}

const Chip = forwardRef(function Chip(
  {
    variant = 'assist',
    density,
    icon,
    selected,
    disabled = false,
    label,
    onRemove,
    onClick,
    className,
    children,
    ...rest
  },
  ref,
) {
  const text = label ?? (typeof children === 'string' ? children : undefined);

  if (import.meta.env.DEV) {
    if (!VARIANTS.includes(variant)) {
      throw new Error(`<Chip variant="${variant}"> não existe. Use uma de: ${VARIANTS.join(', ')}.`);
    }
    if (onRemove && !text) {
      throw new Error(
        '<Chip onRemove> exige `label` (ou children de texto): o botão de remover precisa ' +
          'nomear o que remove — "Remover" sozinho não diz nada numa lista de dez chips.',
      );
    }
  }

  // Só `filter` alterna. Anunciar aria-pressed num chip de sugestão prometeria
  // um estado persistente que o componente não tem.
  const pressed = variant === 'filter' ? Boolean(selected) : undefined;
  const showCheck = variant === 'filter' && Boolean(selected);

  const content = (
    <>
      {/* O check substitui o ícone da variante em vez de somar-se a ele: dois
          desenhos à esquerda num alvo de 32px viram borrão. */}
      {showCheck ? <CheckIcon /> : null}
      {icon && !showCheck ? (
        <span className="lm-chip__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {/* `children ?? text` e não só `children`: o rótulo pode vir pela prop
          `label`, que é a forma usada quando o mesmo texto precisa também
          nomear o botão de remover. */}
      <span className="lm-chip__label">{children ?? text}</span>
    </>
  );

  const rootClassName = className ? `lm-chip ${className}` : 'lm-chip';

  function handleKeyDown(event) {
    if (disabled) return;
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    event.preventDefault();

    // O foco muda ANTES da remoção. Se o nó sair da árvore primeiro, o foco cai
    // no <body> e quem navega por teclado perde o lugar na lista — o vizinho
    // ainda está no DOM neste instante porque o React só recompõe depois do
    // handler.
    const chip = event.currentTarget;
    const neighbour = chip.nextElementSibling ?? chip.previousElementSibling;
    const next = neighbour?.querySelector('button') ?? neighbour;
    if (next instanceof HTMLElement) next.focus();

    onRemove(event);
  }

  if (!onRemove) {
    return (
      <button
        ref={ref}
        type="button"
        className={rootClassName}
        data-variant={variant}
        data-density={density}
        data-selected={selected || undefined}
        disabled={disabled}
        aria-pressed={pressed}
        onClick={onClick}
        {...rest}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      ref={ref}
      className={rootClassName}
      data-variant={variant}
      data-density={density}
      data-removable=""
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <button
        type="button"
        className="lm-chip__action"
        disabled={disabled}
        aria-pressed={pressed}
        onClick={onClick}
      >
        {content}
      </button>
      <button
        type="button"
        className="lm-chip__remove"
        disabled={disabled}
        aria-label={`Remover ${text}`}
        onClick={onRemove}
      >
        <RemoveIcon />
      </button>
    </span>
  );
});

export default Chip;
