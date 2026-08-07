import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import './Snackbar.css';

/**
 * Snackbar — confirma que algo aconteceu e, quando aplicável, oferece desfazer.
 * Ver 05-componentes.md §17. Mensagem crítica que exige leitura é Dialog, não isto.
 *
 * O provider mantém uma FILA: uma mensagem por vez, as demais esperam a vez.
 * O código anterior tinha seis cópias de um helper que só sabia exibir uma
 * mensagem — a segunda sobrescrevia a primeira, e o `setTimeout` sobrevivia ao
 * unmount chamando `setState` em componente desmontado.
 */

const VARIANTS = ['info', 'success', 'error'];

/**
 * Lê uma duração de token (ex.: `--lm-dwell-snackbar`) do CSS em milissegundos.
 * A permanência precisa sair do mesmo lugar que todo o resto do sistema; um
 * número cravado aqui sairia de sincronia com os tokens no primeiro ajuste.
 */
function readMs(node, prop) {
  const raw = getComputedStyle(node ?? document.documentElement)
    .getPropertyValue(prop)
    .trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return Number.NaN;
  return raw.endsWith('ms') ? value : value * 1000;
}

const SnackbarContext = createContext(null);

/** Devolve `{ show(message, opts) }`. `opts`: `{ action, actionLabel, variant }`. */
export function useSnackbar() {
  const api = useContext(SnackbarContext);
  if (!api) {
    throw new Error('useSnackbar() exige um <SnackbarProvider> acima na árvore.');
  }
  return api;
}

const Snackbar = forwardRef(function Snackbar(
  { action, actionLabel, variant = 'info', density, className, children, ...rest },
  ref,
) {
  if (import.meta.env.DEV && !VARIANTS.includes(variant)) {
    throw new Error(
      `<Snackbar variant="${variant}"> não existe. Use uma de: ${VARIANTS.join(', ')}.`,
    );
  }

  return (
    <div
      ref={ref}
      className={className ? `lm-snackbar ${className}` : 'lm-snackbar'}
      data-variant={variant}
      data-density={density}
      {...rest}
    >
      <span className="lm-snackbar__label">{children}</span>
      {action ? (
        // Botão próprio em vez de <Button variant="text">: aqui a superfície é
        // invertida, e `--lm-color-primary` mede 2,02:1 sobre ela. A ação usa
        // `--lm-snackbar-action`, que é a primária invertida.
        <button type="button" className="lm-snackbar__action" onClick={action}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
});

export function SnackbarProvider({ children, density }) {
  const [queue, setQueue] = useState([]);
  const [paused, setPaused] = useState(false);
  const regionRef = useRef(null);
  const nextIdRef = useRef(0);
  const timerRef = useRef(null);
  const remainingRef = useRef(0);
  const timedIdRef = useRef(null);

  const current = queue[0] ?? null;

  const dismiss = useCallback(() => {
    setQueue((rest) => rest.slice(1));
  }, []);

  const show = useCallback((message, opts) => {
    nextIdRef.current += 1;
    const id = nextIdRef.current;
    setQueue((rest) => [...rest, { id, message, ...opts }]);
    return id;
  }, []);

  useEffect(() => {
    if (!current) {
      timedIdRef.current = null;
      return undefined;
    }

    // Trocou de mensagem: a permanência recomeça do zero. Com ação são 10s,
    // porque desfazer precisa ser alcançável por teclado antes de sumir.
    if (timedIdRef.current !== current.id) {
      timedIdRef.current = current.id;
      remainingRef.current = readMs(
        regionRef.current,
        current.action ? '--lm-dwell-snackbar-action' : '--lm-dwell-snackbar',
      );
    }

    if (!Number.isFinite(remainingRef.current) || remainingRef.current <= 0) {
      console.error('Snackbar: token de permanência ausente ou inválido em tokens/primitives.css.');
      return undefined;
    }

    // Ponteiro em cima ou foco dentro suspende a contagem (§17: permanência
    // indefinida enquanto o usuário está lidando com a mensagem).
    if (paused) return undefined;

    const startedAt = performance.now();
    timerRef.current = window.setTimeout(dismiss, remainingRef.current);

    // Roda no unmount, ao pausar e ao trocar de mensagem — os três casos em que
    // o timer anterior precisa morrer. O que sobra é descontado para que
    // retomar não devolva a permanência inteira.
    return () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
      remainingRef.current = Math.max(0, remainingRef.current - (performance.now() - startedAt));
    };
  }, [current, paused, dismiss]);

  const api = useMemo(() => ({ show }), [show]);

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      {createPortal(
        // A região viva fica montada desde sempre, mesmo vazia: leitor de tela
        // que recebe o contêiner e o texto no mesmo quadro costuma não anunciar
        // nada. `polite` e não `assertive` — confirmação não interrompe leitura.
        <div
          ref={regionRef}
          className="lm-snackbar-region"
          data-density={density}
          role="status"
          aria-live="polite"
        >
          {current ? (
            <Snackbar
              key={current.id}
              variant={current.variant}
              actionLabel={current.actionLabel}
              action={
                current.action
                  ? () => {
                      current.action();
                      dismiss();
                    }
                  : undefined
              }
              onPointerEnter={() => setPaused(true)}
              onPointerLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            >
              {current.message}
            </Snackbar>
          ) : null}
        </div>,
        document.body,
      )}
    </SnackbarContext.Provider>
  );
}

export { Snackbar };
export default Snackbar;
