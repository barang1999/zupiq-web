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

  const bind = useDrag(
    ({ last, velocity: [, vy], movement: [, my], memo = height.get() }) => {
      const next = Math.max(80, Math.min(window.innerHeight * 0.99, memo - my));

      if (!last) {
        api.start({ height: next, config: { tension: 0, friction: 0, clamp: true } });
        return memo;
      }

      const flickingDown = vy > DISMISS_VEL;
      if (flickingDown || next < fullH() - DISMISS_PX) {
        api.start({ height: 0, config: config.stiff, onRest: onClose });
      } else {
        api.start({ height: fullH(), config: config.stiff });
      }

      return memo;
    },
    {
      from: () => [0, height.get()],
      filterTaps: true,
      axis: 'y',
      pointer: { touch: true },
    }
  );

  return (
    <animated.div
      style={{ height }}
      className={`fixed bottom-0 left-0 right-0 ${zClass} flex flex-col rounded-t-[2rem] bg-surface-container-highest/95 backdrop-blur-2xl border-t border-x border-outline-variant/20 shadow-[0_-20px_60px_rgba(0,0,0,0.5)] overflow-hidden touch-none`}
    >
      {/* Drag handle */}
      <div
        {...bind()}
        className="flex justify-center items-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="w-12 h-1.5 rounded-full bg-outline-variant/60" />
      </div>

      {/* Content — allow internal scroll without interfering with drag */}
      <div className="flex-1 min-h-0 overflow-hidden touch-auto">
        {children}
      </div>
    </animated.div>
  );
}
