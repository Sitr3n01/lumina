import { cloneElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import './Menu.css';

const SELETOR_ITEM = '[role="menuitem"]:not([disabled]), [role="menuitemradio"]:not([disabled])';

/** Marca de selecionado. Desenhada, e não o caractere "✓": um glifo dentro do
 *  rótulo é lido junto com ele ("Tema claro marca de verificação") e some em
 *  fontes sem o caractere. Quem anuncia o estado é `aria-checked`. */
function Marca() {
  return (
    <svg
      className="lm-menu__marca"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

/**
 * Menu — lista curta de AÇÕES disparada por um gatilho. Não é seleção de valor
 * (isso é Select) nem navegação (isso é o rail).
 *
 * Teclado conforme 03-acessibilidade.md §4.2: setas movem com volta ao início,
 * Home/End vão às pontas, Escape fecha e DEVOLVE o foco ao gatilho, Tab fecha e
 * segue o fluxo normal da página.
 *
 * Sem portal de propósito. `position: absolute` num wrapper relativo mantém o
 * menu adjacente ao gatilho na árvore, então o foco não precisa ser teletransportado
 * e nada quebra quando o menu abre dentro de um `<dialog>` — um portal para
 * `document.body` ficaria ATRÁS da top layer e sumiria.
 */
export default function Menu({
  trigger,
  items,
  align = 'end',
  className,
  ariaLabel,
}) {
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef(null);
  const listaRef = useRef(null);
  const gatilhoRef = useRef(null);
  const menuId = useId();

  const fechar = useCallback(
    ({ devolverFoco = true } = {}) => {
      setAberto(false);
      if (devolverFoco) gatilhoRef.current?.focus();
    },
    [],
  );

  // Foco no primeiro item ao abrir: um menu aberto sem foco dentro dele obriga o
  // usuário de teclado a adivinhar quantos Tabs faltam.
  useEffect(() => {
    if (!aberto) return;
    // Num menu de escolha, abrir com o foco no item JÁ selecionado poupa o
    // usuário de percorrer a lista para descobrir onde está.
    const lista = listaRef.current;
    const alvo = lista?.querySelector('[aria-checked="true"]') ?? lista?.querySelector(SELETOR_ITEM);
    alvo?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return undefined;

    const cliqueFora = (event) => {
      if (!raizRef.current?.contains(event.target)) fechar({ devolverFoco: false });
    };
    // Rolagem fecha porque o menu está ancorado ao gatilho: se a página anda, o
    // menu ficaria pairando longe do que o abriu.
    const rolou = () => fechar({ devolverFoco: false });

    document.addEventListener('pointerdown', cliqueFora);
    window.addEventListener('scroll', rolou, true);
    return () => {
      document.removeEventListener('pointerdown', cliqueFora);
      window.removeEventListener('scroll', rolou, true);
    };
  }, [aberto, fechar]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      fechar();
      return;
    }
    if (event.key === 'Tab') {
      fechar({ devolverFoco: false });
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    const focaveis = Array.from(listaRef.current?.querySelectorAll(SELETOR_ITEM) ?? []);
    if (focaveis.length === 0) return;

    const atual = focaveis.indexOf(document.activeElement);
    let proximo;
    if (event.key === 'Home') proximo = 0;
    else if (event.key === 'End') proximo = focaveis.length - 1;
    else if (event.key === 'ArrowDown') proximo = (atual + 1) % focaveis.length;
    else proximo = (atual - 1 + focaveis.length) % focaveis.length;

    event.preventDefault();
    focaveis[proximo].focus();
  };

  const gatilho = cloneElement(trigger, {
    ref: gatilhoRef,
    'aria-haspopup': 'menu',
    'aria-expanded': aberto,
    'aria-controls': aberto ? menuId : undefined,
    onClick: (event) => {
      trigger.props.onClick?.(event);
      setAberto((v) => !v);
    },
    onKeyDown: (event) => {
      trigger.props.onKeyDown?.(event);
      // Seta para baixo abre já com o foco no primeiro item — atalho esperado
      // por quem usa teclado e nunca vai clicar.
      if (event.key === 'ArrowDown' && !aberto) {
        event.preventDefault();
        setAberto(true);
      }
    },
  });

  return (
    <div
      ref={raizRef}
      className={className ? `lm-menu ${className}` : 'lm-menu'}
      onKeyDown={handleKeyDown}
    >
      {gatilho}
      {aberto ? (
        <div
          ref={listaRef}
          id={menuId}
          role="menu"
          aria-label={ariaLabel}
          className="lm-menu__list"
          data-align={align}
        >
          {items.map((item, i) =>
            item.separator ? (
              // Separador é decorativo: `role="none"` impede que o leitor de tela
              // o conte como item do menu.
              <div key={`sep-${i}`} role="none" className="lm-menu__separator" />
            ) : (
              <button
                key={item.key ?? item.label}
                type="button"
                // Item que DEFINE um valor entre alternativas é `menuitemradio`,
                // e o estado vai em `aria-checked`. Como `menuitem` simples, o
                // leitor de tela anunciaria "Tema claro, item de menu" sem dizer
                // que é o tema em uso.
                role={item.selected === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={item.selected === undefined ? undefined : item.selected}
                className="lm-menu__item"
                data-variant={item.destructive ? 'destructive' : undefined}
                disabled={item.disabled}
                // Item de menu nunca fica na ordem de Tab: o conjunto é uma
                // parada só, percorrida por setas.
                tabIndex={-1}
                onClick={() => {
                  item.onSelect?.();
                  fechar();
                }}
              >
                {item.icon ? (
                  <span className="lm-menu__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span className="lm-menu__label">{item.label}</span>
                {item.hint ? <span className="lm-menu__hint">{item.hint}</span> : null}
                {item.selected ? <Marca /> : null}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
