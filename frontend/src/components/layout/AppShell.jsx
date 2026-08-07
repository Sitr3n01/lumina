import { useEffect, useState } from 'react';
import NavigationRail from './NavigationRail';
import AppBar from './AppBar';
import useWindowClass, { formaDaNavegacao } from '../../hooks/useWindowClass';
import './AppShell.css';

/**
 * Casco da aplicação: navegação, barra superior e a região de conteúdo.
 *
 * O link "Pular para o conteúdo" é a primeira parada de Tab. Sem ele, quem navega
 * por teclado atravessa os sete destinos e as cinco utilidades da barra a cada
 * troca de página, antes de chegar ao que veio ler — WCAG 2.4.1.
 */
export default function AppShell({ currentPage, onPageChange, naoLidas, children }) {
  const classe = useWindowClass();
  const forma = formaDaNavegacao(classe);
  const [gavetaAberta, setGavetaAberta] = useState(false);

  // Alargar a janela com a gaveta aberta deixaria um <dialog> modal por cima do
  // rail que acabou de aparecer, com o resto da árvore inerte.
  useEffect(() => {
    if (forma !== 'drawer') setGavetaAberta(false);
  }, [forma]);

  return (
    <div className="lm-shell" data-nav={forma}>
      <a className="lm-shell__pular" href="#conteudo">
        Pular para o conteúdo
      </a>

      {forma === 'drawer' ? (
        <NavigationRail
          forma="drawer"
          currentPage={currentPage}
          onPageChange={onPageChange}
          open={gavetaAberta}
          onClose={() => setGavetaAberta(false)}
        />
      ) : (
        <NavigationRail forma={forma} currentPage={currentPage} onPageChange={onPageChange} />
      )}

      <div className="lm-shell__coluna">
        <AppBar
          currentPage={currentPage}
          onPageChange={onPageChange}
          onOpenNav={() => setGavetaAberta(true)}
          mostrarBotaoDeNav={forma === 'drawer'}
          naoLidas={naoLidas}
        />
        {/* `tabIndex={-1}` para que o link de pular consiga de fato pôr o foco
            aqui: um alvo não focável recebe o scroll mas não o foco, e o próximo
            Tab voltaria ao começo da página. */}
        <main id="conteudo" className="lm-shell__conteudo" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
