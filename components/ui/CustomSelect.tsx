import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** 'underline' = minimal border-bottom style (Step 1 form fields)
   *  'card'      = full rounded card style (Step 3 language picker) */
  variant?: 'underline' | 'card';
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  variant = 'underline',
}: Props) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find(o => o.value === value);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  };

  const handleOpen = () => {
    updatePosition();
    setOpen(o => !o);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open]);

  const triggerClass =
    variant === 'underline'
      ? `w-full flex items-center justify-between py-3 px-0 border-b-2 transition-colors cursor-pointer ${
          open ? 'border-primary' : 'border-surface-container-high hover:border-outline-variant'
        }`
      : `w-full flex items-center justify-between py-4 px-4 rounded-xl bg-surface-container-high transition-colors cursor-pointer border-b-2 ${
          open ? 'border-primary' : 'border-outline-variant hover:border-outline'
        }`;

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scaleY: 0.92 }}
          animate={{ opacity: 1, y: 0, scaleY: 1 }}
          exit={{ opacity: 0, y: -8, scaleY: 0.92 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={{ ...dropdownStyle, transformOrigin: 'top' }}
          className="rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.6)] border border-white/5"
          role="listbox"
        >
          <div className="bg-surface-container-highest/90 backdrop-blur-xl max-h-60 overflow-y-auto scrollbar-thin">
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-5 py-4 text-left text-base transition-colors group ${
                    isSelected
                      ? 'text-primary bg-primary/10'
                      : 'text-on-surface hover:bg-surface-container-high'
                  } ${i !== 0 ? 'border-t border-white/5' : ''}`}
                >
                  <span className="font-medium">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={triggerClass}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`text-lg ${selected ? 'text-on-surface' : 'text-outline-variant'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-on-surface-variant shrink-0 ml-2"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.span>
      </button>

      {createPortal(dropdown, document.body)}
    </div>
  );
}
