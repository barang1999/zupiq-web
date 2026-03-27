import { useEffect, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface ActionPopoverPosition {
  x: number;
  y: number;
}

export interface ActionPopoverAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface ActionPopoverProps {
  open: boolean;
  position: ActionPopoverPosition | null;
  title?: string;
  subtitle?: ReactNode;
  actions: ActionPopoverAction[];
  onRequestClose?: () => void;
}

export function ActionPopover({
  open,
  position,
  title = 'Action Portal',
  subtitle,
  actions,
  onRequestClose,
}: ActionPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !onRequestClose) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (target && containerRef.current?.contains(target)) return;
      onRequestClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onRequestClose();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onRequestClose, open]);

  return (
    <AnimatePresence>
      {open && position && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          className="fixed z-[60] w-[248px] rounded-2xl border border-outline-variant/35 bg-surface-container-highest/95 backdrop-blur-xl shadow-2xl p-2"
          style={{ left: position.x, top: position.y }}
        >
          <div className="px-2 py-1.5 border-b border-outline-variant/20 mb-1.5">
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">{title}</p>
            {subtitle ? <p className="text-xs text-on-surface truncate">{subtitle}</p> : null}
          </div>

          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={action.disabled}
              className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
              <span className="font-medium">{action.label}</span>
              {action.icon}
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

