import { useCallback, useEffect } from 'react';
import { useSpring, animated, config } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

const SNAP_FULL      = 0.98;  // single snap point: 98% of viewport height
const DISMISS_VEL    = 0.4;   // px/ms — fast flick down dismisses the sheet
const DISMISS_PX     = 120;   // or dragged this far below the snap point

interface SpringBottomSheetProps {
  onClose: () => void;
  children: React.ReactNode;
  /** Z-index class, defaults to z-[60] */
  zClass?: string;
}

interface DragMemo {
  startHeight: number;
  canDrag: boolean;
}

function isInteractiveElement(target: Element | null): boolean {
  return !!target?.closest('input, textarea, select, button, a, [contenteditable="true"], [data-no-sheet-drag]');
}

function findScrollableAncestor(target: Element | null, boundary: Element | null): HTMLElement | null {
  let el = target;
  while (el) {
    if (boundary && el === boundary) break;
    if (el instanceof HTMLElement) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const canScrollY = /(auto|scroll|overlay)/.test(overflowY) && el.scrollHeight > el.clientHeight;
      if (canScrollY) return el;
    }
    el = el.parentElement;
  }
  return null;
}

export function SpringBottomSheet({ onClose, children, zClass = 'z-[60]' }: SpringBottomSheetProps) {
  const fullH = useCallback(() => window.innerHeight * SNAP_FULL, []);

  const [{ height }, api] = useSpring(() => ({
    height: fullH(),
    config: { ...config.stiff, clamp: false },
  }));

  // Mount: slide up from bottom
  useEffect(() => {
    api.start({ from: { height: 0 }, to: { height: fullH() }, config: config.stiff });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runDrag = useCallback((
    {
      first,
      last,
      velocity: [, vy],
      direction: [, dy],
      movement: [, my],
      event,
      memo,
      cancel,
    }: {
      first: boolean;
      last: boolean;
      velocity: [number, number];
      direction: [number, number];
      movement: [number, number];
      event: Event;
      memo?: DragMemo;
      cancel?: () => void;
    },
    source: 'handle' | 'body'
  ) => {
      let nextMemo = memo;
      if (first || !nextMemo) {
        let canDrag = true;
        if (source === 'body') {
          const target = event.target instanceof Element ? event.target : null;
          const boundary = event.currentTarget instanceof Element ? event.currentTarget : null;
          if (isInteractiveElement(target)) {
            canDrag = false;
          } else {
            const scrollable = findScrollableAncestor(target, boundary);
            canDrag = !scrollable || scrollable.scrollTop <= 0;
          }
        }
        nextMemo = { startHeight: height.get(), canDrag };
        if (!canDrag) {
          cancel?.();
          return nextMemo;
        }
      }

      if (!nextMemo.canDrag) return nextMemo;

      // Body drags should only pull downward to close.
      if (source === 'body' && my <= 0) {
        if (last) {
          api.start({ height: fullH(), config: config.stiff });
        }
        return nextMemo;
      }

      const next = Math.max(80, Math.min(window.innerHeight * 0.99, nextMemo.startHeight - my));

      if (!last) {
        api.start({ height: next, config: { tension: 0, friction: 0, clamp: true } });
        return nextMemo;
      }

      const flickingDown = dy > 0 && vy > DISMISS_VEL;
      if (flickingDown || next < fullH() - DISMISS_PX) {
        api.start({ height: 0, config: config.stiff, onRest: onClose });
      } else {
        api.start({ height: fullH(), config: config.stiff });
      }

      return nextMemo;
    }, [api, fullH, height, onClose]);

  const bindHandle = useDrag(
    (state) => runDrag(state as Parameters<typeof runDrag>[0], 'handle'),
    {
      from: () => [0, height.get()],
      filterTaps: true,
      axis: 'y',
      pointer: { touch: true },
    }
  );

  const bindBody = useDrag(
    (state) => runDrag(state as Parameters<typeof runDrag>[0], 'body'),
    {
      from: () => [0, height.get()],
      filterTaps: true,
      axis: 'y',
      pointer: { touch: true, capture: false },
    }
  );

  return (
    <animated.div
      style={{ height, overscrollBehaviorY: 'none' }}
      className={`fixed bottom-0 left-0 right-0 ${zClass} flex flex-col rounded-t-[2rem] bg-surface-container-highest/95 backdrop-blur-2xl border-t border-x border-outline-variant/20 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] overflow-hidden touch-none`}
    >
      {/* Drag handle */}
      <div
        {...bindHandle()}
        data-sheet-drag-handle
        className="flex justify-center items-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
      </div>

      {/* Content — allow internal scroll without interfering with drag */}
      <div
        {...bindBody()}
        className="flex-1 min-h-0 overflow-hidden touch-auto"
        style={{ overscrollBehaviorY: 'contain' }}
      >
        {children}
      </div>
    </animated.div>
  );
}
