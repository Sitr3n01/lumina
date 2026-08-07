import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

/**
 * Tooltip — nomeia um controle cujo ícone não é autoexplicativo.
 * Ver 05-componentes.md §19.
 *
 * O conteúdo NUNCA é essencial e NUNCA é interativo: tooltip não existe no
 * toque, e um link dentro dele é inalcançável. Se a informação é necessária,
 * ela é texto visível; se precisa de link, é Popover.
 *
 * Envolve um único elemento e o liga por `aria-describedby`. O gatilho continua
 * sendo o filho — nada de wrapper — para que o alvo de foco e o alvo de
 * ponteiro sejam o mesmo nó.
 */

/* A "janela quente" é compartilhada por todos os tooltips da aplicação: ao
   varrer uma barra de ícones, o segundo alvo aparece sem espera. Por isso mora
   no módulo, não no componente. */
let groupWarm = false;
let groupCoolTimer = null;

/** Lê um token de duração em milissegundos. */
function readMs(node, prop) {
  const raw = getComputedStyle(node ?? document.documentElement)
    .getPropertyValue(prop)
    .trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return raw.endsWith('ms') ? value : value * 1000;
}

/** Lê um token de comprimento em px CSS. */
function readPx(node, prop) {
  const value = Number.parseFloat(getComputedStyle(node).getPropertyValue(prop));
  return Number.isFinite(value) ? value : 0;
}

function assignRef(ref, node) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}

const Tooltip = forwardRef(function Tooltip({ content, className, children, ...rest }, ref) {
  const tooltipId = useId();
  const triggerRef = useRef(null);
  const tipRef = useRef(null);
  const openTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const tip = tipRef.current;
    if (!trigger || !tip) return;

    const gap = readPx(tip, '--lm-space-8');
    const anchor = trigger.getBoundingClientRect();
    const tipBox = tip.getBoundingClientRect();

    // Acima por padrão; abaixo quando não cabe. Sem isto o tooltip do primeiro
    // item de uma app bar sai da viewport (critério de aceitação do §19).
    const above = anchor.top - tipBox.height - gap;
    const placement = above >= gap ? 'top' : 'bottom';
    const farthestLeft = Math.max(gap, window.innerWidth - tipBox.width - gap);
    const centered = anchor.left + anchor.width / 2 - tipBox.width / 2;

    setPos({
      placement,
      top: placement === 'top' ? above : anchor.bottom + gap,
      left: Math.min(Math.max(gap, centered), farthestLeft),
    });
  }, []);

  const close = useCallback(() => {
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
    setOpen(false);
    setPos(null);
    window.clearTimeout(groupCoolTimer);
    // O grupo esfria depois de um atraso normal: sair de um ícone e voltar
    // dentro desse intervalo continua sendo "o mesmo grupo".
    groupCoolTimer = window.setTimeout(() => {
      groupWarm = false;
    }, readMs(triggerRef.current, '--lm-dwell-tooltip-delay'));
  }, []);

  const openAfter = useCallback((token) => {
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = window.setTimeout(() => {
      groupWarm = true;
      window.clearTimeout(groupCoolTimer);
      setOpen(true);
    }, readMs(triggerRef.current, token));
  }, []);

  useEffect(() => () => window.clearTimeout(openTimerRef.current), []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, content, place]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };

    // Captura: o Escape fecha o tooltip mesmo quando o foco está num campo que
    // trata a tecla por conta própria.
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', place, { capture: true, passive: true });
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', place, { capture: true });
      window.removeEventListener('resize', place);
    };
  }, [open, close, place]);

  const child = Children.only(children);
  const childRef = isValidElement(child) ? child.ref : null;

  const setTriggerRef = useCallback(
    (node) => {
      triggerRef.current = node;
      assignRef(ref, node);
      assignRef(childRef, node);
    },
    [ref, childRef],
  );

  if (import.meta.env.DEV) {
    if (!isValidElement(child)) {
      throw new Error('<Tooltip> envolve um único elemento — o gatilho.');
    }
    if (content !== undefined && typeof content !== 'string' && typeof content !== 'number') {
      throw new Error(
        '<Tooltip content> aceita só texto. Conteúdo interativo é inalcançável por teclado e no toque — use Popover.',
      );
    }
  }

  if (content === undefined || content === null || content === '') return child;

  const describedBy = [child.props['aria-describedby'], open ? tooltipId : null]
    .filter(Boolean)
    .join(' ');

  const trigger = cloneElement(child, {
    ref: setTriggerRef,
    className: [child.props.className, className].filter(Boolean).join(' ') || undefined,
    'aria-describedby': describedBy || undefined,
    onPointerEnter: (event) => {
      child.props.onPointerEnter?.(event);
      // No toque não existe hover: o tooltip apareceria junto do "clique" e
      // taparia o próprio controle.
      if (event.pointerType === 'touch') return;
      openAfter(groupWarm ? '--lm-dwell-tooltip-delay-repeat' : '--lm-dwell-tooltip-delay');
    },
    onPointerLeave: (event) => {
      child.props.onPointerLeave?.(event);
      close();
    },
    onPointerDown: (event) => {
      child.props.onPointerDown?.(event);
      close();
    },
    onFocus: (event) => {
      child.props.onFocus?.(event);
      // Só foco de teclado, e sem espera: `:focus-visible` evita que o tooltip
      // reapareça logo depois do clique que acabou de fechá-lo.
      if (event.target.matches(':focus-visible')) {
        openAfter('--lm-dwell-tooltip-delay-repeat');
      }
    },
    onBlur: (event) => {
      child.props.onBlur?.(event);
      close();
    },
    ...rest,
  });

  return (
    <>
      {trigger}
      {open
        ? createPortal(
            <div
              ref={tipRef}
              id={tooltipId}
              role="tooltip"
              className="lm-tooltip"
              data-placement={pos?.placement}
              data-ready={pos ? '' : undefined}
              style={
                pos ? { insetBlockStart: `${pos.top}px`, insetInlineStart: `${pos.left}px` } : undefined
              }
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
});

export { Tooltip };
export default Tooltip;
