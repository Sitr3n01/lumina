import './PageHeader.css';

/**
 * Faixa de abertura de uma página: texto de apoio à esquerda, ações à direita.
 *
 * NÃO repete o título — quem o carrega é a app bar, uma vez só. Antes eram onze
 * páginas com onze cabeçalhos diferentes, cada um com o seu `<h1>`, o seu tamanho
 * de fonte e a sua margem.
 *
 * `actions` recebe no máximo uma ação primária; o resto vai num Menu. Quatro
 * botões preenchidos lado a lado não têm hierarquia — viram uma barra de
 * ferramentas onde nada é o próximo passo.
 */
export default function PageHeader({ description, actions, filters, children }) {
  const temFaixa = Boolean(description || actions);

  return (
    <div className="lm-page-header">
      {temFaixa ? (
        <div className="lm-page-header__faixa">
          {description ? <p className="lm-page-header__apoio">{description}</p> : null}
          {actions ? <div className="lm-page-header__acoes">{actions}</div> : null}
        </div>
      ) : null}
      {filters ? <div className="lm-page-header__filtros">{filters}</div> : null}
      {children}
    </div>
  );
}
