import { forwardRef, useEffect, useRef } from 'react';
import DESTINOS from './destinations';
import './NavigationRail.css';

/**
 * Navegação primária, em três formas conforme a largura da janela:
 *
 *   expanded (>= 1200px)  rail de 256px, ícone e rótulo lado a lado
 *   rail     (600-1199)   rail de 88px, rótulo sob o ícone
 *   drawer   (< 600px)    gaveta modal, aberta pelo botão da app bar
 *
 * O rótulo aparece SEMPRE, nas três formas. Um rail só de ícones obriga o usuário
 * a decorar sete pictogramas ou a passar o mouse em cada um — e no teclado nem a
 * segunda opção existe.
 *
 * `aria-current="page"` e não só uma classe: é o que o leitor de tela anuncia como
 * "página atual". A pílula colorida é a versão visual da mesma informação.
 */

function ItemDeNavegacao({ destino, atual, onSelect, forma }) {
  const Icone = destino.icon;
  const selecionado = destino.id === atual;

  return (
    <li className="lm-nav__item">
      <button
        type="button"
        className="lm-nav__link"
        data-forma={forma}
        aria-current={selecionado ? 'page' : undefined}
        onClick={() => onSelect(destino.id)}
      >
        <span className="lm-nav__indicator">
          <Icone className="lm-nav__icon" aria-hidden="true" focusable="false" />
        </span>
        <span className="lm-nav__label">{destino.label}</span>
      </button>
    </li>
  );
}

const NavigationRail = forwardRef(function NavigationRail(
  { forma, currentPage, onPageChange, open = false, onClose },
  ref,
) {
  const dialogRef = useRef(null);

  // A gaveta usa <dialog> pelo mesmo motivo do Dialog: foco confinado, Escape e
  // resto da árvore inerte sem uma linha de JavaScript nossa.
  useEffect(() => {
    if (forma !== 'drawer') return undefined;
    const node = dialogRef.current;
    if (!node) return undefined;
    const opener = document.activeElement;

    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();

    return () => {
      if (open && opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [forma, open]);

  const lista = (
    <ul className="lm-nav__list" role="list">
      {DESTINOS.map((d) => (
        <ItemDeNavegacao
          key={d.id}
          destino={d}
          atual={currentPage}
          forma={forma}
          onSelect={(id) => {
            onPageChange(id);
            onClose?.();
          }}
        />
      ))}
    </ul>
  );

  if (forma === 'drawer') {
    return (
      <dialog
        ref={dialogRef}
        className="lm-nav lm-nav--drawer"
        aria-label="Navegação principal"
        onCancel={(e) => {
          e.preventDefault();
          onClose?.();
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) onClose?.();
        }}
      >
        <div className="lm-nav__marca">LUMINA</div>
        {lista}
      </dialog>
    );
  }

  return (
    <nav ref={ref} className="lm-nav" data-forma={forma} aria-label="Navegação principal">
      <div className="lm-nav__marca">{forma === 'expanded' ? 'LUMINA' : 'LM'}</div>
      {lista}
    </nav>
  );
});

export default NavigationRail;
