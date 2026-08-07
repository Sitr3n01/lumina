import { forwardRef, useId } from 'react';
import './Switch.css';

/**
 * Switch — liga e desliga com efeito IMEDIATO. Se a mudança só vale depois de um
 * botão "Salvar", o controle certo é Checkbox: o switch promete que já aconteceu.
 *
 * Continua sendo `<input type="checkbox">`. Um `role="switch"` sobre `<div>`
 * exigiria reimplementar Space, `aria-checked` e o estado desabilitado — e foi
 * exatamente esse caminho que produziu os 12 controles inalcançáveis por teclado
 * no código anterior.
 */
const Switch = forwardRef(function Switch(
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
    throw new Error('<Switch> sem rótulo visível exige aria-label ou aria-labelledby.');
  }

  return (
    <span
      className={className ? `lm-switch ${className}` : 'lm-switch'}
      data-density={density}
      data-disabled={disabled || undefined}
    >
      {children === undefined ? null : (
        <label className="lm-switch__label" htmlFor={inputId}>
          {children}
        </label>
      )}
      {description ? (
        <span className="lm-switch__description" id={descriptionId}>
          {description}
        </span>
      ) : null}
      {/* `role="switch"` sobre o checkbox nativo troca o anúncio de
          "caixa de seleção, marcado" para "interruptor, ligado" — que é o que o
          controle de fato faz — sem perder nenhum comportamento nativo. */}
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        role="switch"
        className="lm-switch__input"
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        {...rest}
      />
    </span>
  );
});

export default Switch;
