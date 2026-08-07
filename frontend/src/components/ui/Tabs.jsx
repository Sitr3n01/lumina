import { useCallback, useId, useRef } from 'react';
import './Tabs.css';

/**
 * Abas — alterna entre visões irmãs do MESMO objeto. Se as visões tratam de
 * objetos diferentes, é navegação, não aba.
 *
 * Ativação MANUAL: a seta move o foco, `Enter`/`Espaço` ativa. A alternativa
 * (ativar ao mover o foco) parece mais direta, mas num painel pesado como
 * Configurações ela dispara três montagens enquanto o usuário só queria chegar à
 * quarta aba — e o leitor de tela anuncia cada uma.
 */
export function Tabs({ tabs, value, onChange, className, ariaLabel, children }) {
  const baseId = useId();
  const listRef = useRef(null);

  const idDaAba = (key) => `${baseId}-tab-${key}`;
  const idDoPainel = (key) => `${baseId}-panel-${key}`;

  const handleKeyDown = useCallback(
    (event) => {
      const teclas = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
      if (!teclas.includes(event.key)) return;

      const focaveis = Array.from(
        listRef.current?.querySelectorAll('[role="tab"]:not([disabled])') ?? [],
      );
      if (focaveis.length === 0) return;

      const atual = focaveis.indexOf(document.activeElement);
      let proximo;
      if (event.key === 'Home') proximo = 0;
      else if (event.key === 'End') proximo = focaveis.length - 1;
      // O resto dá a volta: chegar ao fim e continuar apertando não pode travar.
      else if (event.key === 'ArrowRight') proximo = (atual + 1) % focaveis.length;
      else proximo = (atual - 1 + focaveis.length) % focaveis.length;

      event.preventDefault();
      focaveis[proximo].focus();
    },
    [],
  );

  return (
    <div className={className ? `lm-tabs ${className}` : 'lm-tabs'}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={ariaLabel}
        className="lm-tabs__list"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => {
          const selecionada = tab.key === value;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={idDaAba(tab.key)}
              className="lm-tabs__tab"
              aria-selected={selecionada}
              aria-controls={idDoPainel(tab.key)}
              // Só a aba selecionada fica na ordem de Tab: o conjunto é UMA
              // parada, e as setas percorrem por dentro. É o padrão que
              // 03-acessibilidade.md §4.2 exige e o que o usuário espera.
              tabIndex={selecionada ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange(tab.key)}
            >
              {tab.icon ? (
                <span className="lm-tabs__icon" aria-hidden="true">
                  {tab.icon}
                </span>
              ) : null}
              <span className="lm-tabs__label">{tab.label}</span>
              {tab.badge === undefined ? null : (
                <span className="lm-tabs__badge">{tab.badge}</span>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={idDoPainel(value)}
        aria-labelledby={idDaAba(value)}
        className="lm-tabs__panel"
        // O painel recebe foco programático quando alguém chega nele por link
        // direto; sem isto, conteúdo rolável não é alcançável por teclado.
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

export default Tabs;
