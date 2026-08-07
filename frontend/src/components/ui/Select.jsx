// A moldura do campo (rótulo, ajuda, erro, ids) é a mesma do TextField — importar
// é o que garante que Select e TextField não divirjam com o tempo.
import { forwardRef } from 'react';
import { FieldFrame, assertFieldHasName, useFieldA11y } from './TextField';
import './TextField.css';
import './Select.css';

/**
 * Select — escolha de um valor entre poucos conhecidos.
 * Ver docs/design-system/05-componentes.md §4.
 *
 * É um `<select>` NATIVO envolvido, deliberadamente. Em Electron o popup nativo
 * obedece ao `color-scheme` que já vem dos tokens semânticos; um combobox
 * customizado renderizaria a lista em HTML e perderia isso, além de ter que
 * reimplementar teclado, rolagem e digitação por prefixo. Lista longa ou
 * digitável não é este componente — é Combobox.
 */

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5.5 8 4.5 4.5L14.5 8"
      />
    </svg>
  );
}

const Select = forwardRef(function Select(
  {
    value,
    onChange,
    label,
    help,
    error,
    placeholder,
    required = false,
    density,
    disabled = false,
    id: idProp,
    className,
    children,
    ...rest
  },
  ref,
) {
  const { id, helpId, errorId, describedBy } = useFieldA11y({ id: idProp, help, error });
  assertFieldHasName('Select', { label, rest });

  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      help={help}
      helpId={helpId}
      error={error}
      errorId={errorId}
      density={density}
      disabled={disabled}
      className={className ? `lm-select ${className}` : 'lm-select'}
    >
      <select
        ref={ref}
        id={id}
        className="lm-field__control lm-select__control"
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {/* `disabled` no espaço reservado: ele mostra o que escolher, mas não é
            uma escolha válida — deixá-lo selecionável deixaria "vazio" passar
            por resposta. */}
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {children}
      </select>

      <span className="lm-select__chevron" aria-hidden="true">
        <ChevronIcon />
      </span>
    </FieldFrame>
  );
});

export default Select;
