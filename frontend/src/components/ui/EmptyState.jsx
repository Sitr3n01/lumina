import { forwardRef } from 'react';
import './EmptyState.css';

/**
 * EmptyState — explica uma ausência e oferece a saída. Ver
 * `docs/design-system/05-componentes.md` §18 e `04-conteudo.md` §6.1.
 *
 * As quatro perguntas de §6.1 se distribuem assim: `title` diz o que deveria estar aqui,
 * `description` diz por que está vazio e o que muda quando deixar de estar, `action` diz o
 * que fazer agora. Estado vazio sem saída é um beco sem saída — daí o aviso em
 * desenvolvimento quando `action` falta.
 *
 * `action` é um nó, não um par rótulo/callback: a ação de saída às vezes é um Button, às
 * vezes um link, às vezes duas coisas. Quem decide é a tela.
 */
const EmptyState = forwardRef(function EmptyState(
  {
    icon,
    title,
    description,
    action,
    // O nível do título depende de onde o estado vazio cai na página; não há nível
    // universalmente correto para fixar aqui.
    titleAs: Title = 'h3',
    density,
    className,
    children,
    ...rest
  },
  ref,
) {
  if (import.meta.env.DEV) {
    if (!title) {
      throw new Error('<EmptyState> precisa de `title`: uma ausência sem explicação não é um estado, é um buraco.');
    }
    if (!action) {
      console.warn(
        '<EmptyState> sem `action`: só omita a saída quando ela realmente não existir ' +
          '(05-componentes.md §18).',
      );
    }
  }

  return (
    <div
      ref={ref}
      className={className ? `lm-empty-state ${className}` : 'lm-empty-state'}
      data-density={density}
      {...rest}
    >
      {icon ? (
        <span className="lm-empty-state__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <Title className="lm-empty-state__title">{title}</Title>
      {description ? <p className="lm-empty-state__description">{description}</p> : null}
      {children}
      {action ? <div className="lm-empty-state__action">{action}</div> : null}
    </div>
  );
});

export default EmptyState;
