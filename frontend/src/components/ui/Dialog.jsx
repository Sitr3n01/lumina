import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';
import './Dialog.css';

/**
 * Diálogo modal sobre o elemento `<dialog>` nativo com `showModal()`.
 *
 * O nativo entrega sem código: `Tab` confinado, `Escape`, resto da árvore inerte,
 * camada superior acima de qualquer z-index e `::backdrop` para o véu. Os quatro
 * modais que este componente substitui não tinham nenhum dos quatro.
 *
 * O que o `<dialog>` NÃO resolve (03-acessibilidade.md §4.4) mora aqui: devolução
 * do foco ao gatilho, trava de rolagem do fundo, foco inicial fora do botão
 * destrutivo e fechamento roteado pelo estado de quem chama.
 */
const Dialog = forwardRef(function Dialog(
  {
    open = false,
    title,
    description,
    actions,
    onClose,
    dismissible = false,
    closable = true,
    closeLabel = 'Fechar',
    initialFocus,
    density,
    className,
    children,
    ...rest
  },
  ref,
) {
  const dialogRef = useRef(null);
  const backdropPressRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useImperativeHandle(ref, () => dialogRef.current, []);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node || !open) return undefined;

    // Guardado ANTES de abrir: a partir do `showModal()` o activeElement já é
    // o próprio diálogo, e o gatilho estaria perdido.
    const opener = document.activeElement;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;

    if (!node.open) node.showModal();
    root.style.overflow = 'hidden';

    // O nativo focaria o primeiro focável — que aqui seria o "X" do cabeçalho.
    // A regra do sistema é outra: alvo declarado, senão o primeiro campo
    // editável, senão o contêiner. Nunca o botão destrutivo.
    const fallback = node.querySelector(
      '.lm-dialog__body :is(input, select, textarea):not([disabled])',
    );
    (initialFocus?.current ?? fallback ?? node).focus();

    return () => {
      // Devolve o valor inline exato de antes — string vazia quando não havia
      // nenhum, para não deixar para trás um `overflow` que ninguém escreveu.
      root.style.overflow = previousOverflow;
      if (node.open) node.close();
      // O gatilho pode ter sumido junto com a linha que o diálogo excluiu.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open, initialFocus]);

  const handleCancel = (event) => {
    // `Escape` fecharia o elemento sozinho, mas quem manda no `open` é o
    // chamador: sem o preventDefault a árvore React continuaria "aberta" com a
    // tela já vazia. Com `onClose` ausente (salvando, formulário sujo) o
    // diálogo simplesmente não fecha.
    event.preventDefault();
    onClose?.();
  };

  const handleNativeClose = () => {
    // Rede de segurança para um `<form method="dialog">` no corpo, que fecha o
    // elemento por fora do nosso caminho.
    if (open) onClose?.();
  };

  const handlePointerDown = (event) => {
    backdropPressRef.current = event.target === dialogRef.current;
  };

  const handleClick = (event) => {
    if (!dismissible) return;
    // Arrastar uma seleção de dentro para fora termina com o clique no próprio
    // `<dialog>`; sem checar onde o gesto começou, soltar o botão sobre o véu
    // fecharia o diálogo e perderia o que estava preenchido.
    if (!backdropPressRef.current || event.target !== dialogRef.current) return;
    onClose?.();
  };

  if (import.meta.env.DEV && !title) {
    throw new Error('<Dialog> exige `title`: é ele que dá nome acessível ao diálogo.');
  }

  return (
    <dialog
      ref={dialogRef}
      className={className ? `lm-dialog ${className}` : 'lm-dialog'}
      data-density={density}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      tabIndex={-1}
      onCancel={handleCancel}
      onClose={handleNativeClose}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      {...rest}
    >
      <div className="lm-dialog__header">
        <h2 className="lm-dialog__title" id={titleId}>
          {title}
        </h2>
        {closable ? (
          <button
            type="button"
            className="lm-dialog__close"
            aria-label={closeLabel}
            onClick={() => onClose?.()}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="lm-dialog__body">
        {description ? (
          <p className="lm-dialog__description" id={descriptionId}>
            {description}
          </p>
        ) : null}
        {children}
      </div>

      {actions ? <div className="lm-dialog__footer">{actions}</div> : null}
    </dialog>
  );
});

export default Dialog;
