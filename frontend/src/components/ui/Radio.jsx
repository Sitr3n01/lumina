import { forwardRef, useId } from 'react';
import './Radio.css';

/**
 * Radio — escolha exclusiva dentro de um conjunto pequeno e sempre visível.
 * Acima de cinco opções, ou quando as opções não cabem na tela, use Select.
 *
 * A navegação por setas dentro do grupo, o wrap da última para a primeira e o
 * fato de o grupo inteiro ocupar UMA parada de Tab são comportamento NATIVO do
 * `name` compartilhado. Não reimplemente: qualquer handler de teclado aqui
 * duplicaria o nativo e criaria salto duplo.
 */
const Radio = forwardRef(function Radio(
  { id, disabled = false, density, description, className, children, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;

  if (
    import.meta.env.DEV &&
    children === undefined &&
    !rest['aria-label'] &&
    !rest['aria-labelledby']
  ) {
    throw new Error('<Radio> sem rótulo visível exige aria-label ou aria-labelledby.');
  }

  return (
    <span
      className={className ? `lm-radio ${className}` : 'lm-radio'}
      data-density={density}
      data-disabled={disabled || undefined}
    >
      <input
        ref={ref}
        id={inputId}
        type="radio"
        className="lm-radio__input"
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        {...rest}
      />
      {children === undefined ? null : (
        <label className="lm-radio__label" htmlFor={inputId}>
          {children}
        </label>
      )}
      {description ? (
        <span className="lm-radio__description" id={descriptionId}>
          {description}
        </span>
      ) : null}
    </span>
  );
});

/**
 * Agrupa radios sob uma pergunta.
 *
 * `<fieldset>`/`<legend>` e não uma `<div>` com texto: é a legenda que o leitor de
 * tela repete antes de cada opção. Sem ela o usuário ouve "Airbnb, botão de opção,
 * 1 de 3" sem nunca saber a que pergunta isso responde.
 */
export function RadioGroup({
  legend,
  description,
  error,
  orientation = 'vertical',
  className,
  children,
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description ? descriptionId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <fieldset
      className={className ? `lm-radio-group ${className}` : 'lm-radio-group'}
      data-orientation={orientation}
      aria-describedby={describedBy || undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend className="lm-radio-group__legend">{legend}</legend>
      {description ? (
        <p className="lm-radio-group__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <div className="lm-radio-group__options">{children}</div>
      {error ? (
        <p className="lm-radio-group__error" id={errorId}>
          {/* Erro nunca só por cor: o ícone e o texto carregam a mensagem, a cor
              apenas reforça. */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5M12 16.2v.3" />
          </svg>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export default Radio;
