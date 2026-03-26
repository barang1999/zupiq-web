import { useEffect, useRef, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Paperclip, Sparkles, Minus, Network, X } from 'lucide-react';

interface ProblemComposerProps {
  open: boolean;
  value: string;
  loading?: boolean;
  error?: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function ProblemComposer({
  open,
  value,
  loading = false,
  error = null,
  onChange,
  onSubmit,
  onClose,
}: ProblemComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
  }, [open]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="hidden sm:block absolute top-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-5xl pointer-events-auto"
          >
            <section
              className="relative overflow-hidden rounded-[28px] bg-surface-container-highest/60 backdrop-blur-2xl border border-primary/40 shadow-[0_0_14px_rgba(161,250,255,0.35),inset_0_0_2px_rgba(161,250,255,0.45)]"
            >
              <div className="absolute top-5 right-6 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-primary">
                  Neural Pulse Active
                </span>
                <button
                  onClick={onClose}
                  className="ml-1 p-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors"
                  aria-label="Close composer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-8 pt-10 pb-6">
                <h2 className="font-headline text-3xl text-on-surface mb-8 tracking-tight pr-12">
                  Elevate your{' '}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Cognitive Architecture
                  </span>
                </h2>

                <div className="relative mb-7">
                  <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Zupiq to breakdown this concept..."
                    rows={3}
                    disabled={loading}
                    className="w-full bg-transparent border-none focus:ring-0 text-2xl text-on-surface placeholder:text-on-surface-variant/40 font-body resize-none min-h-[150px] outline-none pr-32"
                  />

                  <div className="absolute bottom-1 right-0 flex items-center gap-4">
                    <button
                      type="button"
                      className="text-on-surface-variant hover:text-primary transition-colors p-1"
                      aria-label="Attach"
                    >
                      <Paperclip className="w-6 h-6" />
                    </button>
                    <button
                      onClick={onSubmit}
                      disabled={loading || !value.trim()}
                      className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-on-primary shadow-[0_0_18px_rgba(161,250,255,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      aria-label="Submit problem"
                    >
                      <ArrowRight className="w-7 h-7" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-highest/40 hover:bg-surface-container-highest transition-colors border border-outline-variant/20">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-on-surface">Deep Dive</span>
                  </button>
                  <button className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-highest/40 hover:bg-surface-container-highest transition-colors border border-outline-variant/20">
                    <Minus className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium text-on-surface">Simplify</span>
                  </button>
                  <button className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-highest/40 hover:bg-surface-container-highest transition-colors border border-outline-variant/20">
                    <Network className="w-4 h-4 text-tertiary" />
                    <span className="text-sm font-medium text-on-surface">Visual Map</span>
                  </button>
                </div>

                {error && (
                  <p className="mt-3 text-sm text-error">{error}</p>
                )}
              </div>

              <div className="absolute top-0 right-0 w-36 h-36 bg-tertiary/10 blur-3xl pointer-events-none" />
            </section>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="sm:hidden fixed left-3 right-3 bottom-16 z-[60] pointer-events-auto"
          >
            <section className="relative overflow-hidden rounded-[22px] bg-surface-container-highest/80 backdrop-blur-xl border border-primary/35 shadow-[0_0_12px_rgba(161,250,255,0.28)]">
              <div className="px-4 pt-3 pb-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-primary">
                    Neural Pulse
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors"
                  aria-label="Close composer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 pt-3 pb-4">
                <h3 className="font-headline text-base text-on-surface mb-2.5 tracking-tight">
                  Elevate your{' '}
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Cognitive Architecture
                  </span>
                </h3>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Zupiq to breakdown this concept..."
                    rows={2}
                    disabled={loading}
                    className="w-full bg-transparent border-none focus:ring-0 text-base text-on-surface placeholder:text-on-surface-variant/45 resize-none min-h-[84px] outline-none pr-20"
                  />
                  <div className="absolute right-0 bottom-0 flex items-center gap-2">
                    <button
                      type="button"
                      className="text-on-surface-variant hover:text-primary transition-colors p-1"
                      aria-label="Attach"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      onClick={onSubmit}
                      disabled={loading || !value.trim()}
                      className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-on-primary shadow-[0_0_14px_rgba(161,250,255,0.35)] disabled:opacity-50"
                      aria-label="Submit problem"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <button className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-highest/50 border border-outline-variant/20 text-xs text-on-surface">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Deep Dive
                  </button>
                  <button className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-highest/50 border border-outline-variant/20 text-xs text-on-surface">
                    <Minus className="w-3.5 h-3.5 text-secondary" />
                    Simplify
                  </button>
                  <button className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-highest/50 border border-outline-variant/20 text-xs text-on-surface">
                    <Network className="w-3.5 h-3.5 text-tertiary" />
                    Visual Map
                  </button>
                </div>

                {error && <p className="mt-2 text-xs text-error">{error}</p>}
              </div>
            </section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
