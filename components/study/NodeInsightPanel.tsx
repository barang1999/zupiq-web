import { useEffect, useRef, useState, useCallback, useMemo, memo, type ChangeEvent, type DragEvent, type TouchEvent as ReactTouchEvent } from 'react';
import { toPng } from 'html-to-image';
import { listKnowledgeRecords, type KnowledgeRecord } from '../../lib/knowledge';
import { AnimatePresence, motion } from 'motion/react';
import {
  X, Loader2, Sparkles, Bookmark, Zap,
  ArrowRight, Archive, ChevronLeft, RefreshCw,
  Paperclip, Camera, Upload, Table, Maximize2, Minimize2,
  MessageSquare, FileText, Check, Copy, GitFork,
} from 'lucide-react';
import { RichText } from '../ui/RichText';
import { VisualTable, type VisualTableData } from '../ui/VisualTable';

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
  /** Math content for the selected node */
  expression: string;
  /** Key formula for the selected node from insights */
  keyFormula: string;
  insightLoading: boolean;
  composerLoading: boolean;
  composerError: string | null;
  sessionId?: string | null;
  isInsightSwipeDragging: boolean;
  imageLoading?: boolean;
  hasAttachment?: boolean;
  onAskDeepDive: (question: string, contextBlock?: string) => void;
  onExplainToFiveYearOld: () => void;
  onClose: () => void;
  onSyncVisualTable: () => void;
  onAttachFile?: (file: File) => void | Promise<void>;
  onClearAttachment?: () => void;
  onImageCropRequest?: (src: string, name: string, onConfirm: (file: File) => Promise<void>) => void;
  onExpandTable: (table: VisualTableData) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onSaveInsight?: (node: BreakdownNode) => Promise<void>;
  onSaveVisualTable?: (table: VisualTableData, label?: string) => Promise<void>;
  onSaveConversationMessage?: (question: string, answer: string) => Promise<void>;
  onBreakdownConversation?: (question: string, answer: string) => Promise<void>;
  onSaveNodeBreakdown?: (node: BreakdownNode) => Promise<void>;
  onTouchStart: (e: ReactTouchEvent<HTMLDivElement>) => void;
  onTouchMove: (e: ReactTouchEvent<HTMLDivElement>) => void;
  onTouchEnd: () => void;
}

// ─── ComposerBox ──────────────────────────────────────────────────────────────

interface ComposerBoxProps {
  isBranchSelected: boolean;
  composerLoading: boolean;
  composerError: string | null;
  imageLoading: boolean;
  hasAttachment: boolean;
  placeholder: string;
  selectedNodeId: string | undefined;
  breakdownSubject: string | undefined;
  onSend: (question: string, contextBlock?: string) => void;
  onAttachFile?: (file: File) => void | Promise<void>;
  onClearAttachment?: () => void;
  onImageCropRequest?: (src: string, name: string, onConfirm: (file: File) => Promise<void>) => void;
}

function ComposerBox({
  isBranchSelected,
  composerLoading,
  composerError,
  imageLoading,
  hasAttachment,
  placeholder,
  selectedNodeId,
  breakdownSubject,
  onSend,
  onAttachFile,
  onClearAttachment,
  onImageCropRequest,
}: ComposerBoxProps) {
  const [composerInput, setComposerInput] = useState('');
  useEffect(() => { setComposerInput(''); }, [selectedNodeId]);

  const uploadFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const contextButtonRef = useRef<HTMLButtonElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextRecords, setContextRecords] = useState<KnowledgeRecord[] | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [selectedContextIds, setSelectedContextIds] = useState<Set<string>>(new Set());

  const zapButtonRef = useRef<HTMLButtonElement>(null);
  const zapMenuRef = useRef<HTMLDivElement>(null);
  const [isZapMenuOpen, setIsZapMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!isContextMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (contextMenuRef.current?.contains(target)) return;
      if (contextButtonRef.current?.contains(target)) return;
      setIsContextMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isContextMenuOpen]);

  useEffect(() => {
    if (!isZapMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (zapMenuRef.current?.contains(target)) return;
      if (zapButtonRef.current?.contains(target)) return;
      setIsZapMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [isZapMenuOpen]);

  useEffect(() => {
    if (!isContextMenuOpen) return;
    if (contextRecords !== null) return;
    setContextLoading(true);
    listKnowledgeRecords({ subject: breakdownSubject, limit: 50 })
      .then(({ records }) => setContextRecords(records))
      .catch(() => setContextRecords([]))
      .finally(() => setContextLoading(false));
  }, [isContextMenuOpen, breakdownSubject, contextRecords]);

  const toggleContextRecord = (id: string) => {
    setSelectedContextIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const buildContextBlock = (): string | undefined => {
    if (!contextRecords || selectedContextIds.size === 0) return undefined;
    const selected = contextRecords.filter(r => selectedContextIds.has(r.id));
    if (!selected.length) return undefined;
    const lines = ['[Use the following saved knowledge as reference]:'];
    for (const rec of selected) {
      const c = rec.content;
      switch (rec.content_type) {
        case 'insight':
          lines.push(`• ${rec.title}: ${String(c.simpleBreakdown ?? '').slice(0, 250)}`);
          if (c.keyFormula) lines.push(`  Formula: ${String(c.keyFormula).slice(0, 120)}`);
          break;
        case 'visual_table':
          lines.push(`• ${rec.title}: ${rec.summary ?? ''}`);
          break;
        case 'conversation_message':
          lines.push(`• Q: ${String(c.question ?? '').slice(0, 120)}`);
          lines.push(`  A: ${String(c.answer ?? '').slice(0, 200)}`);
          break;
        case 'node_breakdown':
          lines.push(`• ${rec.title}: ${String(c.description ?? '').slice(0, 250)}`);
          if (c.mathContent) lines.push(`  Math: ${String(c.mathContent).slice(0, 120)}`);
          break;
      }
    }
    return lines.join('\n');
  };

  const handleSend = () => {
    onSend(composerInput, buildContextBlock());
    setComposerInput('');
    setSelectedContextIds(new Set());
    setIsContextMenuOpen(false);
  };

  const handleComposerDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  };

  const handleComposerDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  };

  const handleComposerDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleComposerDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (!onAttachFile || composerLoading || imageLoading || !isBranchSelected) return;
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (onImageCropRequest) {
      const objectUrl = URL.createObjectURL(file);
      onImageCropRequest(objectUrl, file.name, async (croppedFile) => {
        URL.revokeObjectURL(objectUrl);
        await onAttachFile(croppedFile);
      });
    } else {
      onAttachFile(file);
    }
  };

  const openAttachOptions = () => {
    if (!onAttachFile || composerLoading || imageLoading) return;
    setIsAttachMenuOpen(prev => !prev);
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
    <>
      <input ref={uploadFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      <div className="absolute inset-x-4 bottom-4 z-30">
        <div
          className={`relative bg-surface-container-highest/95 rounded-[24px] p-4 border shadow-2xl backdrop-blur-xl transition-colors ${
            isDragOver ? 'border-primary/60 bg-primary/5' : 'border-outline-variant/20'
          }`}
          onDragEnter={handleComposerDragEnter}
          onDragLeave={handleComposerDragLeave}
          onDragOver={handleComposerDragOver}
          onDrop={handleComposerDrop}
        >
          {isDragOver && (
            <div className="absolute inset-0 z-10 rounded-[24px] flex flex-col items-center justify-center gap-2 pointer-events-none bg-surface-container-highest/60 backdrop-blur-sm">
              <Upload className="w-6 h-6 text-primary" />
              <span className="text-xs font-medium text-primary">Drop image to attach</span>
            </div>
          )}
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
                <button onClick={onClearAttachment} className="p-0.5 hover:bg-primary/20 rounded-full transition-colors" aria-label="Clear attachment">
                  <X className="w-3 h-3 text-primary" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            value={composerInput}
            onChange={e => setComposerInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && (composerInput.trim() || hasAttachment)) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            disabled={!isBranchSelected || composerLoading || imageLoading}
            placeholder={imageLoading ? 'Attaching file…' : placeholder}
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
                      <button type="button" role="menuitem" onClick={pickFromCamera} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-on-surface hover:bg-white/5 transition-colors">
                        <Camera className="h-4 w-4 text-primary" />
                        <span>Take Photo</span>
                      </button>
                      <button type="button" role="menuitem" onClick={pickFromLibrary} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-on-surface hover:bg-white/5 transition-colors">
                        <Upload className="h-4 w-4 text-secondary" />
                        <span>Upload Image</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Knowledge context picker */}
              <div className="relative">
                <button
                  ref={contextButtonRef}
                  type="button"
                  onClick={() => setIsContextMenuOpen(prev => !prev)}
                  disabled={!isBranchSelected || composerLoading}
                  className={`flex items-center gap-1 transition-colors disabled:opacity-30 ${
                    selectedContextIds.size > 0 ? 'text-secondary' : 'hover:text-primary text-on-surface-variant/60'
                  }`}
                  title="Use saved knowledge as context"
                  aria-expanded={isContextMenuOpen}
                >
                  <Archive className="w-5 h-5" />
                  <ChevronLeft className={`w-3 h-3 transition-transform ${isContextMenuOpen ? 'rotate-90' : 'rotate-[-90deg]'}`} />
                  {selectedContextIds.size > 0 && (
                    <span className="absolute -top-1.5 -right-1 text-[9px] font-bold bg-secondary text-on-secondary rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      {selectedContextIds.size}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {isContextMenuOpen && (
                    <motion.div
                      ref={contextMenuRef}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute bottom-10 left-0 z-40 w-72 rounded-2xl border border-secondary/25 bg-surface-container-highest/97 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.32)] overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-outline-variant/15">
                        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Saved Knowledge</span>
                        {selectedContextIds.size > 0 && (
                          <button type="button" onClick={() => setSelectedContextIds(new Set())} className="text-[10px] text-on-surface-variant/60 hover:text-on-surface transition-colors">
                            Clear {selectedContextIds.size} selected
                          </button>
                        )}
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {contextLoading ? (
                          <div className="flex items-center justify-center py-8 gap-2 text-on-surface-variant text-xs">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Loading…</span>
                          </div>
                        ) : !contextRecords || contextRecords.length === 0 ? (
                          <p className="text-xs text-on-surface-variant/60 text-center py-8 px-4">
                            No saved knowledge yet. Save insights or tables to use them as context.
                          </p>
                        ) : (
                          contextRecords.map(rec => {
                            const isSelected = selectedContextIds.has(rec.id);
                            const Icon = rec.content_type === 'visual_table' ? Table
                              : rec.content_type === 'conversation_message' ? MessageSquare
                              : rec.content_type === 'node_breakdown' ? FileText
                              : Bookmark;
                            return (
                              <button
                                key={rec.id}
                                type="button"
                                onClick={() => toggleContextRecord(rec.id)}
                                className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 ${isSelected ? 'bg-secondary/10' : ''}`}
                              >
                                <div className={`mt-0.5 shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center ${isSelected ? 'bg-secondary border-secondary' : 'border-outline-variant/40'}`}>
                                  {isSelected && <Check className="w-2.5 h-2.5 text-on-secondary" />}
                                </div>
                                <Icon className={`mt-0.5 w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-secondary' : 'text-on-surface-variant/50'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium truncate ${isSelected ? 'text-on-surface' : 'text-on-surface/80'}`}>{rec.title}</p>
                                  {rec.summary && <p className="text-[10px] text-on-surface-variant/60 mt-0.5 line-clamp-2">{rec.summary}</p>}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                      {(contextRecords?.length ?? 0) > 0 && (
                        <div className="px-4 py-2 border-t border-outline-variant/15">
                          <p className="text-[10px] text-on-surface-variant/50">
                            Selected records are sent as reference context with your next message.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <button
                  ref={zapButtonRef}
                  type="button"
                  onClick={() => setIsZapMenuOpen(prev => !prev)}
                  disabled={!isBranchSelected || composerLoading}
                  className={`flex items-center gap-1 transition-colors disabled:opacity-30 ${
                    isZapMenuOpen ? 'text-primary' : 'hover:text-primary text-on-surface-variant/60'
                  }`}
                  aria-expanded={isZapMenuOpen}
                >
                  <Zap className="w-5 h-5" />
                  <ChevronLeft className={`w-3 h-3 transition-transform ${isZapMenuOpen ? 'rotate-90' : 'rotate-[-90deg]'}`} />
                </button>
                <AnimatePresence>
                  {isZapMenuOpen && (
                    <motion.div
                      ref={zapMenuRef}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute bottom-10 left-0 z-40 w-52 rounded-2xl border border-primary/25 bg-surface-container-highest/97 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.32)] overflow-hidden"
                    >
                      <div className="px-4 pt-3 pb-2 border-b border-outline-variant/15">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Quick Actions</span>
                      </div>
                      <div className="p-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const suffix = ' Please generate a table for this.';
                            if (!composerInput.includes(suffix)) setComposerInput(composerInput + suffix);
                            setIsZapMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-on-surface hover:bg-white/5 transition-colors"
                        >
                          <Table className="h-4 w-4 text-primary" />
                          <span>Generate Table</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="w-[1px] h-4 bg-outline-variant/30 mx-1" />
              <button type="button" className="text-primary">
                <Sparkles className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleSend}
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

// ─── Component ────────────────────────────────────────────────────────────────

function NodeInsightPanelInner({
  selectedNode,
  breakdown,
  nodeInsights,
  nodeConversations,
  sessionVisualTable,
  expression,
  keyFormula,
  insightLoading,
  composerLoading,
  composerError,
  sessionId,
  isInsightSwipeDragging,
  imageLoading = false,
  hasAttachment = false,
  onAskDeepDive,
  onExplainToFiveYearOld,
  onClose,
  onSyncVisualTable,
  onAttachFile,
  onClearAttachment,
  onImageCropRequest,
  onExpandTable,
  isExpanded,
  onToggleExpand,
  onSaveInsight,
  onSaveVisualTable,
  onSaveConversationMessage,
  onBreakdownConversation,
  onSaveNodeBreakdown,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: Props) {
  const isBranchSelected = !!selectedNode;
  
  const activeBranchConversation = useMemo(() => {
    return selectedNode ? (nodeConversations[selectedNode.id] ?? []) : [];
  }, [selectedNode, nodeConversations]);

  const composerPlaceholder = selectedNode
    ? `Ask Zupiq about ${selectedNode.label}...`
    : 'Select a node to start deep dive...';

  const expressionLines = useMemo(() => {
    return (expression || '').split('\n').filter(line => line.trim() !== '');
  }, [expression]);

  const keyFormulaLines = useMemo(() => {
    return (keyFormula || '').split('\n').filter(line => line.trim() !== '');
  }, [keyFormula]);

  // ── Snapshot copy ────────────────────────────────────────────────────────────
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copyingIdx, setCopyingIdx] = useState<number | null>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const snapshotMessage = async (idx: number) => {
    const node = messageRefs.current.get(idx);
    if (!node || copyingIdx !== null) return;
    setCopyingIdx(idx);

    // Read exact theme colors from CSS custom properties so the snapshot
    // matches the app even if the theme changes.
    const root = document.documentElement;
    const css = getComputedStyle(root);
    const bg        = css.getPropertyValue('--color-surface-container').trim()        || '#0f1930';
    const textColor = css.getPropertyValue('--color-on-surface').trim()               || '#dee5ff';
    const border    = css.getPropertyValue('--color-outline-variant').trim()          || '#40485d';

    const prepare = (_doc: Document, cloned: HTMLElement) => {
      // Remove all interactive chrome (buttons) so they don't appear in shot
      cloned.querySelectorAll('button, [data-snapshot-hide]').forEach(el => el.remove());

      // Apply explicit background + text so semi-transparent Tailwind classes
      // resolve against a real dark surface rather than white (the clone default)
      cloned.style.cssText += [
        `background-color: ${bg}`,
        `color: ${textColor}`,
        'padding: 20px 24px',
        'border-radius: 16px',
        `border: 1px solid ${border}`,
        'width: fit-content',
        'min-width: 320px',
        'max-width: 640px',
        'box-sizing: border-box',
        'font-family: inherit',
      ].join('; ');

      // Fix child elements whose bg is transparent so they inherit the dark surface
      // rather than falling through to a white canvas background
      cloned.querySelectorAll<HTMLElement>('*').forEach(el => {
        const computed = getComputedStyle(el);
        if (
          computed.backgroundColor === 'rgba(0, 0, 0, 0)' ||
          computed.backgroundColor === 'transparent'
        ) {
          el.style.backgroundColor = 'transparent'; // explicit inherit via parent
        }
      });
    };

    const options = {
      pixelRatio: Math.max(3, window.devicePixelRatio * 2),
      backgroundColor: bg,
      onclone: prepare,
    };

    try {
      const dataUrl = await toPng(node, options);
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard image write — download instead
      try {
        const dataUrl = await toPng(node, options);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `zupiq-message-${idx + 1}.png`;
        a.click();
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
      } catch { /* silent — user sees no feedback change */ }
    } finally {
      setCopyingIdx(null);
    }
  };

  // ── Saved-keys: localStorage cache + backend source of truth ─────────────────
  const STORAGE_KEY = 'zupiq_knowledge_saved_keys';

  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => {
    // Seed from localStorage for instant paint before backend responds
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  /**
   * Map a backend KnowledgeRecord to the UI key(s) it represents.
   * Matches the same keys used in handleSave calls below.
   */
  const recordToKeys = useCallback((
    record: { content_type: string; node_label: string | null },
    nodeId: string,
    nodeLabel: string,
  ): string[] => {
    if (record.node_label !== nodeLabel) return [];
    switch (record.content_type) {
      case 'insight':         return [`insight_${nodeId}`];
      case 'node_breakdown':  return [`node_${nodeId}`, `wb_${nodeId}`];
      case 'visual_table':    return [`vt_session`];
      case 'conversation_message': return []; // matched by content, not node — skip
      default: return [];
    }
  }, []);

  // When selected node changes, reconcile saved state with the backend
  useEffect(() => {
    if (!selectedNode || !breakdown?.subject) return;
    let cancelled = false;

    listKnowledgeRecords({ subject: breakdown.subject })
      .then(({ records }) => {
        if (cancelled) return;
        const backendKeys = new Set<string>();
        for (const rec of records) {
          for (const k of recordToKeys(rec, selectedNode.id, selectedNode.label)) {
            backendKeys.add(k);
          }
        }
        if (backendKeys.size === 0) return;
        setSavedKeys(prev => {
          const merged = new Set([...prev, ...backendKeys]);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...merged])); } catch { /* ignore */ }
          return merged;
        });
      })
      .catch(() => { /* network error — rely on localStorage cache */ });

    return () => { cancelled = true; };
  }, [selectedNode?.id, breakdown?.subject, recordToKeys]);

  const markSaving = (key: string) =>
    setSavingKeys(prev => new Set(prev).add(key));

  const markSaved = (key: string) => {
    setSavingKeys(prev => { const s = new Set(prev); s.delete(key); return s; });
    setSavedKeys(prev => {
      const next = new Set(prev).add(key);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* quota exceeded — silently skip */ }
      return next;
    });
  };

  async function handleSave(key: string, fn: () => Promise<void>) {
    if (savingKeys.has(key) || savedKeys.has(key)) return;
    markSaving(key);
    try { await fn(); markSaved(key); } catch { setSavingKeys(prev => { const s = new Set(prev); s.delete(key); return s; }); }
  }

  return (
    <>
      {/* Scrollable content */}
      <div
        className="h-full overflow-y-auto p-8 pb-[200px]"
        style={{ width: '100%', touchAction: 'pan-y' }}
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
            <div className="flex items-center gap-1">
              {onToggleExpand && (
                <button
                  onClick={onToggleExpand}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5 transition-all"
                  title={isExpanded ? 'Restore Size' : 'Expand Panel'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
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
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                  selectedNode.type === 'root' ? 'text-primary' :
                  selectedNode.type === 'branch' ? 'text-secondary' : 'text-tertiary'
                }`}>
                  {selectedNode.type === 'root' ? 'Core Problem' : selectedNode.type === 'branch' ? 'Step' : 'Concept'}
                </span>
                {onSaveNodeBreakdown && (
                  <button
                    onClick={() => handleSave(`node_${selectedNode.id}`, () => onSaveNodeBreakdown(selectedNode))}
                    className={`shrink-0 p-1 rounded-lg transition-all ${
                      savedKeys.has(`node_${selectedNode.id}`)
                        ? 'text-amber-400 bg-amber-400/15'
                        : 'text-on-surface-variant/50 hover:text-primary hover:bg-primary/10'
                    }`}
                    title={savedKeys.has(`node_${selectedNode.id}`) ? 'Saved!' : 'Save to Knowledge'}
                  >
                    {savingKeys.has(`node_${selectedNode.id}`)
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : savedKeys.has(`node_${selectedNode.id}`)
                      ? <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      : <Bookmark className="w-3.5 h-3.5" />
                    }
                  </button>
                )}
              </div>
              <div className="font-headline text-xl font-bold mt-1 leading-tight">
                <RichText>{selectedNode.label}</RichText>
              </div>
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
                    <RichText
                      key={`expr_${selectedNode.id}_${idx}`}
                      className="text-base text-primary leading-relaxed whitespace-pre-wrap block no-scrollbar"
                      discreet
                    >
                      {line}
                    </RichText>
                  ))}
                </div>
              </div>
            )}

            {/* Visual Logic — session-level sign table */}
            {sessionVisualTable && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-bold text-tertiary uppercase tracking-widest">
                    Visual Logic · {sessionVisualTable.type === 'sign_analysis' ? 'Sign Table' : 'Structured Data'}
                  </label>
                  {onSaveVisualTable && (
                    <button
                      onClick={() => handleSave(`vt_session`, () => onSaveVisualTable(sessionVisualTable, selectedNode.label))}
                      className={`p-1 rounded-lg transition-all ${
                        savedKeys.has('vt_session')
                          ? 'text-amber-400 bg-amber-400/15'
                          : 'text-on-surface-variant/50 hover:text-tertiary hover:bg-tertiary/10'
                      }`}
                      title={savedKeys.has('vt_session') ? 'Saved!' : 'Save table to Knowledge'}
                    >
                      {savingKeys.has('vt_session')
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : savedKeys.has('vt_session')
                        ? <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        : <Bookmark className="w-3.5 h-3.5" />
                      }
                    </button>
                  )}
                </div>
                <div className="rounded-2xl border border-tertiary/25 bg-surface-container overflow-hidden">
                  <VisualTable
                    table={sessionVisualTable}
                    expandable
                    onExpand={() => onExpandTable(sessionVisualTable)}
                  />
                </div>
              </div>
            )}

            {/* Simple Breakdown */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">
                  Simple Breakdown
                </label>
                {onSaveInsight && nodeInsights[selectedNode.id] && (
                  <button
                    onClick={() => handleSave(`insight_${selectedNode.id}`, () => onSaveInsight(selectedNode))}
                    className={`p-1 rounded-lg transition-all ${
                      savedKeys.has(`insight_${selectedNode.id}`)
                        ? 'text-amber-400 bg-amber-400/15'
                        : 'text-on-surface-variant/50 hover:text-secondary hover:bg-secondary/10'
                    }`}
                    title={savedKeys.has(`insight_${selectedNode.id}`) ? 'Saved!' : 'Save insight to Knowledge'}
                  >
                    {savingKeys.has(`insight_${selectedNode.id}`)
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : savedKeys.has(`insight_${selectedNode.id}`)
                      ? <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      : <Bookmark className="w-3.5 h-3.5" />
                    }
                  </button>
                )}
              </div>
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
                            <RichText
                              key={`key_formula_${idx}`}
                              className="text-sm text-primary whitespace-pre-wrap block no-scrollbar"
                              discreet
                            >
                              {line}
                            </RichText>
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
              <button
                onClick={() => onSaveNodeBreakdown && handleSave(`wb_${selectedNode.id}`, () => onSaveNodeBreakdown(selectedNode))}
                disabled={!onSaveNodeBreakdown}
                className={`flex items-center justify-between w-full p-4 rounded-xl border transition-all disabled:opacity-40 ${
                  savedKeys.has(`wb_${selectedNode.id}`)
                    ? 'bg-amber-400/10 border-amber-400/40 text-amber-400'
                    : 'bg-surface-container-highest/50 border-outline-variant/20 hover:border-primary/50'
                }`}
              >
                <span className="text-sm font-medium">
                  {savedKeys.has(`wb_${selectedNode.id}`) ? 'Saved to Knowledge' : 'Save to Knowledge'}
                </span>
                {savingKeys.has(`wb_${selectedNode.id}`)
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : savedKeys.has(`wb_${selectedNode.id}`)
                  ? <Bookmark className="w-4 h-4 fill-amber-400 text-amber-400" />
                  : <Bookmark className="w-4 h-4 text-primary" />
                }
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
                {activeBranchConversation.map((message, idx) => {
                  const prevMsg = activeBranchConversation[idx - 1];
                  const isModel = message.role === 'model';
                  const saveKey = `conv_${selectedNode.id}_${idx}`;
                  const question = isModel && prevMsg?.role === 'user' ? prevMsg.content : null;

                  return (
                    <div
                      key={`${selectedNode.id}_${idx}`}
                      ref={el => { if (el) messageRefs.current.set(idx, el); else messageRefs.current.delete(idx); }}
                      className={`rounded-xl px-4 py-3 text-xs leading-relaxed space-y-3 ${
                        message.role === 'user'
                          ? 'bg-primary/10 border border-primary/20 text-on-surface'
                          : 'bg-transparent text-on-surface-variant'
                      }`}
                    >
                      {message.role === 'user'
                        ? (
                          <div className="flex items-start justify-between gap-2 group">
                            <span className="flex-1">{message.content}</span>
                            <button
                              type="button"
                              data-snapshot-hide
                              onClick={() => snapshotMessage(idx)}
                              disabled={copyingIdx === idx}
                              className="shrink-0 p-1 rounded-lg text-on-surface-variant/30 hover:text-primary hover:bg-primary/10 transition-all opacity-0 group-hover:opacity-100 disabled:cursor-wait"
                              title="Copy as image"
                            >
                              {copyingIdx === idx
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : copiedIdx === idx
                                ? <Check className="w-3 h-3 text-primary" />
                                : <Copy className="w-3 h-3" />
                              }
                            </button>
                          </div>
                        )
                        : (
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <RichText className="text-xs leading-relaxed flex-1">{message.content}</RichText>
                              <div className="shrink-0 flex items-center gap-0.5" data-snapshot-hide>
                                <button
                                  type="button"
                                  onClick={() => snapshotMessage(idx)}
                                  disabled={copyingIdx === idx}
                                  className="p-1 rounded-lg text-on-surface-variant/30 hover:text-primary hover:bg-primary/10 transition-all disabled:cursor-wait"
                                  title="Copy as image"
                                >
                                  {copyingIdx === idx
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : copiedIdx === idx
                                    ? <Check className="w-3 h-3 text-primary" />
                                    : <Copy className="w-3 h-3" />
                                  }
                                </button>
                                {onSaveConversationMessage && question && (
                                  <button
                                    onClick={() => handleSave(saveKey, () => onSaveConversationMessage(question, message.content))}
                                    className={`p-1 rounded-lg transition-all ${
                                      savedKeys.has(saveKey)
                                        ? 'text-amber-400 bg-amber-400/15'
                                        : 'text-on-surface-variant/40 hover:text-primary hover:bg-primary/10'
                                    }`}
                                    title={savedKeys.has(saveKey) ? 'Saved!' : 'Save Q&A to Knowledge'}
                                  >
                                    {savingKeys.has(saveKey)
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : savedKeys.has(saveKey)
                                      ? <Bookmark className="w-3 h-3 fill-amber-400 text-amber-400" />
                                      : <Bookmark className="w-3 h-3" />
                                    }
                                  </button>
                                )}
                                {onBreakdownConversation && question && (
                                  <button
                                    onClick={() => onBreakdownConversation(question, message.content)}
                                    className="p-1 rounded-lg text-on-surface-variant/40 hover:text-secondary hover:bg-secondary/10 transition-all"
                                    title="Create new map from this thread"
                                  >
                                    <GitFork className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {message.visualTable && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">Visual Table</span>
                                  {onSaveVisualTable && (
                                    <button
                                      onClick={() => handleSave(`vt_conv_${saveKey}`, () => onSaveVisualTable(message.visualTable!, selectedNode.label))}
                                      className={`p-1 rounded-lg transition-all ${
                                        savedKeys.has(`vt_conv_${saveKey}`)
                                          ? 'text-amber-400 bg-amber-400/15'
                                          : 'text-on-surface-variant/40 hover:text-tertiary hover:bg-tertiary/10'
                                      }`}
                                      title={savedKeys.has(`vt_conv_${saveKey}`) ? 'Saved!' : 'Save table to Knowledge'}
                                    >
                                      {savingKeys.has(`vt_conv_${saveKey}`)
                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                        : savedKeys.has(`vt_conv_${saveKey}`)
                                        ? <Bookmark className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        : <Bookmark className="w-3 h-3" />
                                      }
                                    </button>
                                  )}
                                </div>
                                <div className="rounded-xl border border-outline-variant/20 bg-surface-container overflow-hidden">
                                  <VisualTable
                                    table={message.visualTable}
                                    expandable
                                    onExpand={() => onExpandTable(message.visualTable!)}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )
                      }
                    </div>
                  );
                })}
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

      {/* Floating composer — isolated in its own component so typing only re-renders ComposerBox */}
      <ComposerBox
        isBranchSelected={isBranchSelected}
        composerLoading={composerLoading}
        composerError={composerError}
        imageLoading={imageLoading}
        hasAttachment={hasAttachment}
        placeholder={composerPlaceholder}
        selectedNodeId={selectedNode?.id}
        breakdownSubject={breakdown?.subject}
        onSend={onAskDeepDive}
        onAttachFile={onAttachFile}
        onClearAttachment={onClearAttachment}
        onImageCropRequest={onImageCropRequest}
      />

    </>
  );
}

export const NodeInsightPanel = memo(NodeInsightPanelInner);
