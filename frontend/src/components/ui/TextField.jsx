import { forwardRef, useId } from 'react';
import './TextField.css';

/**
 * Campos de texto — TextField (uma linha) e Textarea (múltiplas).
 * Ver README.md deste diretório e docs/design-system/05-componentes.md §3.
 *
 * Rótulo é PERSISTENTE, sempre acima do campo. Placeholder nunca faz esse papel:
 * some ao digitar e não é lido de forma confiável por leitor de tela.
 *
 * Não existe prop `size`. Tamanho é `density`, como no resto do sistema.
 */

/** `!= null` cobriria os dois casos, mas o gate de qualidade exige `===` estrito. */
const isPresent = (value) => value !== undefined && value !== null;

/** Ícone de alerta do texto de erro. Erro nunca só por cor — WCAG 1.4.1. */
function AlertIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.75 4h1.5v5.5h-1.5V6Zm0 7.25h1.5v1.5h-1.5v-1.5Z"
      />
    </svg>
  );
}

/**
 * Identidade e ligações ARIA do campo. Vive num hook porque TextField, Textarea e
 * Select precisam exatamente do mesmo cálculo, e um `id` divergente entre `label[for]`
 * e o controle quebra o campo em silêncio — nada avisa, ele só deixa de ter nome.
 */
export function useFieldA11y({ id: idProp, help, error }) {
  const generated = useId();
  const id = idProp ?? `lm-field-${generated}`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return {
    id,
    helpId,
    errorId,
    // Ajuda E erro juntos quando ambos existem: `aria-describedby` aceita uma
    // lista, e substituir um pelo outro esconderia a instrução justamente na
    // hora em que ela é mais necessária.
    describedBy: [helpId, errorId].filter(Boolean).join(' ') || undefined,
  };
}

/**
 * Moldura comum: rótulo persistente, caixa do controle, ajuda e erro.
 * Exportada porque Select monta a mesma anatomia — é o que impede que "campo"
 * volte a significar cinco marcações diferentes.
 */
export function FieldFrame({
  id,
  label,
  required = false,
  help,
  helpId,
  error,
  errorId,
  density,
  disabled = false,
  className,
  children,
}) {
  return (
    <div
      className={className ? `lm-field ${className}` : 'lm-field'}
      data-density={density}
      data-invalid={error ? 'true' : undefined}
      data-disabled={disabled || undefined}
    >
      {isPresent(label) ? (
        <label className="lm-field__label" htmlFor={id}>
          {label}
          {/* A palavra, não um asterisco: asterisco sozinho depende de convenção
              aprendida e de cor, e nenhuma das duas é garantida. */}
          {required ? <span className="lm-field__required">obrigatório</span> : null}
        </label>
      ) : null}

      <div className="lm-field__box">{children}</div>

      {help ? (
        <p className="lm-field__help" id={helpId}>
          {help}
        </p>
      ) : null}

      {/* Sem região viva: o erro de campo já é anunciado ao focar o controle, e
          `role="alert"` aqui produziria anúncio duplicado — 05 §3. */}
      {error ? (
        <p className="lm-field__error" id={errorId}>
          <AlertIcon />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Um campo sem nome acessível não é anunciado por leitor de tela — e a falha é
 * silenciosa na tela. Falhar em desenvolvimento é o único jeito de ela aparecer.
 */
export function assertFieldHasName(component, { label, rest }) {
  if (
    import.meta.env.DEV &&
    !isPresent(label) &&
    !rest['aria-label'] &&
    !rest['aria-labelledby']
  ) {
    throw new Error(
      `<${component}> sem \`label\` visível precisa de \`aria-label\` ou \`aria-labelledby\`.`,
    );
  }
}

const TextField = forwardRef(function TextField(
  {
    type = 'text',
    value,
    onChange,
    label,
    help,
    error,
    required = false,
    leadingIcon,
    trailingIcon,
    // Elemento INTERATIVO no fim do campo — revelar senha, limpar valor.
    // Separado de `trailingIcon` porque aquele é decorativo e sai marcado com
    // `aria-hidden`, o que tornaria o botão invisível ao leitor de tela.
    trailingAction,
    density,
    disabled = false,
    id: idProp,
    className,
    ...rest
  },
  ref,
) {
  const { id, helpId, errorId, describedBy } = useFieldA11y({ id: idProp, help, error });
  assertFieldHasName('TextField', { label, rest });

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
      className={className}
    >
      {leadingIcon ? (
        <span className="lm-field__icon lm-field__icon--leading" aria-hidden="true">
          {leadingIcon}
        </span>
      ) : null}

      <input
        // A ref vai para o controle, não para a moldura: quem mede ou foca um
        // campo quer o `input` — validação de formulário leva o foco ao primeiro
        // campo com erro, e focar a `div` não faria nada.
        ref={ref}
        id={id}
        className="lm-field__control"
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        // Só `aria-required`, nunca o `required` nativo: o nativo dispara a
        // validação do navegador na submissão, com balão próprio e fora do
        // idioma da aplicação. A validação aqui é da aplicação — 05 §3.
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        // `rest` por último e no controle (não na moldura): é onde `placeholder`,
        // `onBlur`, `maxLength` e `aria-*` fazem sentido, e ficar por último é o
        // que permite sobrescrever qualquer padrão acima.
        {...rest}
      />

      {trailingIcon ? (
        <span className="lm-field__icon lm-field__icon--trailing" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}

      {trailingAction ? (
        <span className="lm-field__acao">{trailingAction}</span>
      ) : null}
    </FieldFrame>
  );
});

export const Textarea = forwardRef(function Textarea(
  {
    value,
    onChange,
    label,
    help,
    error,
    required = false,
    density,
    disabled = false,
    id: idProp,
    className,
    ...rest
  },
  ref,
) {
  const { id, helpId, errorId, describedBy } = useFieldA11y({ id: idProp, help, error });
  assertFieldHasName('Textarea', { label, rest });

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
      className={className}
    >
      <textarea
        ref={ref}
        id={id}
        className="lm-field__control"
        // Altura acompanha o conteúdo: `field-sizing: content` e `resize: vertical`
        // já vêm do reset, então não há altura fixa a declarar aqui.
        data-multiline=""
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      />
    </FieldFrame>
  );
});

export default TextField;
