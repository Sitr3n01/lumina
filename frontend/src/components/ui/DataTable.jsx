import { forwardRef, useId, useState } from 'react';
import './DataTable.css';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';

/**
 * Tabela de dados — `<table>` semântica, não uma grade de `<div>`. Ver README.md
 * deste diretório e `docs/design-system/05-componentes.md` §16.
 *
 * `sort.direction` usa o vocabulário do próprio `aria-sort` ('ascending' |
 * 'descending') em vez de 'asc'/'desc': sem camada de tradução não há como a
 * marcação e o estado divergirem.
 */
const ALIGNMENTS = ['start', 'center', 'end'];
const DIRECTIONS = ['ascending', 'descending'];

/* Placeholders com a geometria final, e não um giro solto no meio da tela: o
   número de linhas é fixo para que a altura reservada não mude a cada busca. */
const SKELETON_ROW_COUNT = 5;

function SortIcon({ direction }) {
  return (
    <svg
      className="lm-data-table__sort-icon"
      data-direction={direction}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {direction === 'none' ? (
        <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
      ) : (
        <path d="M12 19V5M6 11l6-6 6 6" />
      )}
    </svg>
  );
}

const DataTable = forwardRef(function DataTable(
  {
    columns,
    rows,
    rowKey,
    caption,
    captionVisible = false,
    empty,
    loading = false,
    sort,
    onSortChange,
    density,
    className,
    ...rest
  },
  ref,
) {
  const captionId = useId();
  /* A mensagem nasce vazia e só é preenchida no clique: derivá-la de `sort`
     faria o leitor de tela anunciar uma ordenação que o usuário não pediu
     assim que a tela monta. */
  const [announcement, setAnnouncement] = useState('');

  if (import.meta.env.DEV) {
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error('<DataTable> exige `columns` com ao menos uma coluna.');
    }
    if (!Array.isArray(rows)) {
      throw new Error('<DataTable> exige `rows` como array. Enquanto carrega, use `loading`.');
    }
    if (!caption) {
      throw new Error(
        '<DataTable> exige `caption`: sem legenda a tabela não se anuncia. Use captionVisible={false} para escondê-la visualmente.',
      );
    }
    if (!rowKey) {
      throw new Error('<DataTable> exige `rowKey` — nome de campo ou função (row, index) => chave.');
    }
    if (sort && !DIRECTIONS.includes(sort.direction)) {
      throw new Error(
        `<DataTable sort={{ direction: "${sort.direction}" }}> não existe. Use uma de: ${DIRECTIONS.join(', ')}.`,
      );
    }
    if (!loading && rows.length === 0 && !empty) {
      throw new Error(
        '<DataTable> sem linhas exige `empty` com as props do EmptyState (04-conteudo.md §6.1).',
      );
    }
    columns.forEach((column) => {
      if (!column.key) {
        throw new Error('<DataTable> exige `key` em cada coluna de `columns`.');
      }
      if (column.align && !ALIGNMENTS.includes(column.align)) {
        throw new Error(
          `<DataTable> coluna "${column.key}" com align="${column.align}" não existe. Use uma de: ${ALIGNMENTS.join(', ')}.`,
        );
      }
      if (column.sortable && !onSortChange) {
        throw new Error(
          `<DataTable> coluna "${column.key}" é sortable mas não há \`onSortChange\` — o cabeçalho ficaria clicável e inerte.`,
        );
      }
    });
  }

  const isEmpty = !loading && rows.length === 0;
  const captionIsText = typeof caption === 'string';

  function directionOf(column) {
    return sort && sort.key === column.key ? sort.direction : 'none';
  }

  function handleSort(column) {
    const current = directionOf(column);
    const next = current === 'ascending' ? 'descending' : 'ascending';
    const label = typeof column.header === 'string' ? column.header : column.key;

    onSortChange({ key: column.key, direction: next });
    setAnnouncement(
      `Tabela ordenada por ${label}, ordem ${next === 'ascending' ? 'crescente' : 'decrescente'}.`,
    );
  }

  return (
    <div
      ref={ref}
      className={className ? `lm-data-table ${className}` : 'lm-data-table'}
      data-density={density}
      data-loading={loading || undefined}
      data-empty={isEmpty || undefined}
      {...rest}
    >
      {/* O contêiner rola sozinho para que a página nunca role na horizontal
          (WCAG 1.4.10). Uma região rolável sem `tabindex` fica inalcançável por
          teclado, e sem nome acessível o leitor de tela anuncia "região" e nada
          mais — daí `role`, `tabindex` e rótulo virem sempre juntos. */}
      <div
        className="lm-data-table__scroller"
        role="region"
        tabIndex={0}
        aria-label={captionIsText ? caption : undefined}
        aria-labelledby={captionIsText ? undefined : captionId}
      >
        <table className="lm-data-table__table" aria-busy={loading || undefined}>
          <caption
            id={captionId}
            className="lm-data-table__caption"
            data-hidden={captionVisible ? undefined : ''}
          >
            {caption}
          </caption>

          {columns.some((column) => column.width) ? (
            <colgroup>
              {columns.map((column) => (
                <col
                  key={column.key}
                  style={column.width ? { inlineSize: column.width } : undefined}
                />
              ))}
            </colgroup>
          ) : null}

          <thead className="lm-data-table__head">
            <tr>
              {columns.map((column) => {
                const align = column.align ?? 'start';
                const direction = directionOf(column);

                return (
                  <th
                    key={column.key}
                    className="lm-data-table__header"
                    scope="col"
                    aria-sort={column.sortable ? direction : undefined}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className="lm-data-table__sort"
                        data-align={align}
                        disabled={loading}
                        onClick={() => handleSort(column)}
                      >
                        <span className="lm-data-table__header-text">{column.header}</span>
                        <SortIcon direction={direction} />
                      </button>
                    ) : (
                      <span className="lm-data-table__header-label" data-align={align}>
                        {column.header}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="lm-data-table__body">
            {loading
              ? Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                  <tr key={`lm-loading-${index}`} className="lm-data-table__row" data-placeholder="loading">
                    {columns.map((column) => (
                      <td key={column.key} className="lm-data-table__cell">
                        <Skeleton />
                      </td>
                    ))}
                  </tr>
                ))
              : null}

            {isEmpty ? (
              <tr className="lm-data-table__row" data-placeholder="empty">
                {/* `empty` são as props do EmptyState, não um nó livre: assim o
                    estado vazio é sempre um EmptyState com as quatro perguntas,
                    e não um "Nenhum resultado." solto dentro da célula. */}
                <td className="lm-data-table__cell" colSpan={columns.length}>
                  <EmptyState {...empty} />
                </td>
              </tr>
            ) : null}

            {!loading && !isEmpty
              ? rows.map((row, rowIndex) => (
                  <tr
                    key={typeof rowKey === 'function' ? rowKey(row, rowIndex) : row[rowKey]}
                    className="lm-data-table__row"
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className="lm-data-table__cell"
                        data-align={column.align ?? 'start'}
                      >
                        {column.render ? column.render(row, rowIndex) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>

      {/* Fora da tabela: `<table>` não aceita conteúdo solto, e uma região viva
          precisa existir no DOM antes da mudança para ser anunciada. */}
      <div className="lm-data-table__announcer" role="status">
        {announcement}
      </div>
    </div>
  );
});

export default DataTable;
