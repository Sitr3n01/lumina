import { forwardRef } from 'react';
import './Button.css';

/**
 * Botão — implementação de referência dos primitivos. Ver README.md deste diretório.
 *
 * `variant` é uma string, nunca booleanos acumulados: `primary large loading` deixa
 * combinações inválidas representáveis, e alguém acaba usando.
 *
 * Não existe prop `size`. Tamanho é densidade, e densidade é uma coisa só no sistema
 * inteiro — foi a falta dessa regra que produziu quatro `.btn-sm` diferentes no código
 * anterior. Um botão menor é `<Button density="compact">`.
 */
const VARIANTS = ['filled', 'tonal', 'outlined', 'text', 'elevated', 'destructive'];

const Button = forwardRef(function Button(
  {
    variant = 'filled',
    density,
    icon,
    trailingIcon,
    loading = false,
    fullWidth = false,
    disabled = false,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  if (import.meta.env.DEV && !VARIANTS.includes(variant)) {
    throw new Error(`<Button variant="${variant}"> não existe. Use uma de: ${VARIANTS.join(', ')}.`);
  }

  // Não é `children &&`: um rótulo "0" é falso e sumiria.
  const temRotulo = children !== undefined && children !== null;

  return (
    <button
      ref={ref}
      // `button` e não `submit`: o padrão do HTML envia o formulário, e um botão
      // auxiliar dentro de <form> passa a submetê-lo sem que ninguém tenha pedido.
      type={type}
      className={className ? `lm-button ${className}` : 'lm-button'}
      data-variant={variant}
      data-density={density}
      data-loading={loading || undefined}
      data-full-width={fullWidth || undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {/* Enquanto carrega o conteúdo continua ocupando espaço, apenas invisível:
          o botão não muda de largura e nada ao redor pula. */}
      {icon ? (
        <span className="lm-button__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {temRotulo ? <span className="lm-button__label">{children}</span> : null}
      {trailingIcon ? (
        <span className="lm-button__icon lm-button__icon--trailing" aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
      {loading ? <span className="lm-button__spinner" aria-hidden="true" /> : null}
    </button>
  );
});

export default Button;
