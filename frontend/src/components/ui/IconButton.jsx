import { forwardRef } from 'react';
import './IconButton.css';

/**
 * Botão de ícone — ação cujo desenho é autoexplicativo e onde não cabe rótulo.
 * Ver README.md deste diretório e 05-componentes.md §2.
 *
 * O ícone entra como `children` e é sempre decorativo: quem carrega o nome é o
 * `aria-label`, que descreve a AÇÃO ("Sincronizar agora") e não o desenho
 * ("seta circular").
 */
const VARIANTS = ['standard', 'filled', 'tonal', 'outlined'];

const IconButton = forwardRef(function IconButton(
  {
    variant = 'standard',
    density,
    selected,
    disabled = false,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  if (import.meta.env.DEV) {
    if (!VARIANTS.includes(variant)) {
      throw new Error(
        `<IconButton variant="${variant}"> não existe. Use uma de: ${VARIANTS.join(', ')}.`,
      );
    }
    // Lança, não avisa: sem texto visível e sem nome acessível o controle é
    // literalmente anônimo para o leitor de tela, e um console.warn some no
    // ruído do dev server. `aria-labelledby` vale porque também produz nome;
    // `title` não vale — é tooltip, não nome confiável.
    if (!rest['aria-label'] && !rest['aria-labelledby']) {
      throw new Error(
        '<IconButton> exige aria-label (ou aria-labelledby) descrevendo a ação — ' +
          'é um controle sem texto visível.',
      );
    }
  }

  return (
    <button
      ref={ref}
      type={type}
      className={className ? `lm-icon-button ${className}` : 'lm-icon-button'}
      data-variant={variant}
      data-density={density}
      data-selected={selected || undefined}
      disabled={disabled}
      // `selected` indefinido significa "não é alternância": aí o botão não
      // pode anunciar aria-pressed="false", que prometeria um estado que não existe.
      aria-pressed={selected}
      {...rest}
    >
      <span className="lm-icon-button__icon" aria-hidden="true">
        {children}
      </span>
    </button>
  );
});

export default IconButton;
