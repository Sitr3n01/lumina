import { forwardRef, useCallback, useEffect, useId, useRef } from 'react';
import './Checkbox.css';

/**
 * Checkbox — zero ou mais opções de um conjunto, aplicadas ao salvar.
 * Efeito imediato sem salvar é Switch; escolha exclusiva é Radio.
 *
 * O input nativo continua sendo o controle: `appearance: none` pinta o desenho
 * sem esconder o elemento do leitor de tela, e o anel de foco de `base.css` cai
 * no lugar certo sem uma linha a mais.
 *
 * `Space` alterna — comportamento nativo, não reimplementar.
 */
const Checkbox = forwardRef(function Checkbox(
  {
    id,
    indeterminate = false,
    disabled = false,
    density,
    description,
    className,
    children,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;
  const innerRef = useRef(null);

  // `indeterminate` só existe como propriedade do DOM — não há atributo HTML nem
  // suporte no React. É ela que faz o leitor anunciar "parcialmente marcado"
  // (aria-checked="mixed"), por isso não se escreve aria-checked à mão: o valor
  // manual entraria em conflito com o estado nativo.
  // Sem lista de dependências de propósito: um clique do usuário zera
  // `indeterminate` direto no DOM, sem passar por prop, e o próximo render
  // precisa reafirmar o valor.
  useEffect(() => {
    if (innerRef.current) {
      innerRef.current.indeterminate = indeterminate;
    }
  });

  const attachRef = useCallback(
    (node) => {
      innerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref],
  );

  if (
    import.meta.env.DEV &&
    children === undefined &&
    !rest['aria-label'] &&
    !rest['aria-labelledby']
  ) {
    throw new Error('<Checkbox> sem rótulo visível exige aria-label ou aria-labelledby.');
  }

  return (
    // `span` e não `div`: este controle aparece dentro de <p>, <label> e células
    // de tabela, onde um <div> tornaria o HTML inválido.
    <span
      className={className ? `lm-checkbox ${className}` : 'lm-checkbox'}
      data-density={density}
      data-disabled={disabled || undefined}
    >
      {/* `...rest` vai no input, não na raiz: a raiz é só a grade de layout, e
          quem chama precisa alcançar `checked`, `onChange`, `name`, `value` e
          `aria-*` do controle real. */}
      <input
        ref={attachRef}
        id={inputId}
        type="checkbox"
        className="lm-checkbox__input"
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        {...rest}
      />
      {children === undefined ? null : (
        <label className="lm-checkbox__label" htmlFor={inputId}>
          {children}
        </label>
      )}
      {description ? (
        <span className="lm-checkbox__description" id={descriptionId}>
          {description}
        </span>
      ) : null}
    </span>
  );
});

export default Checkbox;
