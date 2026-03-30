import { useEffect, useRef, useState, type ChangeEvent, type TouchEvent as ReactTouchEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  X, Loader2, Sparkles, Bookmark, Zap,
  ArrowRight, Archive, ChevronLeft, RefreshCw,
  Paperclip, Camera, Upload, Table,
} from 'lucide-react';
import { MathText } from '../ui/MathText';
import { RichText } from '../ui/RichText';
import { VisualTable, type VisualTableData } from '../ui/VisualTable';
import { ImageCropModal } from '../ui/ImageCropModal';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BreakdownNode {
  id: string;
  type: 'root' | 'branch' | 'leaf';
  label: string;
  description: string;
  mathContent?: string;
  parentId?: string;
  tags?: string[];
}

export interface NodeInsight {
  simpleBreakdown: string;
  keyFormula: string;
}

export interface NodeConversationMessage {
  role: 'user' | 'model';
  content: string;
  createdAt: string;
  visualTable?: VisualTableData;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  selectedNode: BreakdownNode | null;
  breakdown: { title: string; subject: string } | null;
  nodeInsights: Record<string, NodeInsight>;
  nodeConversations: Record<string, NodeConversationMessage[]>;
  sessionVisualTable: VisualTableData | null;
  /** Pre-computed math lines for the selected node's mathContent/label */
  expressionLines: string[];
  /** Pre-computed math lines for the selected node's key formula */
  keyFormulaLines: string[];
  insightLoading: boolean;
  composerLoading: boolean;
  composerError: string | null;
  composerInput: string;
  sessionId?: string | null;
  isInsightSwipeDragging: boolean;
  imageLoading?: boolean;
  hasAttachment?: boolean;
  onComposerInputChange: (value: string) => void;
  onAskDeepDive: () => void;
  onExplainToFiveYearOld: () => void;
  onClose: () => void;
  onSyncVisualTable: () => void;
  onAttachFile?: (file: File) => void | Promise<void>;
  onClearAttachment?: () => void;
  onTouchStart: (e: ReactTouchEvent<HTMLDivElement>) => void;
  onTouchMove: (e: ReactTouchEvent<HTMLDivElement>) => void;
  onTouchEnd: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NodeInsightPanel({
  selectedNode,
  breakdown,
  nodeInsights,
  nodeConversations,
  sessionVisualTable,
  expressionLines,
  keyFormulaLines,
  insightLoading,
  composerLoading,
  composerError,
  composerInput,
  sessionId,
  isInsightSwipeDragging,
  imageLoading = false,
  hasAttachment = false,
  onComposerInputChange,
  onAskDeepDive,
  onExplainToFiveYearOld,
  onClose,
  onSyncVisualTable,
  onAttachFile,
  onClearAttachment,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: Props) {
  const isBranchSelected = !!selectedNode;
  const activeBranchConversation = selectedNode
    ? (nodeConversations[selectedNode.id] ?? [])
    : [];
  const composerPlaceholder = selectedNode
    ? `Ask Zupiq about ${selectedNode.label}...`
    : 'Select a node to start deep dive...';

  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [cropState, setCropState] = useState<{ src: string; name: string } | null>(null);

  // Close attach menu on outside click or when upload completes
  useEffect(() => {
    if (!isAttachMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (attachMenuRef.current?.contains(target)) return;
      if (attachButtonRef.current?.contains(target)) return;
      setIsAttachMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isAttachMenuOpen]);

  useEffect(() => {
    if (!imageLoading) setIsAttachMenuOpen(false);
  }, [imageLoading]);

  const openAttachOptions = () => {
    if (!onAttachFile || composerLoading || imageLoading) return;
    setIsAttachMenuOpen((prev) => !prev);
  };

  const pickFromLibrary = () => {
    if (!onAttachFile || composerLoading || imageLoading) return;
    setIsAttachMenuOpen(false);
    uploadFileInputRef.current?.click();
  };

  const pickFromCamera = () => {
    if (!onAttachFile || composerLoading || imageLoading) return;
    setIsAttachMenuOpen(false);
    cameraInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAttachFile) return;
    e.target.value = '';
    if (file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setCropState({ src: objectUrl, name: file.name });
    } else {
      onAttachFile(file);
    }
  };

  const handleCropConfirm = async (croppedFile: File) => {
    if (cropState) URL.revokeObjectURL(cropState.src);
    setCropState(null);
    if (onAttachFile) await onAttachFile(croppedFile);
  };

  const handleCropCancel = () => {
    if (cropState) URL.revokeObjectURL(cropState.src);
    setCropState(null);
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={uploadFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {cropState && (
        <ImageCropModal
          imageSrc={cropState.src}
          fileName={cropState.name}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {/* Scrollable content */}
      <div
        className="h-full overflow-y-auto p-8 pb-[200px]"
        style={{ width: 384, touchAction: 'pan-y' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h2 className="font-headline font-bold text-xl">Node Insights</h2>
            {sessionId && (
              <button
                onClick={onSyncVisualTable}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all"
                title="Sync from Cloud"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
          {selectedNode && (
            <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Empty state */}
        {!selectedNode && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest mx-auto flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-on-surface-variant" />
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Click any node on the neural map to see a detailed breakdown.
            </p>
          </div>
        )}

        {/* Selected node content */}
        {selectedNode && breakdown && (
          <motion.div
            key={selectedNode.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Node header */}
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                selectedNode.type === 'root' ? 'text-primary' :
                selectedNode.type === 'branch' ? 'text-secondary' : 'text-tertiary'
              }`}>
                {selectedNode.type === 'root' ? 'Core Problem' : selectedNode.type === 'branch' ? 'Step' : 'Concept'}
              </span>
              <h3 className="font-headline text-xl font-bold mt-1 leading-tight">
                <MathText>{selectedNode.label}</MathText>
              </h3>
              <RichText className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                {selectedNode.description}
              </RichText>
            </div>

            {/* Expression */}
            {selectedNode.mathContent && (
              <div className="bg-background/60 rounded-xl px-4 py-3 border border-outline-variant/20">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Expression</span>
                <div className="space-y-1.5">
                  {expressionLines.map((line, idx) => (
                    <MathText
                      key={`expr_${selectedNode.id}_${idx}`}
                      className="text-base text-primary leading-relaxed whitespace-pre-wrap block no-scrollbar"
                    >
                      {line}
                    </MathText>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Logic — session-level sign table */}
            {sessionVisualTable && (
              <div>
                <label className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-3 block flex items-center gap-1.5">
                  Visual Logic · {sessionVisualTable.type === 'sign_analysis' ? 'Sign Table' : 'Structured Data'}
                </label>
                <div className="rounded-2xl border border-tertiary/25 bg-surface-container overflow-hidden">
                  <VisualTable table={sessionVisualTable} />
                </div>
              </div>
            )}

            {/* Simple Breakdown */}
            <div>
              <label className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-3 block">
                Simple Breakdown
              </label>
              <div className="bg-surface-container rounded-2xl p-5 relative overflow-x-hidden overflow-y-visible min-h-[80px]">
                <div className="absolute top-0 right-0 w-24 h-24 bg-tertiary/5 rounded-full -mr-12 -mt-12 blur-xl" />
                {insightLoading && !nodeInsights[selectedNode.id] ? (
                  <div className="flex items-center gap-2 text-on-surface-variant text-sm relative">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Generating insight…</span>
                  </div>
                ) : (
                  <div className="space-y-3 relative">
                    {keyFormulaLines.length > 0 && (
                      <div className="bg-background/50 p-3 rounded-xl text-center mb-1">
                        <div className="space-y-2">
                          {keyFormulaLines.map((line, idx) => (
                            <MathText
                              key={`key_formula_${idx}`}
                              math={keyFormulaLines.length > 1}
                              className="text-sm text-primary whitespace-pre-wrap block no-scrollbar"
                            >
                              {line}
                            </MathText>
                          ))}
                        </div>
                      </div>
                    )}
                    <RichText className="text-on-surface leading-relaxed text-sm break-words [overflow-wrap:anywhere]">
                      {nodeInsights[selectedNode.id]?.simpleBreakdown ?? ''}
                    </RichText>
                  </div>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-col gap-3">
              <button className="flex items-center justify-between w-full p-4 rounded-xl bg-surface-container-highest/50 border border-outline-variant/20 hover:border-primary/50 transition-all">
                <span className="text-sm font-medium">Add to Workspace</span>
                <Bookmark className="w-4 h-4 text-primary" />
              </button>
              <button
                onClick={onExplainToFiveYearOld}
                disabled={insightLoading}
                className="flex items-center justify-between w-full p-4 rounded-xl bg-surface-container-highest/50 border border-outline-variant/20 hover:border-secondary/50 transition-all disabled:opacity-60"
              >
                <span className="text-sm font-medium">Explain to a 5-year-old</span>
                {insightLoading
                  ? <Loader2 className="w-4 h-4 text-secondary animate-spin" />
                  : <Zap className="w-4 h-4 text-secondary" />
                }
              </button>
            </div>

            {/* Deep Dive conversation */}
            <div>
              <label className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 block">
                Deep Dive
              </label>
              <div className="space-y-3">
                {activeBranchConversation.length === 0 && !composerLoading && (
                  <p className="text-xs text-on-surface-variant">
                    Use the floating composer below to ask follow-up questions.
                  </p>
                )}
                {activeBranchConversation.map((message, idx) => (
                  <div
                    key={`${selectedNode.id}_${idx}`}
                    className={`rounded-xl px-4 py-3 text-xs leading-relaxed space-y-3 ${
                      message.role === 'user'
                        ? 'bg-primary/10 border border-primary/20 text-on-surface'
                        : 'bg-transparent text-on-surface-variant'
                    }`}
                  >
                    {message.role === 'user'
                      ? <span>{message.content}</span>
                      : (
                        <>
                          <RichText className="text-xs leading-relaxed">{message.content}</RichText>
                          {message.visualTable && (
                            <div className="mt-3 rounded-xl border border-outline-variant/20 bg-surface-container overflow-hidden">
                              <VisualTable table={message.visualTable} />
                            </div>
                          )}
                        </>
                      )
                    }
                  </div>
                ))}
                {composerLoading && (
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs px-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Generating response…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Subject footer */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-on-surface-variant">Subject:</span>
              <span className="text-xs font-bold text-tertiary bg-tertiary/10 px-3 py-1 rounded-full">
                {breakdown.subject}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Floating composer */}
      <div className="absolute inset-x-4 bottom-4 z-30">
        <div className="bg-surface-container-highest/95 rounded-[24px] p-4 border border-outline-variant/20 shadow-2xl backdrop-blur-xl">
          <AnimatePresence>
            {hasAttachment && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-primary/10 rounded-xl border border-primary/20 w-fit"
              >
                <div className="flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">File attached</span>
                </div>
                <button
                  onClick={onClearAttachment}
                  className="p-0.5 hover:bg-primary/20 rounded-full transition-colors"
                  aria-label="Clear attachment"
                >
                  <X className="w-3 h-3 text-primary" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            value={composerInput}
            onChange={e => onComposerInputChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && (composerInput.trim() || hasAttachment)) {
                e.preventDefault();
                onAskDeepDive();
              }
            }}
            rows={1}
            disabled={!isBranchSelected || composerLoading || imageLoading}
            placeholder={imageLoading ? 'Attaching file…' : composerPlaceholder}
            className="w-full bg-transparent text-on-surface text-sm placeholder:text-on-surface/40 outline-none resize-none px-1 mb-2 min-h-[40px]"
          />

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-4 text-on-surface-variant/60">
              {/* Attach button */}
              <div className="relative">
                <button
                  ref={attachButtonRef}
                  type="button"
                  onClick={openAttachOptions}
                  disabled={!onAttachFile || !isBranchSelected || composerLoading || imageLoading}
                  className="hover:text-primary transition-colors disabled:opacity-30"
                  aria-label="Attach image"
                  aria-expanded={isAttachMenuOpen}
                >
                  {imageLoading
                    ? <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    : <Paperclip className="w-5 h-5" />
                  }
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
                      className="absolute bottom-10 left-0 z-40 min-w-[160px] rounded-2xl border border-primary/25 bg-surface-container-highest/95 backdrop-blur-xl p-1.5 shadow-[0_10px_34px_rgba(0,0,0,0.28)]"
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
                        <span>Upload Image</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                <Archive className="w-5 h-5" />
                <ChevronLeft className="w-3 h-3 rotate-[-90deg]" />
              </div>
              <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                <Zap className="w-5 h-5" />
                <ChevronLeft className="w-3 h-3 rotate-[-90deg]" />
              </div>
              <button
                type="button"
                onClick={() => {
                  const suffix = ' Please generate a table for this.';
                  if (!composerInput.includes(suffix)) {
                    onComposerInputChange(composerInput + suffix);
                  }
                }}
                className="hover:text-primary transition-colors"
                title="Generate Table"
              >
                <Table className="w-5 h-5" />
              </button>
              <div className="w-[1px] h-4 bg-outline-variant/30 mx-1" />
              <button type="button" className="text-primary">
                <Sparkles className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={onAskDeepDive}
              disabled={!isBranchSelected || composerLoading || imageLoading || (!composerInput.trim() && !hasAttachment)}
              className="w-10 h-10 rounded-full bg-on-surface-variant/20 text-on-surface flex items-center justify-center hover:bg-on-surface-variant/30 transition-all disabled:opacity-30"
            >
              {composerLoading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <ArrowRight className="w-5 h-5 rotate-[-90deg]" />
              }
            </button>
          </div>
        </div>

        {composerError && (
          <p className="mt-2 text-[10px] text-error px-2">{composerError}</p>
        )}
      </div>
    </>
  );
}
