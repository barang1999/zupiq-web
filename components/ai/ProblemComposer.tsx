import { useEffect, useRef, useState, type KeyboardEvent, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Camera, Paperclip, Sparkles, Minus, Network, Upload, X, Table as TableIcon } from 'lucide-react';
import { RichText } from '../ui/RichText';
import SweepText from '../ui/SweepText.jsx';

function isComposerDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as { __ZUPIQ_COMPOSER_DEBUG__?: boolean };
  if (typeof win.__ZUPIQ_COMPOSER_DEBUG__ === 'boolean') return win.__ZUPIQ_COMPOSER_DEBUG__;
  return new URLSearchParams(window.location.search).get('debugComposer') === '1';
}

function debugClip(text: string, max = 240): string {
  const normalized = (text ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}...`;
}

function isEscaped(text: string, index: number): boolean {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i -= 1) backslashes += 1;
  return backslashes % 2 === 1;
}

function countUnescapedDollarSigns(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '$' && !isEscaped(text, i)) count += 1;
  }
  return count;
}

function stripMathDelimiters(token: string): string {
  if (token.startsWith('$$') && token.endsWith('$$')) return token.slice(2, -2);
  if (token.startsWith('$') && token.endsWith('$')) return token.slice(1, -1);
  if (token.startsWith('\\(') && token.endsWith('\\)')) return token.slice(2, -2);
  if (token.startsWith('\\[') && token.endsWith('\\]')) return token.slice(2, -2);
  return token;
}

function hasBalancedBraces(text: string): boolean {
  let depth = 0;
  for (const ch of text) {
    if (ch === '{') depth += 1;
    if (ch === '}') depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function logComposerMathDebug(source: string, text: string, meta: Record<string, unknown> = {}) {
  if (!isComposerDebugEnabled()) return;

  const raw = text ?? '';
  const hasMathSignals = /[$\\^_=]|\\\(|\\\)|\\\[|\\\]|[0-9]+\s*(?:m\/s|m\/s\^2)/.test(raw);
  if (!hasMathSignals && !meta.force) return;

  const mathTokens = raw.match(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/g) ?? [];
  const unescapedDollarSigns = countUnescapedDollarSigns(raw);
  const unbalancedDollarSigns = unescapedDollarSigns % 2 !== 0;
  const doubleEscapedCommands = raw.match(/\\\\(?=[A-Za-z])/g) ?? [];
  const brokenBraceTokens = mathTokens.filter((token) => !hasBalancedBraces(stripMathDelimiters(token)));

  const outsideDelimitedMath = raw.replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/g, ' ');
  const bareLatexUnitPatterns = outsideDelimitedMath.match(
    /(?:\b[A-Za-zα-ωΑ-Ω]\s*=\s*)?\d+(?:\.\d+)?\s*\\(?:text|mathrm)\{[^{}]+\}(?:\s*(?:\^\{[^{}]+\}|\^[0-9A-Za-z]+))?/g
  ) ?? [];
  const bareSlashUnitPatterns = outsideDelimitedMath.match(
    /\b[A-Za-zα-ωΑ-Ω]\s*=\s*\d+(?:\.\d+)?\s*[A-Za-z]+(?:\/[A-Za-z]+)+(?:\^\d+)?\b/g
  ) ?? [];

  console.debug('[ProblemComposer math debug]', {
    source,
    length: raw.length,
    preview: debugClip(raw),
    lineCount: raw.split('\n').length,
    mathTokenCount: mathTokens.length,
    unescapedDollarSigns,
    unbalancedDollarSigns,
    doubleEscapedCommandCount: doubleEscapedCommands.length,
    brokenBraceTokenCount: brokenBraceTokens.length,
    bareLatexUnitPatternCount: bareLatexUnitPatterns.length,
    bareSlashUnitPatternCount: bareSlashUnitPatterns.length,
    mathTokens: mathTokens.slice(0, 8),
    brokenBraceTokens: brokenBraceTokens.slice(0, 6),
    bareLatexUnitPatterns: bareLatexUnitPatterns.slice(0, 8),
    bareSlashUnitPatterns: bareSlashUnitPatterns.slice(0, 8),
    ...meta,
  });
}

function shouldShowRenderedPreview(text: string): boolean {
  if (!text?.trim()) return false;
  return /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]|\\[a-zA-Z]+/.test(text);
}

interface ProblemComposerProps {
  open: boolean;
  value: string;
  loading?: boolean;
  imageLoading?: boolean;
  error?: string | null;
  hasVisualTable?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onAttachFile?: (file: File) => void | Promise<void>;
  onImageCropRequest?: (src: string, name: string, onConfirm: (file: File) => Promise<void>) => void;
}

export function ProblemComposer({
  open,
  value,
  loading = false,
  imageLoading = false,
  error = null,
  hasVisualTable = false,
  onChange,
  onSubmit,
  onClose,
  onAttachFile,
  onImageCropRequest,
}: ProblemComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const previousValueRef = useRef(value);
  const previousImageLoadingRef = useRef(imageLoading);
  const previousPreviewVisibleRef = useRef(false);
  const showRenderedPreview = shouldShowRenderedPreview(value);
  const hasTypedInput = value.trim().length > 0;
  const modalHeightClass = showRenderedPreview
    ? 'min-h-[320px] sm:min-h-[360px] max-h-[calc(100vh-1.5rem)] sm:max-h-[760px]'
    : 'min-h-[320px] sm:min-h-[360px] max-h-[calc(100vh-1.5rem)] sm:max-h-[560px]';
  const contentPaddingClass = 'pt-6 sm:pt-7 pb-4 sm:pb-5';
  const headerSlotClass = 'mb-3 sm:mb-4 min-h-[30px] sm:min-h-[42px]';
  const textareaBlockClass = 'mb-4 sm:mb-5';
  const textareaMinHeightClass = showRenderedPreview
    ? 'min-h-[170px] sm:min-h-[220px]'
    : 'min-h-[210px] sm:min-h-[280px]';
  const showImageLoadingPlaceholder = imageLoading && !value.trim();

  useEffect(() => {
    if (!open) return;
    textareaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !isAttachMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (attachMenuRef.current?.contains(target)) return;
      if (attachButtonRef.current?.contains(target)) return;
      setIsAttachMenuOpen(false);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setIsAttachMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isAttachMenuOpen, open]);

  useEffect(() => {
    if (!open || imageLoading) return;
    setIsAttachMenuOpen(false);
  }, [imageLoading, open]);

  useEffect(() => {
    if (!open) return;

    const previousValue = previousValueRef.current;
    const previousImageLoading = previousImageLoadingRef.current;

    if (value !== previousValue) {
      const source = (!imageLoading && previousImageLoading)
        ? 'composer:value-update:image-ocr-complete'
        : 'composer:value-update';
      logComposerMathDebug(source, value, {
        deltaLength: value.length - previousValue.length,
      });
    }

    if (imageLoading !== previousImageLoading) {
      logComposerMathDebug(
        imageLoading ? 'composer:image-analysis:start' : 'composer:image-analysis:end',
        value,
        { imageLoading, force: true }
      );
    }

    previousValueRef.current = value;
    previousImageLoadingRef.current = imageLoading;
  }, [imageLoading, open, value]);

  useEffect(() => {
    if (!open) return;
    if (showRenderedPreview === previousPreviewVisibleRef.current) return;
    previousPreviewVisibleRef.current = showRenderedPreview;
    if (isComposerDebugEnabled()) {
      console.debug('[ProblemComposer debug] rendered preview visibility changed', {
        showRenderedPreview,
        valueLength: value.length,
      });
    }
  }, [open, showRenderedPreview, value.length]);

  const triggerSubmit = (source: 'button' | 'enter-key') => {
    if (loading || imageLoading || !value.trim()) return;
    logComposerMathDebug(`composer:submit:${source}`, value, { force: true });
    onSubmit();
    onClose();
  };

  const handleTextChange = (nextValue: string, source: 'desktop' | 'mobile') => {
    logComposerMathDebug(`composer:input:${source}`, nextValue, {
      deltaLength: nextValue.length - value.length,
    });
    onChange(nextValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      triggerSubmit('enter-key');
    }
  };

  const openAttachOptions = () => {
    if (!onAttachFile || loading || imageLoading) return;
    if (isComposerDebugEnabled()) {
      console.debug('[ProblemComposer debug] open attachment options', {
        loading,
        imageLoading,
      });
    }
    setIsAttachMenuOpen((prev) => !prev);
  };

  const pickFromLibrary = () => {
    if (!onAttachFile || loading || imageLoading) return;
    setIsAttachMenuOpen(false);
    uploadFileInputRef.current?.click();
  };

  const pickFromCamera = () => {
    if (!onAttachFile || loading || imageLoading) return;
    setIsAttachMenuOpen(false);
    cameraInputRef.current?.click();
  };

  const handleFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    source: 'camera' | 'library'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !onAttachFile) return;
    if (isComposerDebugEnabled()) {
      console.debug('[ProblemComposer debug] file selected', {
        source,
        name: file.name,
        type: file.type,
        size: file.size,
      });
    }
    e.target.value = '';
    if (file.type.startsWith('image/') && onImageCropRequest) {
      const objectUrl = URL.createObjectURL(file);
      onImageCropRequest(objectUrl, file.name, async (croppedFile) => {
        URL.revokeObjectURL(objectUrl);
        await onAttachFile(croppedFile);
      });
    } else {
      onAttachFile(file);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <input
            ref={uploadFileInputRef}
            type="file"
            accept="image/*,application/pdf,text/plain"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'library')}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileChange(e, 'camera')}
          />

          <div className="fixed inset-0 z-[91] pointer-events-none">
            <button
              type="button"
              aria-label="Close composer"
              onClick={onClose}
              className="absolute inset-0 pointer-events-auto cursor-default"
            />

            <div className="absolute inset-0 px-3 sm:px-6 pt-20 sm:pt-24 pb-0 sm:pb-6 flex items-end justify-center pointer-events-none">
              <motion.section
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className={`pointer-events-auto relative overflow-hidden rounded-[24px] sm:rounded-[28px] w-full max-w-5xl overflow-y-auto bg-surface-container-highest/80 backdrop-blur-2xl border border-primary/40 shadow-[0_0_20px_rgba(161,250,255,0.35),inset_0_0_2px_rgba(161,250,255,0.45)] ${modalHeightClass}`}
              >
              <div className={`px-4 sm:px-8 ${contentPaddingClass}`}>
                <div className={`flex items-start justify-between gap-3 ${headerSlotClass}`}>
                  <div className="min-w-0 flex-1">
                    <AnimatePresence mode="wait" initial={false}>
                      {hasTypedInput ? (
                        <motion.h2
                          key="composer-title-collapsed"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                          className="font-headline text-sm sm:text-base text-on-surface/90 tracking-tight"
                        >
                          Elevate your{' '}
                          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Cognitive Architecture
                          </span>
                        </motion.h2>
                      ) : (
                        <motion.h2
                          key="composer-title-expanded"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="font-headline text-xl sm:text-3xl text-on-surface tracking-tight"
                        >
                          Elevate your{' '}
                          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Cognitive Architecture
                          </span>
                        </motion.h2>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    <span className="hidden sm:inline text-[10px] font-bold tracking-[0.16em] uppercase text-primary">
                      Neural Pulse Active
                    </span>
                    <button
                      onClick={onClose}
                      className="hidden sm:inline-flex ml-1 p-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors"
                      aria-label="Close composer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className={`relative ${textareaBlockClass}`}>
                  <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => handleTextChange(e.target.value, 'desktop')}
                    onKeyDown={handleKeyDown}
                    placeholder={imageLoading ? '' : 'Ask Zupiq to breakdown this concept...'}
                    rows={3}
                    disabled={loading}
                    className={`w-full bg-transparent border-none focus:ring-0 text-base sm:text-2xl text-on-surface placeholder:text-on-surface-variant/40 font-body resize-none outline-none pr-24 sm:pr-32 ${textareaMinHeightClass}`}
                  />
                  {showImageLoadingPlaceholder && (
                    <div className="pointer-events-none absolute left-0 top-0 pr-24 sm:pr-32 text-base sm:text-2xl font-body">
                      <SweepText
                        text="Analyzing attachment and extracting problem text..."
                        duration={1600}
                        dimColor="rgba(255,255,255,0.34)"
                        brightColor="rgba(161,250,255,0.95)"
                        style={{ color: 'rgba(255,255,255,0.34)' }}
                      />
                    </div>
                  )}

                  <div className="absolute bottom-1 right-0 flex items-center gap-2 sm:gap-4">
                    <button
                      ref={attachButtonRef}
                      type="button"
                      onClick={openAttachOptions}
                      disabled={!onAttachFile || loading || imageLoading}
                      className="text-on-surface-variant hover:text-primary transition-colors p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Attach"
                      aria-expanded={isAttachMenuOpen}
                      aria-haspopup="menu"
                    >
                      <Paperclip className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <AnimatePresence>
                      {isAttachMenuOpen && (
                        <motion.div
                          ref={attachMenuRef}
                          role="menu"
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                          className="absolute bottom-12 sm:bottom-14 right-12 sm:right-16 z-20 min-w-[176px] rounded-2xl border border-primary/25 bg-surface-container-highest/90 backdrop-blur-xl p-1.5 shadow-[0_10px_34px_rgba(0,0,0,0.28)]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={pickFromCamera}
                            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-on-surface hover:bg-white/5 transition-colors"
                          >
                            <Camera className="h-4 w-4 text-primary" />
                            <span>Take Photo</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={pickFromLibrary}
                            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-on-surface hover:bg-white/5 transition-colors"
                          >
                            <Upload className="h-4 w-4 text-secondary" />
                            <span>Upload File</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <button
                      onClick={() => triggerSubmit('button')}
                      disabled={loading || imageLoading || !value.trim()}
                      className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-on-primary shadow-[0_0_18px_rgba(161,250,255,0.4)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                      aria-label="Submit problem"
                    >
                      <ArrowRight className="w-5 h-5 sm:w-7 sm:h-7" />
                    </button>
                  </div>
                </div>

                {hasVisualTable && (
                  <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium mt-2 mb-1">
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table detected — will be rendered in Visual Logic</span>
                  </div>
                )}

                {showRenderedPreview && (
                  <div className="mb-5 sm:mb-6 rounded-2xl border border-primary/20 bg-background/35 px-3 sm:px-4 py-2.5 sm:py-3">
                    <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.12em] sm:tracking-[0.14em] uppercase text-primary mb-2">
                      Rendered Preview
                    </p>
                    <RichText className="text-xs sm:text-sm text-on-surface leading-relaxed break-words [overflow-wrap:anywhere]">
                      {value}
                    </RichText>
                  </div>
                )}

                <div className="grid grid-cols-3 items-center gap-2 sm:flex sm:flex-wrap sm:gap-3">
                  <button className="group min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-surface-container-highest/40 hover:bg-surface-container-highest transition-colors border border-outline-variant/20">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="whitespace-nowrap text-[11px] sm:text-sm font-medium text-on-surface">Deep Dive</span>
                  </button>
                  <button className="group min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-surface-container-highest/40 hover:bg-surface-container-highest transition-colors border border-outline-variant/20">
                    <Minus className="w-4 h-4 text-secondary" />
                    <span className="whitespace-nowrap text-[11px] sm:text-sm font-medium text-on-surface">Simplify</span>
                  </button>
                  <button className="group min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-surface-container-highest/40 hover:bg-surface-container-highest transition-colors border border-outline-variant/20">
                    <Network className="w-4 h-4 text-tertiary" />
                    <span className="whitespace-nowrap text-[11px] sm:text-sm font-medium text-on-surface">Visual Map</span>
                  </button>
                </div>

                {imageLoading && value.trim() && (
                  <div className="mt-3 text-xs">
                    <SweepText
                      text="Analyzing attachment and extracting problem text..."
                      duration={1600}
                      dimColor="rgba(161,250,255,0.55)"
                      brightColor="rgba(161,250,255,1)"
                      style={{ color: 'rgba(161,250,255,0.55)' }}
                    />
                  </div>
                )}

                {error && (
                  <p className="mt-3 text-sm text-error">{error}</p>
                )}
              </div>

              <div className="absolute top-0 right-0 w-36 h-36 bg-tertiary/10 blur-3xl pointer-events-none" />
              </motion.section>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
