import { useState, useRef, useEffect } from 'react';
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
  disabled?: boolean;
  /** 'underline' = minimal border-bottom style (Step 1 form fields)
   *  'card'      = full rounded card style (Step 3 language picker) */
  variant?: 'underline' | 'card';
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled = false,
  variant = 'underline',
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const handleOpen = () => {
    if (disabled) return;
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

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const triggerClass =
    variant === 'underline'
      ? `w-full flex items-center justify-between py-3 px-0 border-b-2 transition-colors ${
          disabled
            ? 'cursor-not-allowed opacity-60 border-outline-variant'
            : `cursor-pointer ${open ? 'border-primary' : 'border-surface-container-high hover:border-outline-variant'}`
        }`
      : `w-full flex items-center justify-between py-4 px-4 rounded-xl bg-surface-container-high transition-colors border-b-2 ${
          disabled
            ? 'cursor-not-allowed opacity-60 border-outline-variant'
            : `cursor-pointer ${open ? 'border-primary' : 'border-outline-variant hover:border-outline'}`
        }`;

  const dropdown = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute left-0 top-full z-50 mt-2 w-full rounded-2xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.6)] border border-white/5"
          role="listbox"
        >
          <div className="bg-surface-container-highest max-h-60 overflow-y-auto scrollbar-thin">
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
        type="button"
        onClick={handleOpen}
        className={triggerClass}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
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

      {dropdown}
    </div>
  );
}
