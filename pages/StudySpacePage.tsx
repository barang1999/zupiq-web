import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  GitFork, History, Trophy, Network,
  Plus, X, Loader2, Sparkles,
  Bookmark, Zap,
  ZoomIn, ZoomOut, Maximize2, Copy, RefreshCw, Layers, Lock, LockOpen, Users, Activity,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';
import { ProblemComposer } from '../components/ai/ProblemComposer';
import SweepText from '../components/ui/SweepText.jsx';
import { api, ApiError } from '../lib/api';
import { RichText } from '../components/ui/RichText';
import { normalizeMathMarkdown } from '../lib/aiContent/normalizeMathMarkdown';
import { VisualTable, type VisualTableData } from '../components/ui/VisualTable';
import { Modal } from '../components/ui/Modal';
import { ActionPopover } from '../components/ui/ActionPopover';
import { NodeInsightPanel } from '../components/study/NodeInsightPanel';
import { CollabInviteModal } from '../components/study/CollabInviteModal';
import { useSessionCollaboration } from '../hooks/useSessionCollaboration';
import { supabase } from '../lib/supabase';
import { firebaseSignOut } from '../lib/firebase';
import { getSessionsCached } from '../lib/sessions';
import { MAX_FILE_SIZE_MB, validateFile } from '../utils/validators';
import {
  saveInsight,
  saveVisualTable,
  saveConversationMessage,
  saveNodeBreakdown,
} from '../lib/knowledge';
import { ImageCropModal } from '../components/ui/ImageCropModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreakdownNode {
  id: string;
  type: 'root' | 'branch' | 'leaf';
  label: string;
  description: string;
  mathContent?: string;
  parentId?: string;
  tags?: string[];
}

interface NodeInsight {
  simpleBreakdown: string;
  keyFormula: string;
}

interface NodeConversationMessage {
  role: 'user' | 'model';
  content: string;
  createdAt: string;
  visualTable?: VisualTableData;
}

interface OcrMathSegment {
  id: string;
  placeholder: string;
  token: string;
  latexRaw: string;
  latexNormalized: string;
  display: boolean;
  valid: boolean;
  issues: string[];
}

interface AnalyzeImageStructuredPayload {
  text?: string;
  plain_text?: string;
  math_segments?: OcrMathSegment[];
  warnings?: string[];
}

interface AnalyzeImageResponse {
  analysis_contract_version?: number;
  analysis?: string;
  analysis_plain_text?: string;
  analysis_math_segments?: OcrMathSegment[];
  analysis_structured?: AnalyzeImageStructuredPayload;
}

interface SignedUploadPayload {
  upload: {
    id: string;
    stored_name: string;
    mime_type: string;
    size_bytes: number;
  };
  signed_upload: {
    bucket: string;
    path: string;
    token: string;
    signedUrl: string;
  };
}

interface ProblemBreakdown {
  id?: string;
  title: string;
  subject: string;
  nodes: BreakdownNode[];
  insights: NodeInsight;
  nodeInsights?: Record<string, NodeInsight>;
  nodeConversations?: Record<string, NodeConversationMessage[]>;
  nodePositions?: Record<string, NodePos>;
}

interface NodePos { x: number; y: number }
interface BranchActionPortalState {
  nodeId: string;
  x: number;
  y: number;
}

interface RegeneratedBranchNodeResponse {
  node: {
    label?: string;
    description?: string;
    mathContent?: string;
  };
}

// ─── NodeCard ────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: BreakdownNode;
  pos: NodePos;
  offsetX: number;
  offsetY: number;
  isSelected: boolean;
  isDragging: boolean;
  isLayoutLocked: boolean;
  expandingId: string | null;
  startDrag: (e: React.MouseEvent, id: string) => void;
  handleBranchTouchStart: (e: ReactTouchEvent<HTMLDivElement>, node: BreakdownNode) => void;
  handleBranchTouchMove: (e: ReactTouchEvent<HTMLDivElement>, node: BreakdownNode) => void;
  handleBranchTouchEnd: (id: string) => void;
  handleBranchTouchCancel: (id: string) => void;
  openBranchActionPortal: (node: BreakdownNode, x: number, y: number) => void;
  selectNode: (node: BreakdownNode) => void;
  handleExpand: (node: BreakdownNode) => void;
  suppressBranchClickRef: React.RefObject<boolean>;
}

const NodeCard = memo(({
  node,
  pos,
  offsetX,
  offsetY,
  isSelected,
  isDragging,
  isLayoutLocked,
  expandingId,
  startDrag,
  handleBranchTouchStart,
  handleBranchTouchMove,
  handleBranchTouchEnd,
  handleBranchTouchCancel,
  openBranchActionPortal,
  selectNode,
  handleExpand,
  suppressBranchClickRef,
}: NodeCardProps) => {
  if (import.meta.env.DEV) {
    console.debug('[NodeCard render]', node.id, { isSelected, isDragging });
  }
  const mode = isSelected ? 'full' : 'preview';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.05 }}
      style={{
        position: 'absolute',
        left: pos.x + offsetX,
        top: pos.y + offsetY,
        transform: 'translate(-50%, -50%)',
        cursor: isLayoutLocked ? 'default' : (isDragging ? 'grabbing' : 'grab'),
        zIndex: isSelected ? 20 : isDragging ? 30 : 10,
        userSelect: 'none',
      }}
      onMouseDown={e => startDrag(e, node.id)}
      onTouchStart={e => handleBranchTouchStart(e, node)}
      onTouchMove={e => handleBranchTouchMove(e, node)}
      onTouchEnd={() => handleBranchTouchEnd(node.id)}
      onTouchCancel={() => handleBranchTouchCancel(node.id)}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        openBranchActionPortal(node, e.clientX, e.clientY);
      }}
      onClick={() => {
        if (suppressBranchClickRef.current) {
          suppressBranchClickRef.current = false;
          return;
        }
        selectNode(node);
      }}
    >
      {/* ── Root node ─── */}
      {node.type === 'root' && (
        <div
          className={`backdrop-blur-xl rounded-2xl border transition-all duration-300 ${
            isSelected
              ? 'bg-surface-container-highest/80 border-primary shadow-[0_0_35px_rgba(161,250,255,0.35)]'
              : 'bg-surface-container-highest/60 border-primary/30 hover:border-primary/60'
          } ${isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.6)]' : ''}`}
          style={{ minWidth: 280, maxWidth: 360, padding: '20px 24px' }}
        >
          <span className="text-[0.6rem] font-bold text-primary tracking-widest uppercase block mb-2">
            Primary Problem
          </span>
          <div className="bg-background/60 rounded-xl px-4 py-3 mb-3">
            <div className="space-y-1.5">
              <RichText className="text-base text-on-surface leading-relaxed whitespace-pre-wrap block no-scrollbar" discreet mode={mode}>
                {node.mathContent || node.label}
              </RichText>
            </div>
          </div>
          {node.tags && node.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {node.tags.map(tag => (
                <span key={tag} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold">{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Branch node ─── */}
      {node.type === 'branch' && (
        <div
          className={`backdrop-blur-xl rounded-xl border transition-all duration-300 ${
            isSelected
              ? 'bg-surface-container-highest/80 border-secondary/60 shadow-[0_0_25px_rgba(255,81,250,0.25)]'
              : 'bg-surface-container-highest/60 border-outline-variant/20 hover:border-secondary/40'
          } ${isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.6)]' : ''}`}
          style={{ minWidth: 220, maxWidth: 300, padding: '16px 20px' }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
              <GitFork className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <div className="text-sm font-headline font-bold text-on-surface"><RichText mode={mode}>{node.label}</RichText></div>
              <div className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed"><RichText mode={mode}>{node.description}</RichText></div>
            </div>
          </div>
          {node.mathContent && (
            <div className="bg-background/50 rounded-lg px-3 py-2">
              <div className="space-y-1.5">
                <RichText className="text-xs text-primary leading-relaxed whitespace-pre-wrap block no-scrollbar" discreet mode={mode}>
                  {node.mathContent}
                </RichText>
              </div>
            </div>
          )}
          {/* Expand button */}
          {isSelected && (
            <div
              className="mt-3 pt-3 border-t border-outline-variant/20"
              onMouseDown={e => e.stopPropagation()}
            >
              <button
                onClick={e => { e.stopPropagation(); handleExpand(node); }}
                disabled={!!expandingId}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-bold uppercase tracking-wider hover:bg-secondary/20 transition-all disabled:opacity-50"
              >
                {expandingId === node.id
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Breaking down…</>
                  : <><GitFork className="w-3 h-3" /> Breakdown further</>
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Leaf node ─── */}
      {node.type === 'leaf' && (
        <div
          className={`backdrop-blur-xl rounded-xl border transition-all duration-300 ${
            isSelected
              ? 'bg-tertiary/8 border-tertiary/50 shadow-[0_0_20px_rgba(243,255,202,0.2)]'
              : 'bg-surface-container-high/40 border-tertiary/15 hover:border-tertiary/40 hover:bg-tertiary/5'
          } ${isDragging ? 'shadow-[0_20px_60px_rgba(0,0,0,0.6)]' : ''}`}
          style={{ minWidth: 180, maxWidth: 240, padding: '12px 16px' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-tertiary shrink-0" />
            <div className="text-xs font-headline font-bold text-tertiary"><RichText mode={mode}>{node.label}</RichText></div>
          </div>
          {node.mathContent && (
            <div className="space-y-1">
              <RichText className="text-[11px] text-on-surface-variant leading-relaxed whitespace-pre-wrap block no-scrollbar" discreet mode={mode}>
                {node.mathContent}
              </RichText>
            </div>
          )}
          {node.description && (
            <div className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed"><RichText mode={mode}>{node.description}</RichText></div>
          )}
          {/* Expand button */}
          {isSelected && (
            <div
              className="mt-2 pt-2 border-t border-outline-variant/20"
              onMouseDown={e => e.stopPropagation()}
            >
              <button
                onClick={e => { e.stopPropagation(); handleExpand(node); }}
                disabled={!!expandingId}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-tertiary/10 border border-tertiary/20 text-tertiary text-[10px] font-bold uppercase tracking-wider hover:bg-tertiary/20 transition-all disabled:opacity-50"
              >
                {expandingId === node.id
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Breaking down…</>
                  : <><GitFork className="w-3 h-3" /> Breakdown further</>
                }
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
});

// ─── Layout ───────────────────────────────────────────────────────────────────

const NODE_MIN_DIST = 240; // min px between node centers
const VIEWPORT_STORAGE_KEY = 'zupiq_study_viewport_v1';
const WORKSPACE_STORAGE_KEY = 'zupiq_study_workspace_v1';
const STUDY_DEBUG_PREFIX = '[StudySpaceDebug]';
const STUDY_DEBUG_TRACE_KEY = 'zupiq_study_debug_trace_v1';
const INSIGHT_SWIPE_CLOSE_THRESHOLD = 82;
const INSIGHT_SWIPE_MAX_OFFSET = 220;
const INSIGHT_SWIPE_HORIZONTAL_RATIO = 1.12;
const BRANCH_LONG_PRESS_MS = 420;
const BRANCH_LONG_PRESS_MOVE_THRESHOLD = 12;
const QUICK_FLASHCARD_DECK_STORAGE_KEY = 'zupiq_flashcard_quick_deck_v1';
const QUICK_FLASHCARD_DEFAULT_SUBJECT_KEY = '__general__';
const studyDebugLastEventAt: Record<string, number> = {};

function normalizeQuickDeckSubjectName(subject: string | null | undefined): string {
  const normalized = (subject ?? '').trim().toLowerCase();
  return normalized || QUICK_FLASHCARD_DEFAULT_SUBJECT_KEY;
}

function getQuickDeckSubjectCacheKey(subjectId: string | null | undefined, subjectName: string | null | undefined): string {
  const normalizedId = (subjectId ?? '').trim();
  if (normalizedId) return `sid:${normalizedId}`;
  return `name:${normalizeQuickDeckSubjectName(subjectName)}`;
}

function readQuickDeckCache(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(QUICK_FLASHCARD_DECK_STORAGE_KEY);
  if (!raw) return {};

  // Backward compatibility: older versions stored a single deck id string.
  if (!raw.trim().startsWith('{')) {
    return { [QUICK_FLASHCARD_DEFAULT_SUBJECT_KEY]: raw.trim() };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      ([key, value]) => key && typeof value === 'string' && value.trim().length > 0
    ) as Array<[string, string]>;
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

function writeQuickDeckCache(cache: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUICK_FLASHCARD_DECK_STORAGE_KEY, JSON.stringify(cache));
}

function getQuickDeckIdForSubject(subjectId: string | null | undefined, subjectName: string | null | undefined): string | null {
  const key = getQuickDeckSubjectCacheKey(subjectId, subjectName);
  const cache = readQuickDeckCache();
  if (cache[key]) return cache[key];
  if ((subjectId ?? '').trim()) return null;
  const legacyNameKey = normalizeQuickDeckSubjectName(subjectName);
  return cache[legacyNameKey] ?? null;
}

function setQuickDeckIdForSubject(subjectId: string | null | undefined, subjectName: string | null | undefined, deckId: string): void {
  const key = getQuickDeckSubjectCacheKey(subjectId, subjectName);
  const cache = readQuickDeckCache();
  cache[key] = deckId;
  writeQuickDeckCache(cache);
}

function clearQuickDeckIdForSubject(subjectId: string | null | undefined, subjectName: string | null | undefined): void {
  const key = getQuickDeckSubjectCacheKey(subjectId, subjectName);
  const cache = readQuickDeckCache();
  const legacyNameKey = (subjectId ?? '').trim() ? '' : normalizeQuickDeckSubjectName(subjectName);
  if (!(key in cache) && (!legacyNameKey || !(legacyNameKey in cache))) return;
  delete cache[key];
  if (legacyNameKey) delete cache[legacyNameKey];
  writeQuickDeckCache(cache);
}

function debugStudy(event: string, payload?: Record<string, unknown>) {
  const stamp = new Date().toISOString();
  const now = Date.now();
  // Reduce noise from high-frequency events while keeping meaningful traces.
  if (event === 'viewport:persist') {
    const last = studyDebugLastEventAt[event] ?? 0;
    if (now - last < 1200) return;
    studyDebugLastEventAt[event] = now;
  }

  const entry: StudyDebugEntry = { stamp, event, payload: payload ?? null };

  const shouldLogToConsole = typeof window !== 'undefined'
    && Boolean((window as unknown as { __ZUPIQ_STUDY_DEBUG_CONSOLE__?: boolean }).__ZUPIQ_STUDY_DEBUG_CONSOLE__);
  if (shouldLogToConsole) {
    if (payload) {
      console.log(STUDY_DEBUG_PREFIX, stamp, event, payload);
    } else {
      console.log(STUDY_DEBUG_PREFIX, stamp, event);
    }
  }

  if (typeof window === 'undefined') return;
  try {
    const existingRaw = localStorage.getItem(STUDY_DEBUG_TRACE_KEY);
    const existing = existingRaw ? (JSON.parse(existingRaw) as StudyDebugEntry[]) : [];
    existing.push(entry);
    if (existing.length > 250) {
      existing.splice(0, existing.length - 250);
    }
    localStorage.setItem(STUDY_DEBUG_TRACE_KEY, JSON.stringify(existing));
    (window as unknown as { __ZUPIQ_STUDY_DEBUG__?: unknown }).__ZUPIQ_STUDY_DEBUG__ = existing;
    window.dispatchEvent(new CustomEvent('zupiq-study-debug', { detail: entry }));
  } catch {
    // Ignore storage failures
  }
}

interface StoredWorkspaceSnapshot {
  breakdown: ProblemBreakdown;
  sessionId: string | null;
  positions: Record<string, NodePos>;
  nodeInsights: Record<string, NodeInsight>;
  nodeConversations: Record<string, NodeConversationMessage[]>;
  selectedNodeId: string | null;
  activeTab: string;
  visualTable: VisualTableData | null;
}

interface StudyDebugEntry {
  stamp: string;
  event: string;
  payload: Record<string, unknown> | null;
}

interface StoredViewportState {
  scale: number;
  scrollLeft: number;
  scrollTop: number;
  anchorX?: number;
  anchorY?: number;
}

function detectSignTableInText(text: string): boolean {
  if (!text) return false;
  // Explicit LaTeX tabular environment
  const hasTabular = /\\begin\{tabular\}/.test(text);
  // Sign table column header pattern: M ... Δ/Delta ... P ... S (in any OCR form)
  const hasColumnHeaders = /\bM\b.{0,30}(?:Δ|\\Delta|\$\\Delta\$).{0,30}\bP\b.{0,30}\bS\b/i.test(text);
  // Discriminant + Vieta (traditional detection)
  const hasDiscriminant = /[ΔД]['′]?|\\Delta['′]?|\bdiscriminant\b/i.test(text);
  const hasVietaPS = /\bP\s*[=:]|\bS\s*[=:]|\bVieta\b|\bproduct.*root|sum.*root/i.test(text);
  return hasTabular || hasColumnHeaders || (hasDiscriminant && hasVietaPS);
}

function sanitizeBreakdownPayload(raw: ProblemBreakdown | null | undefined): ProblemBreakdown {
  const fallbackInsights: NodeInsight = { simpleBreakdown: '', keyFormula: '' };
  const safeNodes = Array.isArray(raw?.nodes) ? raw!.nodes.map((node) => ({
    ...node,
    label: stripLatexTabular(node.label ?? ''),
    description: stripLatexTabular(node.description ?? ''),
    mathContent: node.mathContent ? stripLatexTabular(node.mathContent) : node.mathContent,
  })) : [];
  return {
    id: raw?.id,
    title: (raw?.title ?? 'Untitled Session').toString(),
    subject: (raw?.subject ?? 'General').toString(),
    nodes: safeNodes,
    insights: raw?.insights ?? fallbackInsights,
    nodeInsights: raw?.nodeInsights ?? {},
    nodeConversations: raw?.nodeConversations ?? {},
    nodePositions: raw?.nodePositions ?? {},
  };
}

function debugClip(text: string, max = 120): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}...`;
}

function isPageMathDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const flag = (window as unknown as { __ZUPIQ_PAGE_DEBUG__?: boolean }).__ZUPIQ_PAGE_DEBUG__;
  if (typeof flag === 'boolean') return flag;
  return new URLSearchParams(window.location.search).get('debugPageMath') === '1';
}

function toCodePoints(input: string): string[] {
  return Array.from(input).map((ch) => `U+${ch.codePointAt(0)!.toString(16).toUpperCase()}`);
}

function extractInlineMathTokens(text: string): string[] {
  if (!text) return [];
  return text.match(/\$[\s\S]+?\$/g) ?? [];
}

function extractEscapedInlineMathTokens(text: string): string[] {
  if (!text) return [];
  return text.match(/\\\$[\s\S]+?\\\$/g) ?? [];
}

function extractTemperaturePatterns(text: string): string[] {
  if (!text) return [];
  return text.match(/\b\d+(?:\.\d+)?\s*(?:°\s*C|°C|\^\s*\\circ\s*C|\\circ\s*C)\b/gi) ?? [];
}

function logPageMathDebug(source: string, text: string, meta: Record<string, unknown> = {}) {
  const raw = text ?? '';
  if (!isPageMathDebugEnabled()) return;
  if (!/[$\\^_]|°|\\circ/.test(raw)) return;

  const tokens = extractInlineMathTokens(raw).slice(0, 20);
  const escapedTokens = extractEscapedInlineMathTokens(raw).slice(0, 20);
  const temperatures = extractTemperaturePatterns(raw).slice(0, 20);
  const focusTokens = tokens.filter((t) => /\\circ|°|\^|_/.test(t));

  console.log('[StudySpace math debug]', {
    source,
    textLength: raw.length,
    preview: debugClip(raw, 240),
    tokenCount: tokens.length,
    escapedTokenCount: escapedTokens.length,
    temperaturePatternCount: temperatures.length,
    focusTokenCount: focusTokens.length,
    tokens: tokens.slice(0, 8),
    escapedTokens: escapedTokens.slice(0, 8),
    temperatures: temperatures.slice(0, 8),
    tokenDetails: focusTokens.slice(0, 8).map((token) => ({
      token,
      inner: token.slice(1, -1),
      hasKhmer: /[\u1780-\u17FF]/.test(token),
      hasCircCommand: token.includes('\\circ'),
      hasDoubleBackslashCirc: /\\\\circ/.test(token),
      hasDegreeSymbol: token.includes('°'),
      hasCaret: token.includes('^'),
      hasUnderscore: token.includes('_'),
      backslashCount: (token.match(/\\/g) ?? []).length,
      normalizedCandidate: token.slice(1, -1).replace(/\\\\(?=[a-zA-Z])/g, '\\'),
      codePoints: toCodePoints(token.slice(1, -1)),
    })),
    ...meta,
  });
}

function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\(([\s\S]+?)\\\)/g, (_match, expr: string) => `$${expr.trim()}$`)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_match, expr: string) => `$$${expr.trim()}$$`);
}

function normalizeUnicodeSuperscripts(text: string): string {
  return text
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5');
}

function normalizeCopiedLatexExpression(expression: string): string {
  return normalizeUnicodeSuperscripts(expression ?? '')
    .replace(/\\ext\{/g, '\\text{')
    .replace(/(^|[^\\])ext\{/g, '$1\\text{')
    .replace(/\\\s+text\{/g, '\\text{')
    .replace(/\t+/g, ' ')
    .replace(/\{\s+/g, '{')
    .replace(/\s+\}/g, '}')
    .replace(/\s+\\text\{/g, ' \\text{')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function extractMathExpressionsForCopy(input: string): string[] {
  const normalized = normalizeMathDelimiters(input ?? '');
  const tokens = normalized.match(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g) ?? [];
  const expressions = tokens
    .map((token) => token.startsWith('$$') ? token.slice(2, -2) : token.slice(1, -1))
    .map(normalizeCopiedLatexExpression)
    .filter(Boolean);
  return Array.from(new Set(expressions));
}

function buildCopyMathPayload(raw: string): string {
  const expressions = extractMathExpressionsForCopy(raw);
  if (expressions.length > 0) return expressions.join('\n');
  return normalizeCopiedLatexExpression(raw);
}

/** Remove LaTeX tabular/array/matrix environments — rendered separately by SignTable */
function stripLatexTabular(text: string): string {
  if (!text) return text;
  return text
    .replace(/\\begin\{tabular\}[\s\S]*?\\end\{tabular\}/g, '')
    .replace(/\\begin\{array\}[\s\S]*?\\end\{array\}/g, '')
    .replace(/\\hline\b/g, '')
    .replace(/(?:^|(?<=\s))(?:&\s*)+(?=\n|$)/gm, '')  // orphaned & separators
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const NON_MATH_UNICODE_RE = /[\u0600-\u06FF\u0900-\u097F\u1780-\u17FF\u4E00-\u9FFF\uAC00-\uD7AF\u3040-\u30FF]/;

function looksLikeMathPreviewExpression(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/\\[a-zA-Z]+/.test(t) && /[=+\-*/^_]/.test(t)) return true;
  if (/^[A-Za-zα-ωΑ-Ω][A-Za-z0-9_]*\s*=\s*[A-Za-z0-9α-ωΑ-Ω_+\-*/^()]+$/.test(t)) return true;
  return false;
}

function wrapInlineMathCandidates(text: string): string {
  const mathDebug = isPageMathDebugEnabled();
  const mathDelimited = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  const segments = text.split(mathDelimited);

  const result = segments.map((segment) => {
    if (!segment) return segment;
    if (segment.startsWith('$')) return segment;

    let next = segment;

    // e.g. 20 \text{ m/s}, g = 9.8 \text{ m/s}^2
    next = next.replace(
      /(?:\b[A-Za-zα-ωΑ-Ω](?:_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?\s*=\s*)?\d+(?:\.\d+)?\s*(?:\\(?:text|mathrm)\{[^{}]+\}|\\(?:frac|sqrt)\{[^{}]+\}(?:\{[^{}]+\})?|\\(?:times|div|cdot|pm|approx|leq|geq|neq|circ|degree))(?:\s*(?:\^\{[^{}]+\}|\^[0-9A-Za-z]+|_\{[^{}]+\}|_[0-9A-Za-z]+))*/g,
      (match) => `$${match.trim()}$`
    );

    // e.g. g = 9.8 m/s^2
    next = next.replace(
      /\b[A-Za-zα-ωΑ-Ω](?:_[a-zA-Z0-9]+|\^[a-zA-Z0-9]+)?\s*=\s*\d+(?:\.\d+)?\s*[A-Za-z]+(?:\/[A-Za-z]+)+(?:\^\d+)?\b/g,
      (match) => `$${match.trim()}$`
    );

    // e.g. F_x = F \cos\theta, a = b \times c, F_{acting} = F_g F_{air} = 0, x_1 = 0, \{ F_g \}
    // Matches optional assignment, followed by optional terms, and at least one LaTeX command or subscript/superscript.
    next = next.replace(
      /(?:\b[A-Za-zα-ωΑ-Ω](?:_[a-zA-Z0-9α-ωΑ-Ω{}]+|\^[a-zA-Z0-9α-ωΑ-Ω{}]+)?\s*=\s*)?[A-Za-z0-9α-ωΑ-Ω\s.+\-*/^_{}()|[\]<>\\≤≥≈≠±×÷\u200b]*(\\[a-zA-Z]+|\\[{}]|\\\\|[_^]\{[^{}]+\}|[_^][a-zA-Z0-9α-ωΑ-Ω])(?:\s*[=+\-*/^_{}()|[\]<>\\≤≥≈≠±×÷\u200b]*\s*[A-Za-z0-9α-ωΑ-Ω{}\\\u200b]+)*/g,
      (match) => {
        const trimmed = match.trim();
        if (mathDebug) {
          console.debug('[StudySpace math debug] autoWrap candidate', { match, trimmed });
        }
        // If it looks like a legitimate math fragment (has a command or sub/sup and some structure)
        if (trimmed.length > 2 && (/\\[a-zA-Z{}]+|\\\\/.test(trimmed) || /[_^]/.test(trimmed))) {
          // Additional protection: never wrap if it contains non-math Unicode (Khmer, etc.)
          if (NON_MATH_UNICODE_RE.test(trimmed)) {
            return match;
          }
          return `$${trimmed}$`;
        }
        return match;
      }
    );

    return next;
  }).join('');

  if (mathDebug && result !== text) {
    console.debug('[StudySpace math debug] wrapInlineMathCandidates changed text', {
      original: text,
      wrapped: result
    });
  }
  return result;
}

function looksLikeStandaloneMathLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.includes('$')) return false;

  const hasLatexCommand = /(\\[a-zA-Z]+|\\[{}]|\\\\)/.test(t);
  const hasSubSup = /[_^]/.test(t);
  const hasMathOperator = /[=<>+\-*/]|[≤≥≈≠±×÷]/.test(t);
  const hasDigits = /\d/.test(t);
  const hasSentenceEnding = /[.!?។៕]\s*$/.test(t);
  const wordCount = (t.match(/[A-Za-z\u0600-\u06FF\u0900-\u097F\u1780-\u17FF\u4E00-\u9FFF\uAC00-\uD7AF\u3040-\u30FF]+/g) ?? []).length;

  if (hasSentenceEnding && wordCount > 8) return false;
  if ((hasLatexCommand || hasSubSup) && (hasMathOperator || hasDigits) && wordCount <= 14) return true;
  if (hasMathOperator && wordCount <= 4) return true; // Catch simple equations like a = m
  if (hasMathOperator && hasDigits && wordCount <= 8) return true;
  return false;
}

function normalizeImageProblemText(input: string): string {
  if (!input) return '';
  const normalized = wrapInlineMathCandidates(normalizeMathDelimiters(
    stripLatexTabular(input)
      .replace(/\u200b/g, '')
      .replace(/\r\n?/g, '\n')
      // Normalize double-backslash as newline for better AI output handling
      .replace(/\\\\(?![a-zA-Z])/g, '\n')
      .replace(/\\+n(?![a-zA-Z])/g, '\n')
      .replace(/\\+r(?![a-zA-Z])/g, ' ')
      .replace(/\\+t(?![a-zA-Z])/g, ' ')
      .replace(/\\+b(?![a-zA-Z])/g, ' ')
      .replace(/\\+f(?![a-zA-Z])/g, ' ')
      .replace(/\\{2,}(?=[A-Za-z])/g, '\\')

      .replace(/\\\$/g, '$')
      .replace(/[−–]/g, '-')
      .replace(/[×]/g, '\\times ')
      .replace(/[÷]/g, '\\div ')
      .replace(/,\s*,/g, ',')
      .replace(/([A-Za-z])\s*\/\s*([A-Za-z])/g, '$1/$2')
      .replace(/\^(\s+)(\d+)/g, '^$2')
      .trim()
  ));

  const lines = normalized.split('\n').map((line) => {
    const trimmed = normalizeUnicodeSuperscripts(line.trim());
    if (!trimmed) return line;
    if (looksLikeStandaloneMathLine(trimmed)) return `$${trimmed}$`;
    return line.replace(line.trim(), trimmed);
  });

  return lines.join('\n').replace(/[ \t]{2,}/g, ' ').trim();
}

function buildDelimitedMathFromSegment(segment: OcrMathSegment): string {
  const latex = (segment.latexNormalized || segment.latexRaw || '').trim();
  if (!latex) return '';
  return segment.display ? `$$${latex}$$` : `$${latex}$`;
}

function rebuildFromStructuredOcr(
  plainText: string,
  mathSegments: OcrMathSegment[]
): string {
  if (!plainText) return '';
  if (!Array.isArray(mathSegments) || mathSegments.length === 0) return plainText;

  let out = plainText;
  mathSegments.forEach((segment, idx) => {
    const placeholder = segment.placeholder || `[[EQ_${idx + 1}]]`;
    const token = buildDelimitedMathFromSegment(segment);
    if (!token) return;
    out = out.split(placeholder).join(token);
  });
  return out;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function resolveApiBaseHost(): string | null {
  if (typeof window === 'undefined') return null;
  const rawBase = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  if (!rawBase) return null;
  try {
    return new URL(rawBase, window.location.origin).hostname;
  } catch {
    return null;
  }
}

function resolveApiBaseUrl(): URL | null {
  if (typeof window === 'undefined') return null;
  const rawBase = (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
  if (!rawBase) return null;
  try {
    return new URL(rawBase, window.location.origin);
  } catch {
    return null;
  }
}

function resolveAttachmentErrorMessage(
  err: unknown,
  context: {
    stage: string;
    traceId: string;
  }
): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const apiUrl = resolveApiBaseUrl();
  const apiOrigin = apiUrl?.origin ?? 'API';
  const stageLabel = context.stage || 'unknown-stage';

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return `Core issue: device is offline (stage: ${stageLabel}).`;
  }
  if (
    typeof window !== 'undefined'
    && window.location.protocol === 'https:'
    && apiUrl?.protocol === 'http:'
  ) {
    return `Core issue: mixed-content blocked (HTTPS site cannot call HTTP API ${apiOrigin}).`;
  }
  if (
    typeof window !== 'undefined'
    && apiUrl
    && isLoopbackHost(apiUrl.hostname)
    && !isLoopbackHost(window.location.hostname)
  ) {
    return `Core issue: API points to localhost (${apiOrigin}) from non-localhost client.`;
  }

  if (err instanceof ApiError) {
    const apiData = (err.data ?? {}) as Record<string, unknown>;
    const backendMessage = [
      err.message,
      typeof apiData.error === 'string' ? apiData.error : '',
    ].join(' ').toLowerCase();
    if (
      err.status === 403 &&
      (backendMessage.includes('daily deep dive token limit reached')
        || backendMessage.includes('token limit reached'))
    ) {
      return 'You have reached today’s Deep Dive token limit. Your balance resets tomorrow, or you can upgrade your plan for a higher limit.';
    }

    if (err.status > 0) {
      return 'We could not process this request right now. Please try again in a moment.';
    }

    const data = apiData;
    const method = typeof data.method === 'string' ? data.method : 'REQUEST';
    const endpoint = typeof data.endpoint === 'string' ? data.endpoint : '';
    if (/failed to fetch/i.test(raw) || /networkerror/i.test(raw) || /load failed/i.test(raw)) {
      return `Core issue: browser blocked ${method} ${endpoint} before server response (stage: ${stageLabel}). Likely CORS preflight, TLS certificate, DNS, or edge firewall rule.`;
    }
  }

  if (stageLabel.startsWith('storage-upload')) {
    return `Core issue: direct object-storage upload failed before backend analysis (stage: ${stageLabel}). Check Supabase storage CORS/policy and network access to storage domain.`;
  }

  if (/failed to fetch/i.test(raw) || /networkerror/i.test(raw)) {
    return `Core issue: request failed before server response (stage: ${stageLabel}). Check CORS/SSL/DNS/connectivity to ${apiOrigin}.`;
  }
  if (/cors/i.test(raw)) {
    return `Core issue: CORS blocked request to ${apiOrigin} (stage: ${stageLabel}).`;
  }
  if (/mixed content/i.test(raw)) {
    return `Core issue: mixed-content blocked (stage: ${stageLabel}).`;
  }
  return `Core issue: ${raw || 'unknown error'} (stage: ${stageLabel}, trace: ${context.traceId}).`;
}

function resolveQuotaAwareErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? (err.message || fallback) : fallback;

  const data = (err.data ?? {}) as Record<string, unknown>;
  const backendMessage = [
    err.message,
    typeof data.error === 'string' ? data.error : '',
  ].join(' ').toLowerCase();

  if (
    err.status === 403 &&
    (backendMessage.includes('daily deep dive token limit reached')
      || backendMessage.includes('token limit reached'))
  ) {
    return 'Daily Deep Dive token limit reached. Your balance resets tomorrow, or upgrade your plan for a higher quota.';
  }

  return err.message || fallback;
}

function nextAttachmentTraceId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `att_${Date.now().toString(36)}_${rand}`;
}

async function uploadToSignedStorageUrl(signedUrl: string, file: File): Promise<Response> {
  const form = new FormData();
  form.append("cacheControl", "3600");
  // Supabase signed upload endpoint expects an unnamed file field in multipart form data.
  form.append("", file);
  return fetch(signedUrl, {
    method: "PUT",
    headers: {
      "x-upsert": "false",
    },
    body: form,
  });
}

function computeInitialPositions(nodes: BreakdownNode[], canvasW: number, canvasH: number): Record<string, NodePos> {
  const pos: Record<string, NodePos> = {};
  const roots    = nodes.filter(n => n.type === 'root');
  const branches = nodes.filter(n => n.type === 'branch');
  const leaves   = nodes.filter(n => n.type === 'leaf');

  roots.forEach(n => {
    pos[n.id] = { x: canvasW / 2, y: canvasH - 140 };
  });

  branches.forEach((n, i) => {
    pos[n.id] = {
      x: (canvasW / (branches.length + 1)) * (i + 1),
      y: canvasH * 0.45,
    };
  });

  // Group leaves by parent
  const leafGroups = new Map<string, BreakdownNode[]>();
  leaves.forEach(n => {
    if (!n.parentId) return;
    leafGroups.set(n.parentId, [...(leafGroups.get(n.parentId) ?? []), n]);
  });

  leafGroups.forEach((group, parentId) => {
    const px = pos[parentId]?.x ?? canvasW / 2;
    group.forEach((n, i) => {
      const offset = (i - (group.length - 1) / 2) * 240;
      pos[n.id] = { x: Math.max(140, Math.min(canvasW - 140, px + offset)), y: canvasH * 0.16 };
    });
  });

  return pos;
}

function resolveCollisions(pos: Record<string, NodePos>, draggedId?: string): Record<string, NodePos> {
  const result = { ...pos };
  const ids = Object.keys(result);
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = result[ids[i]], b = result[ids[j]];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < NODE_MIN_DIST) {
          const push = (NODE_MIN_DIST - dist) / 2;
          const nx = dx / dist, ny = dy / dist;
          if (ids[i] !== draggedId) result[ids[i]] = { x: a.x - nx * push, y: a.y - ny * push };
          if (ids[j] !== draggedId) result[ids[j]] = { x: b.x + nx * push, y: b.y + ny * push };
        }
      }
    }
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  user: any;
  onNavigateHistory?: () => void;
  onNavigateFlashcards?: () => void;
  onNavigateKnowledgeMap?: () => void;
  onNavigateAchievements?: () => void;
  onNavigateQuantumPrism?: () => void;
  onNavigateQuiz?: (prefill?: {
    subjectId?: string | null;
    subjectName?: string | null;
    specificArea?: string | null;
  }) => void;
  onNavigatePlan?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
  initialBreakdown?: ProblemBreakdown | null;
  onBreakdownConsumed?: () => void;
}

/**
 * Scans a chat response string for ```json ... ``` blocks that contain a
 * { text, visualTable } payload the backend failed to extract (e.g. when the
 * AI prefixed the block with conversational text, causing stripCodeFence to
 * miss it, or when the first block was truncated at MAX_TOKENS and the second
 * block from the continuation is the complete one).
 *
 * Returns the cleaned text (JSON blocks replaced by their "text" field, or
 * removed) and the last successfully parsed visualTable, if any.
 */
function extractChatJsonBlocks(raw: string): {
  cleanText: string;
  visualTable: VisualTableData | null;
} {
  const BLOCK_RE = /```json\s*([\s\S]*?)```/g;
  const matches = [...raw.matchAll(BLOCK_RE)];
  if (matches.length === 0) return { cleanText: raw, visualTable: null };

  let bestTable: VisualTableData | null = null;

  // Walk backwards — the last complete JSON block (from continuation) is most reliable
  for (const match of [...matches].reverse()) {
    try {
      const parsed = JSON.parse(match[1].trim()) as { text?: string; visualTable?: VisualTableData };
      if (
        parsed?.visualTable?.type &&
        ['sign_analysis', 'generic'].includes(parsed.visualTable.type) &&
        Array.isArray((parsed.visualTable as { rows?: unknown }).rows)
      ) {
        bestTable = parsed.visualTable;
        break;
      }
    } catch {
      // truncated or invalid JSON — try the next block
    }
  }

  // Rebuild the text by replacing each JSON block with its "text" field (if
  // present) or removing it entirely
  let cleanText = raw;
  // Process matches right-to-left to preserve string indices
  for (const match of [...matches].reverse()) {
    let replacement = '';
    try {
      const parsed = JSON.parse(match[1].trim()) as { text?: string };
      if (parsed?.text?.trim()) replacement = parsed.text.trim();
    } catch {
      // drop the block
    }
    cleanText =
      cleanText.slice(0, match.index!) +
      replacement +
      cleanText.slice(match.index! + match[0].length);
  }

  return { cleanText: cleanText.trim(), visualTable: bestTable };
}

function parseJsonSafe<T>(input: any): T | null {
  if (!input) return null;
  if (typeof input !== 'string') return input as T;
  try {
    const firstPass = JSON.parse(input);
    if (typeof firstPass === 'string' && (firstPass.startsWith('{') || firstPass.startsWith('['))) {
      return JSON.parse(firstPass) as T;
    }
    return firstPass as T;
  } catch {
    return null;
  }
}

export function StudySpacePage({
  user,
  onNavigateHistory,
  onNavigateFlashcards,
  onNavigateKnowledgeMap,
  onNavigateAchievements,
  onNavigateQuantumPrism,
  onNavigateQuiz,
  onNavigatePlan,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
  initialBreakdown,
  onBreakdownConsumed,
}: Props) {
  const [breakdown,      setBreakdown]      = useState<ProblemBreakdown | null>(null);
  const [sessionId,      setSessionId]      = useState<string | null>(null);
  const [sessionSubjectId, setSessionSubjectId] = useState<string | null>(null);
  const [positions,      setPositions]      = useState<Record<string, NodePos>>({});
  const [selectedNode,   setSelectedNode]   = useState<BreakdownNode | null>(null);
  const [draggingId,     setDraggingId]     = useState<string | null>(null);
  const [isLayoutLocked, setIsLayoutLocked] = useState(() => {
    try { return localStorage.getItem('studyspace_layout_locked') === 'true'; } catch { return false; }
  });
  const [expandingId,    setExpandingId]    = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [composerLoading, setComposerLoading] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [actionToast,    setActionToast]    = useState<string | null>(null);
  const [branchActionBusy, setBranchActionBusy] = useState<'regenerate' | 'flashcard' | null>(null);
  const [nodeInsights,   setNodeInsights]   = useState<Record<string, NodeInsight>>({});
  const [nodeConversations, setNodeConversations] = useState<Record<string, NodeConversationMessage[]>>({});
  const [showInput,      setShowInput]      = useState(false);
  const [problemInput,   setProblemInput]   = useState('');
  const [isImageAnalyzing, setIsImageAnalyzing] = useState(false);
  const [isInsightPanelOpen, setIsInsightPanelOpen] = useState(false);
  const [insightPanelWidth, setInsightPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('studyspace_insight_width');
      return saved ? Number(saved) : 384;
    } catch { return 384; }
  });
  const [isResizing, setIsResizing] = useState(false);
  const [branchActionPortal, setBranchActionPortal] = useState<BranchActionPortalState | null>(null);
  const [insightSwipeOffsetX, setInsightSwipeOffsetX] = useState(0);
  const [isInsightSwipeDragging, setIsInsightSwipeDragging] = useState(false);
  const [isDeepDiveImageAnalyzing, setIsDeepDiveImageAnalyzing] = useState(false);
  const [deepDiveUploadId, setDeepDiveUploadId] = useState<string | null>(null);
  const [hasDeepDiveAttachment, setHasDeepDiveAttachment] = useState(false);
  const [activeTab,      setActiveTab]      = useState<string>('map');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [scale,          setScale]          = useState(1);
  const [isMobile,       setIsMobile]       = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [showDebugOverlay] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debugStudy') === '1'
  );
  const [debugEntries, setDebugEntries] = useState<StudyDebugEntry[]>([]);
  const [sessionVisualTable, setSessionVisualTable] = useState<VisualTableData | null>(null);
  const [expandedTable, setExpandedTable] = useState<VisualTableData | null>(null);
  const [ocrDetectedSignTable, setOcrDetectedSignTable] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [globalCropState, setGlobalCropState] = useState<{
    src: string;
    name: string;
    onConfirm: (file: File) => Promise<void>;
  } | null>(null);

  const handleImageCropRequest = useCallback((
    src: string,
    name: string,
    onConfirm: (file: File) => Promise<void>,
  ) => {
    setGlobalCropState({ src, name, onConfirm });
  }, []);
  const lastOcrInsertRef = useRef<string | null>(null);
  const lastOcrUploadIdRef = useRef<string | null>(null);
  const deepDiveLastOcrInsertRef = useRef<string | null>(null);
  const branchLongPressTimerRef = useRef<number | null>(null);
  const branchTouchGestureRef = useRef<{ nodeId: string; startX: number; startY: number } | null>(null);
  const suppressBranchClickRef = useRef(false);
  // True once this user has manually dragged a node — prevents remote position sync from overriding their layout.
  const hasLocalPositionEditsRef = useRef(false);

  useEffect(() => {
    const win = window as unknown as {
      __dumpStudyDebugTrace__?: () => unknown;
      __clearStudyDebugTrace__?: () => void;
    };
    win.__dumpStudyDebugTrace__ = () => {
      const raw = localStorage.getItem(STUDY_DEBUG_TRACE_KEY);
      return raw ? JSON.parse(raw) : [];
    };
    win.__clearStudyDebugTrace__ = () => {
      localStorage.removeItem(STUDY_DEBUG_TRACE_KEY);
    };

    debugStudy('mount', {
      hasInitialBreakdown: !!initialBreakdown,
      userId: user?.id ?? null,
      traceKey: STUDY_DEBUG_TRACE_KEY,
      dumpFn: 'window.__dumpStudyDebugTrace__()',
      clearFn: 'window.__clearStudyDebugTrace__()',
    });
    return () => {
      debugStudy('unmount');
    };
  }, [initialBreakdown, user?.id]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (!showDebugOverlay) return;
    try {
      const raw = localStorage.getItem(STUDY_DEBUG_TRACE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StudyDebugEntry[];
      setDebugEntries(parsed.slice(-80));
    } catch {
      // Ignore malformed debug payload
    }
  }, [showDebugOverlay]);

  useEffect(() => {
    if (!showDebugOverlay) return;
    const onDebugEvent = (e: Event) => {
      const detail = (e as CustomEvent<StudyDebugEntry>).detail;
      if (!detail) return;
      setDebugEntries(prev => [...prev, detail].slice(-80));
    };
    window.addEventListener('zupiq-study-debug', onDebugEvent);
    return () => window.removeEventListener('zupiq-study-debug', onDebugEvent);
  }, [showDebugOverlay]);

  const dragState  = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pendingViewportRestoreRef = useRef<{
    left: number;
    top: number;
    anchorX?: number;
    anchorY?: number;
    tries: number;
  } | null>(null);
  const isRestoringViewportRef = useRef(false);
  const viewportReadyRef = useRef(false);
  const scaleRef   = useRef(1);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { viewportReadyRef.current = isViewportReady; }, [isViewportReady]);

  const persistViewport = useCallback(() => {
    if (!viewportReadyRef.current) return;
    if (isRestoringViewportRef.current) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const s = Math.max(0.25, Math.min(2, scaleRef.current || 1));
    const payload: StoredViewportState = {
      scale: scaleRef.current,
      scrollLeft: scroller.scrollLeft,
      scrollTop: scroller.scrollTop,
      anchorX: (scroller.scrollLeft + scroller.clientWidth / 2) / s,
      anchorY: (scroller.scrollTop + scroller.clientHeight / 2) / s,
    };
    localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify(payload));
    debugStudy('viewport:persist', {
      scale: payload.scale,
      scrollLeft: Math.round(payload.scrollLeft),
      scrollTop: Math.round(payload.scrollTop),
      anchorX: Math.round(payload.anchorX ?? 0),
      anchorY: Math.round(payload.anchorY ?? 0),
    });
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VIEWPORT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredViewportState>;
      const nextScale = Number(parsed.scale);
      if (Number.isFinite(nextScale)) {
        setScale(Math.max(0.25, Math.min(2, nextScale)));
      }
      const left = Number(parsed.scrollLeft);
      const top = Number(parsed.scrollTop);
      const anchorX = Number(parsed.anchorX);
      const anchorY = Number(parsed.anchorY);
      if (Number.isFinite(left) && Number.isFinite(top)) {
        pendingViewportRestoreRef.current = {
          left,
          top,
          anchorX: Number.isFinite(anchorX) ? anchorX : undefined,
          anchorY: Number.isFinite(anchorY) ? anchorY : undefined,
          tries: 0,
        };
      }
      debugStudy('viewport:restore:found', {
        scale: nextScale,
        scrollLeft: left,
        scrollTop: top,
        anchorX,
        anchorY,
      });
    } catch {
      // Ignore malformed local storage payload
      debugStudy('viewport:restore:malformed');
    } finally {
      // Enable viewport persistence only after initial restore pass has run.
      setIsViewportReady(true);
    }
  }, []);

  // Non-passive wheel listener on window so preventDefault() fires before the browser
  // processes pinch-to-zoom. Only intercepts when the pointer is over the canvas scroller.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (!scrollerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 0.05 : e.deltaY * 0.005;
      setScale(s => Math.min(2, Math.max(0.25, s - delta)));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  // Pinch-to-zoom for touch devices
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  useEffect(() => {
    const getDistance = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      if (!scrollerRef.current?.contains(e.target as Node)) return;
      pinchRef.current = { dist: getDistance(e.touches), scale: scaleRef.current };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchRef.current) return;
      if (!scrollerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      const ratio = getDistance(e.touches) / pinchRef.current.dist;
      setScale(Math.min(2, Math.max(0.25, pinchRef.current.scale * ratio)));
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchRef.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Swipe-to-close for the node insight panel
  const insightSwipeStartX = useRef<number | null>(null);
  const insightSwipeStartY = useRef<number | null>(null);
  const insightSwipeLatestDx = useRef(0);

  const resetInsightSwipe = useCallback(() => {
    setIsInsightSwipeDragging(false);
    setInsightSwipeOffsetX(0);
    insightSwipeStartX.current = null;
    insightSwipeStartY.current = null;
    insightSwipeLatestDx.current = 0;
  }, []);

  const closeInsightPanel = useCallback(() => {
    setIsInsightPanelOpen(false);
    resetInsightSwipe();
  }, [resetInsightSwipe]);

  const selectNode = useCallback((node: BreakdownNode) => {
    setSelectedNode(node);
    setIsInsightPanelOpen(true);
    setBranchActionPortal(null);
  }, []);

  const showActionToast = useCallback((message: string) => {
    setActionToast(message);
  }, []);

  // ─── Collaboration ─────────────────────────────────────────────────────────

  // Soft-sync session state from the server without disrupting the local workspace.
  // Called when a collaborator's session_updated SSE event arrives.
  const applyRemoteSessionUpdate = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { session } = await api.get<{ session: any }>(`/api/sessions/${sessionId}`);

      const remoteBd = parseJsonSafe<ProblemBreakdown>(session.breakdown_json);
      if (!remoteBd) {
        console.error('[LiveSync] breakdown_json could not be parsed — aborting sync');
        return;
      }
      remoteBd.id = session.id;
      const sanitized = sanitizeBreakdownPayload(remoteBd);


      // Update breakdown content (nodes, title, subject, problem) from remote.
      setBreakdown(sanitized);

      // Sync node-level data that lives in breakdown_json but is kept in separate state.
      setNodeInsights(sanitized.nodeInsights ?? {});
      setNodeConversations(sanitized.nodeConversations ?? {});

      // Merge positions: keep existing positions, compute for brand-new nodes, drop deleted ones.
      setPositions(prev => {
        const remoteNodes = sanitized.nodes ?? [];
        const remoteIdSet = new Set(remoteNodes.map(n => n.id));

        const kept: Record<string, NodePos> = {};
        for (const [id, pos] of Object.entries(prev)) {
          if (remoteIdSet.has(id)) kept[id] = pos;
        }

        const newNodes = remoteNodes.filter(n => !prev[n.id]);
        if (newNodes.length > 0) {
          // Prefer the positions the owner computed (saved in nodePositions) so new
          // nodes appear next to their parent, not in a full default layout.
          const remotePositions = sanitized.nodePositions ?? {};
          for (const n of newNodes) {
            if (remotePositions[n.id]) {
              kept[n.id] = remotePositions[n.id];
            } else {
              // Fallback: place near parent if known, otherwise use default layout.
              const parentPos = n.parentId ? (kept[n.parentId] ?? remotePositions[n.parentId]) : null;
              if (parentPos) {
                kept[n.id] = { x: parentPos.x, y: parentPos.y - 200 };
              } else {
                const brs = remoteNodes.filter(r => r.type === 'branch').length;
                const lvs = remoteNodes.filter(r => r.type === 'leaf').length;
                const w = Math.max(1000, (brs + 1) * 320);
                const h = lvs > 0 ? 700 : 540;
                const computed = computeInitialPositions(remoteNodes, w, h);
                if (computed[n.id]) kept[n.id] = computed[n.id];
              }
            }
          }
          return resolveCollisions(kept);
        }
        return kept;
      });

      // Keep selectedNode only if it still exists in the remote breakdown.
      setSelectedNode(prev => {
        if (!prev) return null;
        return sanitized.nodes?.find(n => n.id === prev.id) ?? null;
      });

      // Sync visual table.
      const vt = session.visual_table_json
        ? parseJsonSafe<VisualTableData>(session.visual_table_json)
        : null;
      setSessionVisualTable(vt ?? null);
    } catch (err) {
      console.error('[LiveSync] applyRemoteSessionUpdate failed', err);
    }
  }, [sessionId]);

  const {
    members: collabMembers,
    connected: collabConnected,
    isLoadingMembers: collabLoadingMembers,
    activity: collabActivity,
    isLoadingActivity: collabLoadingActivity,
    createInviteLink,
    removeMember: removeCollabMember,
  } = useSessionCollaboration(sessionId, {
    onSessionUpdated: (updatedBy) => {
      const isOwnUpdate = updatedBy === (user?.id ?? user?.sub ?? '');
      if (!isOwnUpdate) {
        void applyRemoteSessionUpdate();
        showActionToast('Session updated by a collaborator.');
      }
    },
    onMemberJoined:  () => showActionToast('A collaborator joined the session.'),
    onMemberLeft:    () => showActionToast('A collaborator left the session.'),
    onReconnected:   () => void applyRemoteSessionUpdate(),
  });

  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLastViewedAt(null);
      return;
    }
    try {
      const saved = localStorage.getItem(`zupiq_last_viewed_activity_${sessionId}`);
      setLastViewedAt(saved);
    } catch {
      // Ignore storage failures
    }
  }, [sessionId]);

  useEffect(() => {
    if (isActivityDrawerOpen && collabActivity.length > 0 && sessionId) {
      const latest = collabActivity[0].created_at; // collabActivity is sorted DESC
      setLastViewedAt(latest);
      try {
        localStorage.setItem(`zupiq_last_viewed_activity_${sessionId}`, latest);
      } catch {
        // Ignore storage failures
      }
    }
  }, [isActivityDrawerOpen, collabActivity, sessionId]);

  const unseenActivityCount = useMemo(() => {
    if (!sessionId) return 0;
    if (!lastViewedAt) return collabActivity.length;
    const lastViewedTime = new Date(lastViewedAt).getTime();
    return collabActivity.filter((a) => new Date(a.created_at).getTime() > lastViewedTime).length;
  }, [collabActivity, lastViewedAt, sessionId]);

  const openBranchActionPortal = useCallback((node: BreakdownNode, clientX: number, clientY: number) => {
    if (typeof window === 'undefined') return;
    const portalWidth = 248;
    const portalHeight = 244;
    const x = Math.max(12, Math.min(window.innerWidth - portalWidth - 12, clientX));
    const y = Math.max(12, Math.min(window.innerHeight - portalHeight - 12, clientY));
    setSelectedNode(node);
    setBranchActionPortal({ nodeId: node.id, x, y });
  }, []);

  const clearBranchLongPressTimer = useCallback(() => {
    if (branchLongPressTimerRef.current !== null) {
      window.clearTimeout(branchLongPressTimerRef.current);
      branchLongPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearBranchLongPressTimer();
  }, [clearBranchLongPressTimer]);

  useEffect(() => {
    if (!actionToast) return;
    const timer = window.setTimeout(() => setActionToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [actionToast]);

  useEffect(() => {
    if (selectedNode && isInsightPanelOpen) return;
    resetInsightSwipe();
  }, [isInsightPanelOpen, resetInsightSwipe, selectedNode]);

  const handlePanelResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleToggleInsightExpand = useCallback(() => {
    setInsightPanelWidth(prev => {
      const next = prev > 400 ? 384 : 640;
      try { localStorage.setItem('studyspace_insight_width', next.toString()); } catch {}
      return next;
    });
  }, []);

  const isInsightExpanded = insightPanelWidth > 400;

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: MouseEvent) => {
      // Panel is on the right, resizing from the left edge.
      // So panel width = window.innerWidth - e.clientX
      const newWidth = Math.max(320, Math.min(window.innerWidth - 100, window.innerWidth - e.clientX));
      setInsightPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      try {
        localStorage.setItem('studyspace_insight_width', insightPanelWidth.toString());
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing, insightPanelWidth]);

  const handleInsightSwipeStart = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    if (!selectedNode || !isInsightPanelOpen) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    insightSwipeStartX.current = touch.clientX;
    insightSwipeStartY.current = touch.clientY;
    insightSwipeLatestDx.current = 0;
    setIsInsightSwipeDragging(false);
  }, [isInsightPanelOpen, selectedNode]);

  const handleInsightSwipeMove = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    if (insightSwipeStartX.current === null || insightSwipeStartY.current === null) return;
    const touch = e.touches?.[0];
    if (!touch) return;

    const dx = touch.clientX - insightSwipeStartX.current;
    const dy = touch.clientY - insightSwipeStartY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (dx <= 0) {
      if (isInsightSwipeDragging) {
        insightSwipeLatestDx.current = 0;
        setInsightSwipeOffsetX(0);
      }
      return;
    }

    if (!isInsightSwipeDragging && absDx < 8) return;
    if (!isInsightSwipeDragging && absDx <= absDy * INSIGHT_SWIPE_HORIZONTAL_RATIO) return;

    insightSwipeLatestDx.current = dx;
    setInsightSwipeOffsetX(Math.min(INSIGHT_SWIPE_MAX_OFFSET, dx));
    if (!isInsightSwipeDragging) setIsInsightSwipeDragging(true);
  }, [isInsightSwipeDragging]);

  const handleInsightSwipeEnd = useCallback(() => {
    const shouldClose = insightSwipeLatestDx.current > INSIGHT_SWIPE_CLOSE_THRESHOLD;
    resetInsightSwipe();
    if (shouldClose) {
      setIsInsightPanelOpen(false);
    }
  }, [resetInsightSwipe]);

  // Always-current refs used by save callbacks to avoid stale closures
  const positionsRef      = useRef<Record<string, NodePos>>({});
  const nodeInsightsRef   = useRef<Record<string, NodeInsight>>({});
  const nodeConversationsRef = useRef<Record<string, NodeConversationMessage[]>>({});
  const breakdownRef      = useRef<ProblemBreakdown | null>(null);
  const sessionIdRef      = useRef<string | null>(null);
  const insightRequestInFlightRef = useRef<Set<string>>(new Set());
  const insightRetryNotBeforeRef = useRef<Record<string, number>>({});
  const persistBreakdownTimeoutRef = useRef<number | null>(null);
  const pendingBreakdownPersistRef = useRef<{ sessionId: string; payload: string } | null>(null);
  const persistBreakdownRetryCountRef = useRef(0);
  useEffect(() => { positionsRef.current      = positions; },      [positions]);
  useEffect(() => { nodeInsightsRef.current   = nodeInsights; },   [nodeInsights]);
  useEffect(() => { nodeConversationsRef.current = nodeConversations; }, [nodeConversations]);
  useEffect(() => { breakdownRef.current      = breakdown; },      [breakdown]);
  useEffect(() => { sessionIdRef.current      = sessionId; },      [sessionId]);

  const flushPendingBreakdownPersist = useCallback(async () => {
    const pending = pendingBreakdownPersistRef.current;
    if (!pending) return;

    pendingBreakdownPersistRef.current = null;
    try {
      await api.put(`/api/sessions/${pending.sessionId}`, {
        breakdown_json: pending.payload,
      });
      persistBreakdownRetryCountRef.current = 0;
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        pendingBreakdownPersistRef.current = pending;
        const retryDelayMs = Math.min(60_000, 5_000 * 2 ** persistBreakdownRetryCountRef.current);
        persistBreakdownRetryCountRef.current = Math.min(persistBreakdownRetryCountRef.current + 1, 6);
        if (persistBreakdownTimeoutRef.current === null) {
          persistBreakdownTimeoutRef.current = window.setTimeout(() => {
            persistBreakdownTimeoutRef.current = null;
            void flushPendingBreakdownPersist();
          }, retryDelayMs);
        }
        return;
      }
      persistBreakdownRetryCountRef.current = 0;
      console.error('Failed to persist insight:', err);
    }
  }, []);

  const scheduleBreakdownPersist = useCallback((nextSessionId: string, payload: string) => {
    pendingBreakdownPersistRef.current = { sessionId: nextSessionId, payload };
    if (persistBreakdownTimeoutRef.current !== null) return;
    persistBreakdownTimeoutRef.current = window.setTimeout(() => {
      persistBreakdownTimeoutRef.current = null;
      void flushPendingBreakdownPersist();
    }, 700);
  }, [flushPendingBreakdownPersist]);

  useEffect(() => {
    return () => {
      if (persistBreakdownTimeoutRef.current !== null) {
        window.clearTimeout(persistBreakdownTimeoutRef.current);
      }
    };
  }, []);

  const hydrateBreakdown = useCallback((bd: ProblemBreakdown, vt: VisualTableData | null = null) => {
    const normalized = sanitizeBreakdownPayload(bd);
    const brs = normalized.nodes.filter((n: BreakdownNode) => n.type === 'branch').length;
    const lvs = normalized.nodes.filter((n: BreakdownNode) => n.type === 'leaf').length;
    const w = Math.max(1000, (brs + 1) * 320);
    const h = lvs > 0 ? 700 : 540;
    const hasSavedPositions = Object.keys(normalized.nodePositions ?? {}).length > 0;
    const restoredPositions = hasSavedPositions
      ? normalized.nodePositions!
      : resolveCollisions(computeInitialPositions(normalized.nodes, w, h));
    setBreakdown(normalized);
    setSessionId(normalized.id ?? null);
    setSessionSubjectId(null);
    setSessionVisualTable(vt);
    setNodeInsights(normalized.nodeInsights ?? {});
    setNodeConversations(normalized.nodeConversations ?? {});
    setPositions(restoredPositions);
    const rootNode = normalized.nodes.find((n: BreakdownNode) => n.type === 'root') ?? null;
    setSelectedNode(rootNode);
    setIsInsightPanelOpen(false);
    setShowInput(false);
    if (normalized.id) localStorage.setItem('zupiq_lastSessionId', normalized.id);
    debugStudy('hydrate:breakdown', {
      source: 'session-or-initial',
      sessionId: normalized.id ?? null,
      nodes: normalized.nodes.length,
      hasSavedPositions,
    });
  }, []);

  const hydrateWorkspaceSnapshot = useCallback((snapshot: StoredWorkspaceSnapshot) => {
    const bd = sanitizeBreakdownPayload(snapshot.breakdown);
    setBreakdown(bd);
    setSessionId(snapshot.sessionId ?? bd.id ?? null);
    
    // If visualTable is missing (undefined), it's a legacy snapshot. 
    // We set it to null but trigger a background sync if we have a sessionId.
    const hasTableKey = 'visualTable' in snapshot;
    setSessionVisualTable(snapshot.visualTable ?? null);
    
    if (!hasTableKey && snapshot.sessionId) {
      console.debug('[VisualTable] Legacy snapshot detected, fetching from cloud...');
      api.get<{ session: any }>(`/api/sessions/${snapshot.sessionId}`)
        .then(({ session }) => {
          if (session?.visual_table_json) {
            const vt = parseJsonSafe<VisualTableData>(session.visual_table_json);
            if (vt) {
              setSessionVisualTable(vt);
              console.debug('[VisualTable] Restored from cloud.');
            }
          }
        })
        .catch(() => {});
    }

    setNodeInsights(snapshot.nodeInsights ?? {});
    setNodeConversations(snapshot.nodeConversations ?? {});

    const restoredPositions = Object.keys(snapshot.positions ?? {}).length > 0
      ? snapshot.positions
      : (bd.nodePositions ?? {});
    setPositions(restoredPositions);

    const selected = snapshot.selectedNodeId
      ? bd.nodes.find((n: BreakdownNode) => n.id === snapshot.selectedNodeId) ?? null
      : null;
    const focusedNode = selected ?? bd.nodes.find((n: BreakdownNode) => n.type === 'root') ?? null;
    setSelectedNode(focusedNode);
    setIsInsightPanelOpen(false);
    setActiveTab(snapshot.activeTab || 'map');
    setShowInput(false);
    if (bd.id) localStorage.setItem('zupiq_lastSessionId', bd.id);
    debugStudy('hydrate:workspaceSnapshot', {
      sessionId: snapshot.sessionId ?? bd.id ?? null,
      nodes: bd.nodes.length,
      selectedNodeId: snapshot.selectedNodeId,
      activeTab: snapshot.activeTab,
      positions: Object.keys(restoredPositions).length,
    });
  }, []);

  const persistBreakdownData = useCallback((
    nextNodeInsights: Record<string, NodeInsight>,
    nextNodeConversations: Record<string, NodeConversationMessage[]>
  ) => {
    const activeSessionId = sessionIdRef.current;
    const activeBreakdown = breakdownRef.current;
    if (!activeSessionId || !activeBreakdown) return;
    const updatedBreakdown: ProblemBreakdown = {
      ...activeBreakdown,
      nodeInsights: nextNodeInsights,
      nodeConversations: nextNodeConversations,
      nodePositions: positionsRef.current,
    };
    setBreakdown(updatedBreakdown);
    scheduleBreakdownPersist(activeSessionId, JSON.stringify(updatedBreakdown));
  }, [scheduleBreakdownPersist]);

  const persistNodeInsights = useCallback((nextNodeInsights: Record<string, NodeInsight>) => {
    persistBreakdownData(nextNodeInsights, nodeConversationsRef.current);
  }, [persistBreakdownData]);

  const persistNodeConversations = useCallback((nextNodeConversations: Record<string, NodeConversationMessage[]>) => {
    persistBreakdownData(nodeInsightsRef.current, nextNodeConversations);
  }, [persistBreakdownData]);

  // Load from navigation payload first; then local snapshot; otherwise restore most recent saved session.
  // Use a ref so clearing initialBreakdown after consuming it doesn't re-trigger the fallback.
  const initialBreakdownRef = useRef(initialBreakdown);
  useEffect(() => {
    const bd = initialBreakdownRef.current;
    if (bd) {
      debugStudy('boot:usingInitialBreakdown', {
        sessionId: bd.id ?? null,
        nodes: bd.nodes?.length ?? 0,
      });
      hydrateBreakdown(bd);
      onBreakdownConsumed?.();
      return;
    }

    try {
      const rawSnapshot = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (rawSnapshot) {
        const snapshot = JSON.parse(rawSnapshot) as StoredWorkspaceSnapshot;
        if (snapshot?.breakdown?.nodes?.length) {
          debugStudy('boot:usingWorkspaceSnapshot', {
            sessionId: snapshot.sessionId ?? snapshot.breakdown.id ?? null,
            nodes: snapshot.breakdown.nodes.length,
          });
          hydrateWorkspaceSnapshot(snapshot);
          return;
        }
      }
      debugStudy('boot:workspaceSnapshot:notFound');
    } catch {
      // Ignore malformed local storage payload
      debugStudy('boot:workspaceSnapshot:malformed');
    }

    let cancelled = false;
    debugStudy('boot:fetchSessions:start');
    getSessionsCached()
      .then((sessions) => {
        if (cancelled || !sessions?.length) return;
        const lastId = localStorage.getItem('zupiq_lastSessionId');
        const target = (lastId && sessions.find(s => s.id === lastId)) || sessions[0];
        setSessionSubjectId(target?.subject_id ?? null);
        debugStudy('boot:fetchSessions:success', {
          sessionsCount: sessions.length,
          preferredSessionId: lastId,
          targetSessionId: target?.id ?? null,
        });
        try {
          const parsed = parseJsonSafe<ProblemBreakdown>(target.breakdown_json);
          if (parsed) {
            parsed.id = target.id;
            const vt = target.visual_table_json ? parseJsonSafe<VisualTableData>(target.visual_table_json) : null;
            hydrateBreakdown(parsed, vt);
          }
        } catch {
          // Ignore malformed historical payloads
          debugStudy('boot:fetchSessions:targetMalformed', {
            targetSessionId: target?.id ?? null,
          });
        }
      })
      .catch(() => {
        // Non-blocking restore failure
        debugStudy('boot:fetchSessions:error');
      });

    return () => {
      cancelled = true;
      debugStudy('boot:fetchSessions:cancelled');
    };
  }, [hydrateBreakdown, hydrateWorkspaceSnapshot, onBreakdownConsumed]);

  // Canvas dimensions + offsets derived from all node positions.
  // offsetX/offsetY shift every node so nothing ever goes above/left of a safe padding zone.
  const { canvasW, canvasH, offsetX, offsetY } = useMemo(() => {
    const posValues = Object.values(positions);
    if (!posValues.length) return { canvasW: 1000, canvasH: 600, offsetX: 0, offsetY: 0 };
    const xs = posValues.map(p => p.x);
    const ys = posValues.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const PAD = 160;
    const PAD_RIGHT = 600;
    const ox = minX < PAD ? PAD - minX : 0;
    const oy = minY < PAD ? PAD - minY : 0;
    return {
      canvasW: Math.max(1000, maxX + ox + PAD_RIGHT),
      canvasH: Math.max(600,  maxY + oy + PAD),
      offsetX: ox,
      offsetY: oy,
    };
  }, [positions]);

  // Restore viewport only after canvas dimensions are ready.
  useEffect(() => {
    if (!isViewportReady) return;
    const pending = pendingViewportRestoreRef.current;
    const scroller = scrollerRef.current;
    if (!pending || !scroller) return;
    let cancelled = false;
    let raf = 0;
    isRestoringViewportRef.current = true;

    const applyAttempt = () => {
      if (cancelled) return;
      const currentScale = Math.max(0.25, Math.min(2, scaleRef.current || 1));
      const targetLeftRaw = Number.isFinite(pending.anchorX ?? NaN)
        ? (pending.anchorX! * currentScale) - (scroller.clientWidth / 2)
        : pending.left;
      const targetTopRaw = Number.isFinite(pending.anchorY ?? NaN)
        ? (pending.anchorY! * currentScale) - (scroller.clientHeight / 2)
        : pending.top;

      const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const maxTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      const targetLeft = Math.max(0, Math.min(maxLeft, targetLeftRaw));
      const targetTop = Math.max(0, Math.min(maxTop, targetTopRaw));

      scroller.scrollLeft = targetLeft;
      scroller.scrollTop = targetTop;

      raf = window.requestAnimationFrame(() => {
        if (cancelled) return;
        const actualLeft = scroller.scrollLeft;
        const actualTop = scroller.scrollTop;
        const leftDelta = Math.abs(actualLeft - targetLeft);
        const topDelta = Math.abs(actualTop - targetTop);

        debugStudy('viewport:restore:attempt', {
          try: pending.tries + 1,
          targetLeft: Math.round(targetLeft),
          targetTop: Math.round(targetTop),
          actualLeft: Math.round(actualLeft),
          actualTop: Math.round(actualTop),
          maxLeft: Math.round(maxLeft),
          maxTop: Math.round(maxTop),
        });

        if ((leftDelta > 2 || topDelta > 2) && pending.tries < 10) {
          pending.tries += 1;
          applyAttempt();
          return;
        }

        pendingViewportRestoreRef.current = null;
        isRestoringViewportRef.current = false;
        debugStudy('viewport:restore:applied', {
          scrollLeft: Math.round(actualLeft),
          scrollTop: Math.round(actualTop),
        });
        // Persist the restored viewport immediately so future mounts use this value.
        persistViewport();
      });
    };

    applyAttempt();
    return () => {
      cancelled = true;
      isRestoringViewportRef.current = false;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isViewportReady, canvasW, canvasH, breakdown?.id, selectedNode?.id, persistViewport]);

  // Persist viewport while user pans.
  useEffect(() => {
    if (!isViewportReady) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let raf: number | null = null;
    const onScroll = () => {
      if (raf !== null) return;
      raf = window.requestAnimationFrame(() => {
        raf = null;
        if (isRestoringViewportRef.current) return;
        persistViewport();
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      if (raf !== null) window.cancelAnimationFrame(raf);
    };
  }, [isViewportReady, persistViewport]);

  // Persist viewport when zoom changes and before page/tab is backgrounded.
  useEffect(() => {
    if (!isViewportReady) return;
    persistViewport();
  }, [isViewportReady, scale, persistViewport]);

  useEffect(() => {
    const onBeforeUnload = () => persistViewport();
    const onVisibilityChange = () => {
      if (document.hidden) persistViewport();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [persistViewport]);

  // Persist full study workspace so page switches don't reset the current session state.
  useEffect(() => {
    if (!breakdown || Object.keys(positions).length === 0) return;
    const timer = window.setTimeout(() => {
      const payload: StoredWorkspaceSnapshot = {
        breakdown: {
          ...breakdown,
          nodeInsights,
          nodeConversations,
          nodePositions: positions,
        },
        sessionId,
        positions,
        nodeInsights,
        nodeConversations,
        selectedNodeId: selectedNode?.id ?? null,
        activeTab,
        visualTable: sessionVisualTable,
      };
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(payload));
      debugStudy('workspace:persist', {
        sessionId: payload.sessionId,
        nodes: payload.breakdown.nodes.length,
        positions: Object.keys(payload.positions).length,
        selectedNodeId: payload.selectedNodeId,
        activeTab: payload.activeTab,
        hasVisualTable: !!payload.visualTable,
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [
    breakdown,
    sessionId,
    positions,
    nodeInsights,
    nodeConversations,
    selectedNode?.id,
    activeTab,
    sessionVisualTable,
  ]);

  // Global drag handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current) return;
      const { id, startX, startY, origX, origY } = dragState.current;
      const s = scaleRef.current;
      setPositions(prev => ({
        ...prev,
        [id]: { x: origX + (e.clientX - startX) / s, y: origY + (e.clientY - startY) / s },
      }));
    };
    const onUp = () => {
      if (!dragState.current) return;
      const id = dragState.current.id;
      dragState.current = null;
      setDraggingId(null);
      setPositions(prev => resolveCollisions(prev, id));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragState.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const { id, startX, startY, origX, origY } = dragState.current;
      const s = scaleRef.current;
      setPositions(prev => ({
        ...prev,
        [id]: { x: origX + (touch.clientX - startX) / s, y: origY + (touch.clientY - startY) / s },
      }));
    };
    const onTouchEnd = () => {
      if (!dragState.current) return;
      const id = dragState.current.id;
      dragState.current = null;
      setDraggingId(null);
      setPositions(prev => resolveCollisions(prev, id));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Save positions to the session whenever a drag ends
  const wasDraggingRef = useRef(false);
  useEffect(() => {
    if (draggingId !== null) { wasDraggingRef.current = true; return; }
    if (!wasDraggingRef.current) return;
    wasDraggingRef.current = false;
    hasLocalPositionEditsRef.current = true;
    const bd  = breakdownRef.current;
    const sid = sessionIdRef.current;
    if (!sid || !bd) return;
    api.put(`/api/sessions/${sid}`, {
      breakdown_json: JSON.stringify({
        ...bd,
        nodeInsights:       nodeInsightsRef.current,
        nodeConversations:  nodeConversationsRef.current,
        nodePositions:      positionsRef.current,
      }),
    }).catch(() => {});
  }, [draggingId]);

  // Auto-fetch insight for the selected node (cached by node id)
  useEffect(() => {
    if (!selectedNode || !breakdown) return;
    const requestedNodeId = selectedNode.id;
    if (insightRequestInFlightRef.current.has(requestedNodeId)) return;
    const notBefore = insightRetryNotBeforeRef.current[requestedNodeId] ?? 0;
    if (Date.now() < notBefore) return;

    const cachedInsight = nodeInsights[selectedNode.id];
    const cachedSimple = (cachedInsight?.simpleBreakdown ?? '').trim();
    const descriptionFallbackStale = !!cachedInsight
      && cachedSimple.length > 0
      && cachedSimple === (selectedNode.description ?? '').trim();
    if (cachedInsight && !descriptionFallbackStale) return; // already cached
    console.debug('[NodeInsight FE] auto request', {
      nodeId: selectedNode.id,
      nodeType: selectedNode.type,
      subject: breakdown.subject,
      level: 'standard',
      nodeLabelLength: (selectedNode.label ?? '').length,
      nodeMathLength: (selectedNode.mathContent || selectedNode.label || '').length,
      nodeLabelPreview: debugClip(selectedNode.label ?? ''),
    });
    insightRequestInFlightRef.current.add(requestedNodeId);
    setInsightLoading(true);
    const rootNode = breakdown.nodes.find(n => n.type === 'root');
    const parentProblem = [rootNode?.label, rootNode?.mathContent].filter(Boolean).join(' ');
    api.post<{ insight: NodeInsight }>('/api/ai/node-insight', {
      nodeLabel: selectedNode.label,
      nodeDescription: selectedNode.description,
      nodeMathContent: selectedNode.mathContent || selectedNode.label,
      subject: breakdown.subject,
      parentProblem: parentProblem || undefined,
    })
      .then(({ insight }) => {
        console.debug('[NodeInsight FE] auto response', {
          nodeId: selectedNode.id,
          simpleBreakdownLength: (insight?.simpleBreakdown ?? '').length,
          keyFormulaLength: (insight?.keyFormula ?? '').length,
          preview: debugClip(insight?.simpleBreakdown ?? ''),
        });
        logPageMathDebug('node-insight:auto:simpleBreakdown', insight?.simpleBreakdown ?? '', {
          nodeId: selectedNode.id,
          level: 'standard',
        });
        logPageMathDebug('node-insight:auto:keyFormula', insight?.keyFormula ?? '', {
          nodeId: selectedNode.id,
          level: 'standard',
        });
        insightRetryNotBeforeRef.current[requestedNodeId] = 0;
        
        const normalizedInsight = {
          ...insight,
          simpleBreakdown: normalizeMathMarkdown(insight.simpleBreakdown),
          keyFormula: normalizeMathMarkdown(insight.keyFormula),
        };
        const next = { ...nodeInsightsRef.current, [requestedNodeId]: normalizedInsight };
        setNodeInsights(next);
        persistNodeInsights(next);
      })
      .catch((err) => {
        console.error('[NodeInsight FE] auto request failed', {
          nodeId: requestedNodeId,
          error: err?.message ?? String(err),
        });
        if (err instanceof ApiError && err.status === 429) {
          insightRetryNotBeforeRef.current[requestedNodeId] = Date.now() + 15_000;
        }
        // Fallback hint so panel stays useful without duplicating node text.
        const fallbackSimpleBreakdown =
          'Could not generate a detailed breakdown right now. Long-press this node and tap Regenerate Node to retry.';
        const fallbackKeyFormula = selectedNode.mathContent || '';
        const existingInsight = nodeInsightsRef.current[requestedNodeId];
        if (
          existingInsight?.simpleBreakdown === fallbackSimpleBreakdown
          && existingInsight?.keyFormula === fallbackKeyFormula
        ) {
          return;
        }
        const next = {
          ...nodeInsightsRef.current,
          [requestedNodeId]: {
            simpleBreakdown: fallbackSimpleBreakdown,
            keyFormula: fallbackKeyFormula,
          },
        };
        setNodeInsights(next);
        persistNodeInsights(next);
      })
      .finally(() => {
        insightRequestInFlightRef.current.delete(requestedNodeId);
        setInsightLoading(false);
      });
  }, [breakdown, nodeInsights, persistNodeInsights, selectedNode]);

  const startDrag = useCallback((e: React.MouseEvent, id: string) => {
    if (isLayoutLocked) return;
    e.preventDefault();
    e.stopPropagation();
    dragState.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: positions[id]?.x ?? 0,
      origY: positions[id]?.y ?? 0,
    };
    setDraggingId(id);
  }, [isLayoutLocked, positions]);

  const startTouchDragAt = useCallback((id: string, clientX: number, clientY: number) => {
    if (isLayoutLocked) return;
    dragState.current = {
      id,
      startX: clientX,
      startY: clientY,
      origX: positions[id]?.x ?? 0,
      origY: positions[id]?.y ?? 0,
    };
    setDraggingId(id);
  }, [isLayoutLocked, positions]);

  const handleBranchTouchStart = useCallback((e: ReactTouchEvent<HTMLDivElement>, node: BreakdownNode) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    e.stopPropagation();
    clearBranchLongPressTimer();
    branchTouchGestureRef.current = {
      nodeId: node.id,
      startX: touch.clientX,
      startY: touch.clientY,
    };
    branchLongPressTimerRef.current = window.setTimeout(() => {
      const gesture = branchTouchGestureRef.current;
      if (!gesture || gesture.nodeId !== node.id) return;
      suppressBranchClickRef.current = true;
      openBranchActionPortal(node, gesture.startX, gesture.startY);
      branchTouchGestureRef.current = null;
      branchLongPressTimerRef.current = null;
    }, BRANCH_LONG_PRESS_MS);
  }, [clearBranchLongPressTimer, openBranchActionPortal]);

  const handleBranchTouchMove = useCallback((e: ReactTouchEvent<HTMLDivElement>, node: BreakdownNode) => {
    const gesture = branchTouchGestureRef.current;
    if (!gesture || gesture.nodeId !== node.id) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    const distance = Math.hypot(touch.clientX - gesture.startX, touch.clientY - gesture.startY);
    if (distance < BRANCH_LONG_PRESS_MOVE_THRESHOLD) return;
    clearBranchLongPressTimer();
    branchTouchGestureRef.current = null;
    if (isLayoutLocked) return;
    suppressBranchClickRef.current = true;
    startTouchDragAt(node.id, touch.clientX, touch.clientY);
  }, [clearBranchLongPressTimer, isLayoutLocked, startTouchDragAt]);

  const handleBranchTouchEnd = useCallback((nodeId: string) => {
    clearBranchLongPressTimer();
    if (branchTouchGestureRef.current?.nodeId === nodeId) {
      branchTouchGestureRef.current = null;
    }
  }, [clearBranchLongPressTimer]);

  const handleBranchTouchCancel = useCallback((nodeId: string) => {
    clearBranchLongPressTimer();
    if (branchTouchGestureRef.current?.nodeId === nodeId) {
      branchTouchGestureRef.current = null;
    }
  }, [clearBranchLongPressTimer]);

  useEffect(() => { setComposerError(null); }, [selectedNode?.id]);

  const handleSubmit = async () => {
    if (isImageAnalyzing) return;
    if (!problemInput.trim()) return;
    const trimmedProblem = problemInput.trim();
    debugStudy('submit:start', {
      problemLength: trimmedProblem.length,
      hadExistingBreakdown: !!breakdownRef.current,
      previousSessionId: sessionIdRef.current,
    });
    setLoading(true);
    setError(null);
    setSessionId(null);
    setSessionSubjectId(null);
    setNodeInsights({});
    setNodeConversations({});
    setSelectedNode(null);
    setIsInsightPanelOpen(false);
    setBreakdown(null);
    setPositions({});
    setSessionVisualTable(null);
    try {
      const breakdownPayload: Record<string, unknown> = { problem: trimmedProblem };
      if (lastOcrUploadIdRef.current) {
        breakdownPayload.upload_id = lastOcrUploadIdRef.current;
      }
      if (ocrDetectedSignTable) {
        breakdownPayload.sign_table_hint = true;
      }
      console.debug('[SignTable] breakdown payload', {
        problemLength: trimmedProblem.length,
        sign_table_hint: !!breakdownPayload.sign_table_hint,
        has_upload_id: !!breakdownPayload.upload_id,
        problemPreview: trimmedProblem.slice(0, 160),
      });
      const { breakdown: bd, visualTable: vt } = await api.post<{ breakdown: ProblemBreakdown; visualTable?: VisualTableData }>(
        '/api/ai/breakdown',
        breakdownPayload
      );
      setSessionVisualTable(vt ?? null);
      console.debug('[SignTable] breakdown response', {
        hasVisualTable: !!vt,
        tableType: vt?.type ?? null,
        parameterName: vt?.parameterName ?? null,
        columns: vt?.columns ?? null,
        rowCount: vt?.rows?.length ?? null,
        rows: vt?.rows ?? null,
      });
      let newSessionId: string | null = null;
      let newSessionSubjectId: string | null = null;
      try {
        const { session } = await api.post<{ session: { id: string; subject_id: string | null } }>('/api/sessions', {
          title: bd.title,
          subject: bd.subject,
          problem: trimmedProblem,
          node_count: bd.nodes.length,
          breakdown_json: JSON.stringify(bd),
          visual_table_json: vt ? JSON.stringify(vt) : undefined,
        });
        newSessionId = session.id;
        newSessionSubjectId = session.subject_id ?? null;
      } catch {
        // Session save is non-blocking; user can still continue
      }
      const normalized = sanitizeBreakdownPayload(bd);
      // Compute initial layout right here — avoids useEffect re-triggering on expansions
      const brs = normalized.nodes.filter(n => n.type === 'branch').length;
      const lvs = normalized.nodes.filter(n => n.type === 'leaf').length;
      const w = Math.max(1000, (brs + 1) * 320);
      const h = lvs > 0 ? 700 : 540;
      const initial = computeInitialPositions(normalized.nodes, w, h);
      setBreakdown({
        ...normalized,
        id: newSessionId ?? undefined,
        nodeInsights: normalized.nodeInsights ?? {},
        nodeConversations: normalized.nodeConversations ?? {},
      });
      setSessionId(newSessionId);
      setSessionSubjectId(newSessionSubjectId);
      setNodeInsights(normalized.nodeInsights ?? {});
      setNodeConversations(normalized.nodeConversations ?? {});
      setPositions(resolveCollisions(initial));
      const rootNode = normalized.nodes.find(n => n.type === 'root') ?? null;
      setSelectedNode(rootNode);
      setIsInsightPanelOpen(!!rootNode);
      setShowInput(false);
      setProblemInput('');
      lastOcrInsertRef.current = null;
      lastOcrUploadIdRef.current = null;
      setOcrDetectedSignTable(false);
      debugStudy('submit:success', {
        newSessionId,
        nodes: bd.nodes.length,
      });
    } catch (err: any) {
      setError(resolveQuotaAwareErrorMessage(err, 'Failed to break down problem'));
      debugStudy('submit:error', { message: err?.message ?? 'unknown' });
    } finally {
      setLoading(false);
    }
  };

  const handleAttachProblemFile = async (file: File) => {
    const traceId = nextAttachmentTraceId();
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let currentStage = 'init';
    const logAttach = (stage: string, payload: Record<string, unknown> = {}) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsedMs = Math.max(0, Math.round(now - startedAt));
      console.log('[StudySpace attachment debug]', {
        traceId,
        stage,
        elapsedMs,
        ...payload,
      });
    };

    const lowerName = file.name.toLowerCase();
    const hasMissingMimeFallback = !file.type && (lowerName.endsWith('.pdf') || lowerName.endsWith('.txt'));
    const normalizedFile = hasMissingMimeFallback
      ? new File(
        [file],
        file.name,
        {
          type: lowerName.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
          lastModified: file.lastModified,
        }
      )
      : file;

    currentStage = 'file:normalized';
    logAttach(currentStage, {
      originalName: file.name,
      originalType: file.type || '(empty)',
      normalizedName: normalizedFile.name,
      normalizedType: normalizedFile.type || '(empty)',
      sizeBytes: normalizedFile.size,
      usedMimeFallback: hasMissingMimeFallback,
    });

    const validationError = hasMissingMimeFallback
      ? (normalizedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024
        ? `File must be smaller than ${MAX_FILE_SIZE_MB}MB`
        : null)
      : validateFile(normalizedFile);
    if (validationError) {
      logAttach('file:validation-error', { validationError });
      setError(validationError);
      return;
    }

    const isImageFile = normalizedFile.type.startsWith('image/');
    const isPdfFile = normalizedFile.type === 'application/pdf';
    const isTextFile = normalizedFile.type === 'text/plain';
    if (!isImageFile && !isPdfFile && !isTextFile) {
      logAttach('file:unsupported-type', {
        normalizedType: normalizedFile.type,
      });
      setError('Unsupported file type. Please upload JPG, PNG, WebP, PDF, or TXT.');
      return;
    }

    logAttach('file:type-resolved', {
      category: isImageFile ? 'image' : isPdfFile ? 'pdf' : 'text',
    });

    debugStudy('attachment:attach:start', {
      name: normalizedFile.name,
      type: normalizedFile.type,
      size: normalizedFile.size,
      usedMimeFallback: hasMissingMimeFallback,
      category: isImageFile ? 'image' : isPdfFile ? 'pdf' : 'text',
    });

    const insertExtractedText = (rawExtractedText: string, uploadId: string | null, meta: Record<string, unknown> = {}) => {
      const extractedText = normalizeImageProblemText(rawExtractedText);
      logPageMathDebug('attachment:attach:analysis-raw', rawExtractedText, {
        uploadId,
        stage: 'raw',
        ...meta,
      });
      logPageMathDebug('attachment:attach:analysis-normalized', extractedText, {
        uploadId,
        stage: 'normalized',
      });

      if (!extractedText) {
        logAttach('text:empty-after-normalize', {
          uploadId,
          rawLength: rawExtractedText.length,
        });
        throw new Error('No readable problem text found in this attachment.');
      }
      if (rawExtractedText !== extractedText) {
        debugStudy('attachment:attach:normalized', {
          uploadId,
          rawLength: rawExtractedText.length,
          normalizedLength: extractedText.length,
          rawPreview: debugClip(rawExtractedText, 260),
          normalizedPreview: debugClip(extractedText, 260),
        });
      }

      setProblemInput((prev) => {
        const prevTrimmed = prev.trim();
        const lastOcrInsert = (lastOcrInsertRef.current ?? '').trim();

        let nextValue: string;
        if (!prevTrimmed) {
          nextValue = extractedText;
        } else if (lastOcrInsert && (prevTrimmed === lastOcrInsert || prevTrimmed.endsWith(`\n\n${lastOcrInsert}`))) {
          // Replace prior OCR insert to avoid stacking stale OCR results across retries.
          const withoutLastOcr = prevTrimmed === lastOcrInsert
            ? ''
            : prevTrimmed.slice(0, -(`\n\n${lastOcrInsert}`).length).trim();
          nextValue = withoutLastOcr ? `${withoutLastOcr}\n\n${extractedText}` : extractedText;
        } else {
          // Keep user-typed context and append extracted text.
          nextValue = `${prevTrimmed}\n\n${extractedText}`;
        }

        lastOcrInsertRef.current = extractedText;
        lastOcrUploadIdRef.current = uploadId ?? null;
        logPageMathDebug('attachment:attach:composer-insert', nextValue, {
          uploadId,
          replacedPreviousOcr: Boolean(
            lastOcrInsert && (prevTrimmed === lastOcrInsert || prevTrimmed.endsWith(`\n\n${lastOcrInsert}`))
          ),
        });
        return nextValue;
      });
      const signTableDetected = detectSignTableInText(rawExtractedText);
      setOcrDetectedSignTable(signTableDetected);
      console.debug('[SignTable] OCR detection', {
        detected: signTableDetected,
        rawLength: rawExtractedText.length,
        hasTabular: /\\begin\{tabular\}/.test(rawExtractedText),
        hasColumnHeaders: /\bM\b.{0,30}(?:Δ|\\Delta|\$\\Delta\$).{0,30}\bP\b.{0,30}\bS\b/i.test(rawExtractedText),
        hasDelta: /[Δ]/.test(rawExtractedText),
        hasPeqSeq: /\bP\s*=|\bS\s*=/.test(rawExtractedText),
        preview: rawExtractedText.slice(0, 200),
      });
      setShowInput(true);
      logAttach('composer:inserted', {
        uploadId,
        extractedLength: extractedText.length,
        preview: debugClip(extractedText, 140),
      });
      debugStudy('attachment:attach:success', {
        uploadId,
        extractedLength: extractedText.length,
        preview: debugClip(extractedText, 260),
      });
    };

    setError(null);
    setIsImageAnalyzing(true);
    try {
      if (isTextFile) {
        currentStage = 'text:read-start';
        logAttach(currentStage);
        const fileText = await normalizedFile.text();
        currentStage = 'text:read-done';
        logAttach(currentStage, { textLength: fileText.length });
        insertExtractedText((fileText ?? '').trim(), null, {
          source: 'local:text-file',
        });
        return;
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        logAttach('network:offline');
        throw new Error('You are offline. Please reconnect and try again.');
      }

      const apiUrl = resolveApiBaseUrl();
      const apiHost = resolveApiBaseHost();
      logAttach('network:preflight', {
        webOrigin: typeof window !== 'undefined' ? window.location.origin : null,
        webProtocol: typeof window !== 'undefined' ? window.location.protocol : null,
        apiBaseUrl: apiUrl?.toString() ?? null,
        apiBaseHost: apiHost,
        online: typeof navigator !== 'undefined' ? navigator.onLine : null,
      });
      if (
        typeof window !== 'undefined'
        && window.location.protocol === 'https:'
        && apiUrl
        && apiUrl.protocol === 'http:'
      ) {
        throw new Error(
          'Blocked by mixed-content policy: site is HTTPS but API URL is HTTP. Configure `VITE_API_URL` to HTTPS.'
        );
      }
      if (
        typeof window !== 'undefined'
        && apiHost
        && isLoopbackHost(apiHost)
        && !isLoopbackHost(window.location.hostname)
      ) {
        throw new Error(
          'Cannot reach upload API from this device because `VITE_API_URL` points to localhost. Use your computer LAN IP for mobile testing.'
        );
      }

      currentStage = 'signed-url:start';
      logAttach(currentStage, { endpoint: '/api/uploads/signed-upload-url' });
      const signedUploadResponse = await api.post<SignedUploadPayload>('/api/uploads/signed-upload-url', {
        original_name: normalizedFile.name,
        mime_type: normalizedFile.type,
        size_bytes: normalizedFile.size,
        context: 'ai_query',
        attach_trace_id: traceId,
      });
      currentStage = 'signed-url:done';
      const uploadId = signedUploadResponse.upload?.id;
      const signedUpload = signedUploadResponse.signed_upload;
      logAttach(currentStage, {
        uploadId: uploadId ?? null,
        hasSignedUrl: Boolean(signedUpload?.signedUrl),
        storagePath: signedUpload?.path ?? null,
        bucket: signedUpload?.bucket ?? null,
      });
      if (!uploadId || !signedUpload?.signedUrl) {
        throw new Error('Failed to initialize direct upload.');
      }

      currentStage = 'storage-upload:start';
      logAttach(currentStage, {
        bucket: signedUpload.bucket,
        path: signedUpload.path,
      });
      const directUploadResponse = await uploadToSignedStorageUrl(signedUpload.signedUrl, normalizedFile);
      if (!directUploadResponse.ok) {
        const errorText = await directUploadResponse.text().catch(() => '');
        throw new Error(`Direct upload failed with HTTP ${directUploadResponse.status}${errorText ? `: ${errorText.slice(0, 240)}` : ''}`);
      }
      currentStage = 'storage-upload:done';
      logAttach(currentStage, {
        status: directUploadResponse.status,
      });

      const analyzePayload: Record<string, unknown> = {
        upload_id: uploadId,
        mode: 'problem_ocr',
        attach_trace_id: traceId,
      };
      if (isPdfFile) {
        analyzePayload.question = 'Extract all readable problem text from this PDF as plain text. Preserve equations in KaTeX-friendly LaTeX with $...$ or $$...$$ delimiters.';
      }

      currentStage = 'analyze:start';
      logAttach(currentStage, {
        endpoint: '/api/ai/analyze-image',
        mode: analyzePayload.mode,
        hasQuestion: typeof analyzePayload.question === 'string',
      });
      const analyzeImageResponse = await api.post<AnalyzeImageResponse>('/api/ai/analyze-image', analyzePayload);
      currentStage = 'analyze:done';

      const structured = analyzeImageResponse.analysis_structured;
      const structuredText = (structured?.text ?? '').trim();
      const structuredPlainText = (structured?.plain_text ?? analyzeImageResponse.analysis_plain_text ?? '').trim();
      const structuredMathSegments = (
        structured?.math_segments
        ?? analyzeImageResponse.analysis_math_segments
        ?? []
      );
      const reconstructedStructuredText = rebuildFromStructuredOcr(structuredPlainText, structuredMathSegments).trim();
      logAttach(currentStage, {
        analysisLength: (analyzeImageResponse.analysis ?? '').trim().length,
        hasStructured: Boolean(structured),
        structuredTextLength: structuredText.length,
        structuredPlainTextLength: structuredPlainText.length,
        structuredMathSegments: structuredMathSegments.length,
      });
      console.log('[StudySpace OCR API response shape]', {
        uploadId,
        mimeType: normalizedFile.type,
        analysisContractVersion: analyzeImageResponse.analysis_contract_version ?? null,
        responseKeys: Object.keys(analyzeImageResponse ?? {}),
        hasAnalysis: typeof analyzeImageResponse.analysis === 'string',
        hasStructured: Boolean(structured),
        hasStructuredText: Boolean(structuredText),
        hasStructuredPlainText: Boolean(structuredPlainText),
        structuredMathSegments: structuredMathSegments.length,
        structuredWarnings: structured?.warnings ?? [],
        analysisPreview: debugClip((analyzeImageResponse.analysis ?? '').trim(), 200),
        structuredTextPreview: debugClip(structuredText, 200),
        structuredPlainPreview: debugClip(structuredPlainText, 200),
      });
      if (!structured && (analyzeImageResponse.analysis_plain_text || analyzeImageResponse.analysis_math_segments?.length)) {
        console.warn('[StudySpace OCR API] partial structured payload received (no analysis_structured object)', {
          uploadId,
          analysisPlainTextLength: (analyzeImageResponse.analysis_plain_text ?? '').length,
          analysisMathSegments: analyzeImageResponse.analysis_math_segments?.length ?? 0,
        });
      }
      const rawExtractedText = (
        structuredText
        || reconstructedStructuredText
        || (analyzeImageResponse.analysis ?? '').trim()
      );
      const normalizedExtractedText = normalizeMathMarkdown(rawExtractedText);
      logAttach('analyze:raw-text-selected', {
        selectedLength: normalizedExtractedText.length,
        usedStructuredText: Boolean(structuredText),
        usedReconstructedText: !structuredText && Boolean(reconstructedStructuredText),
      });

      if (structuredMathSegments.length) {
        console.log('[StudySpace structured OCR]', {
          uploadId,
          structuredMathSegments: structuredMathSegments.length,
          invalidMathSegments: structuredMathSegments.filter((segment) => !segment.valid).map((segment) => ({
            id: segment.id,
            issues: segment.issues,
            latexRaw: segment.latexRaw,
            latexNormalized: segment.latexNormalized,
          })),
          structuredWarnings: structured?.warnings ?? [],
        });
      }

      insertExtractedText(normalizedExtractedText, uploadId, {
        source: isPdfFile ? 'upload:pdf' : 'upload:image',
        hasStructured: Boolean(structured),
        structuredMathSegments: structuredMathSegments.length,
        structuredWarnings: structured?.warnings ?? [],
      });
    } catch (err: any) {
      const message = resolveAttachmentErrorMessage(err, {
        stage: currentStage,
        traceId,
      });
      console.error('[StudySpace attachment diagnostics]', {
        traceId,
        stage: currentStage,
        message,
        errorName: err instanceof Error ? err.name : typeof err,
        errorMessage: err instanceof Error ? err.message : String(err ?? ''),
        apiErrorStatus: err instanceof ApiError ? err.status : null,
        apiErrorData: err instanceof ApiError ? err.data : null,
        webOrigin: typeof window !== 'undefined' ? window.location.origin : null,
        webProtocol: typeof window !== 'undefined' ? window.location.protocol : null,
        apiBaseUrl: resolveApiBaseUrl()?.toString() ?? null,
        apiBaseHost: resolveApiBaseHost(),
        online: typeof navigator !== 'undefined' ? navigator.onLine : null,
      });
      console.error('[StudySpace attachment debug] error', {
        traceId,
        stage: currentStage,
        message,
        error: err,
      });
      setError(message);
      debugStudy('attachment:attach:error', {
        message,
        traceId,
        stage: currentStage,
        rawError: err instanceof Error ? err.message : String(err ?? ''),
        webOrigin: typeof window !== 'undefined' ? window.location.origin : null,
        webProtocol: typeof window !== 'undefined' ? window.location.protocol : null,
        apiBaseUrl: resolveApiBaseUrl()?.toString() ?? null,
        apiBaseHost: resolveApiBaseHost(),
        online: typeof navigator !== 'undefined' ? navigator.onLine : null,
      });
    } finally {
      logAttach('flow:finalize', {
        isImageAnalyzing: false,
      });
      setIsImageAnalyzing(false);
    }
  };

  const handleAttachDeepDiveFile = async (file: File) => {
    const traceId = nextAttachmentTraceId();
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let currentStage = 'init';
    const logAttach = (stage: string, payload: Record<string, unknown> = {}) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsedMs = Math.max(0, Math.round(now - startedAt));
      console.log('[StudySpace DeepDive attachment debug]', {
        traceId,
        stage,
        elapsedMs,
        ...payload,
      });
    };

    const lowerName = file.name.toLowerCase();
    const hasMissingMimeFallback = !file.type && (lowerName.endsWith('.pdf') || lowerName.endsWith('.txt'));
    const normalizedFile = hasMissingMimeFallback
      ? new File(
        [file],
        file.name,
        {
          type: lowerName.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
          lastModified: file.lastModified,
        }
      )
      : file;

    currentStage = 'file:normalized';
    logAttach(currentStage, {
      originalName: file.name,
      originalType: file.type || '(empty)',
      normalizedName: normalizedFile.name,
      normalizedType: normalizedFile.type || '(empty)',
      sizeBytes: normalizedFile.size,
      usedMimeFallback: hasMissingMimeFallback,
    });

    const validationError = hasMissingMimeFallback
      ? (normalizedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024
        ? `File must be smaller than ${MAX_FILE_SIZE_MB}MB`
        : null)
      : validateFile(normalizedFile);
    if (validationError) {
      logAttach('file:validation-error', { validationError });
      setComposerError(validationError);
      return;
    }

    const isImageFile = normalizedFile.type.startsWith('image/');
    const isPdfFile = normalizedFile.type === 'application/pdf';
    const isTextFile = normalizedFile.type === 'text/plain';
    if (!isImageFile && !isPdfFile && !isTextFile) {
      logAttach('file:unsupported-type', {
        normalizedType: normalizedFile.type,
      });
      setComposerError('Unsupported file type. Please upload JPG, PNG, WebP, PDF, or TXT.');
      return;
    }

    logAttach('file:type-resolved', {
      category: isImageFile ? 'image' : isPdfFile ? 'pdf' : 'text',
    });

    debugStudy('attachment:deepdive:attach:start', {
      name: normalizedFile.name,
      type: normalizedFile.type,
      size: normalizedFile.size,
      usedMimeFallback: hasMissingMimeFallback,
      category: isImageFile ? 'image' : isPdfFile ? 'pdf' : 'text',
    });

    setComposerError(null);
    setIsDeepDiveImageAnalyzing(true);
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('You are offline. Please reconnect and try again.');
      }

      currentStage = 'signed-url:start';
      const signedUploadResponse = await api.post<SignedUploadPayload>('/api/uploads/signed-upload-url', {
        original_name: normalizedFile.name,
        mime_type: normalizedFile.type,
        size_bytes: normalizedFile.size,
        context: 'ai_query',
        attach_trace_id: traceId,
      });
      const uploadId = signedUploadResponse.upload?.id;
      const signedUpload = signedUploadResponse.signed_upload;
      if (!uploadId || !signedUpload?.signedUrl) {
        throw new Error('Failed to initialize direct upload.');
      }

      currentStage = 'storage-upload:start';
      const directUploadResponse = await uploadToSignedStorageUrl(signedUpload.signedUrl, normalizedFile);
      if (!directUploadResponse.ok) {
        throw new Error(`Direct upload failed with HTTP ${directUploadResponse.status}`);
      }

      setDeepDiveUploadId(uploadId);
      setHasDeepDiveAttachment(true);
      showActionToast('Image attached.');
    } catch (err: any) {
      const message = resolveAttachmentErrorMessage(err, {
        stage: currentStage,
        traceId,
      });
      setComposerError(message);
    } finally {
      setIsDeepDiveImageAnalyzing(false);
    }
  };

  const handleExpand = useCallback(async (node: BreakdownNode) => {
    if (!breakdown) return;
    setExpandingId(node.id);
    const rootNode = breakdown.nodes.find(n => n.type === 'root');
    try {
      const { nodes: rawNodes } = await api.post<{ nodes: Omit<BreakdownNode, 'parentId'>[] }>(
        '/api/ai/expand',
        {
          nodeLabel: node.label,
          nodeMathContent: node.mathContent || node.label,
          parentProblem: rootNode?.mathContent || rootNode?.label || '',
          subject: breakdown.subject,
        }
      );

      if (!rawNodes.length) return;

      const timestamp = Date.now();
      const newNodes: BreakdownNode[] = rawNodes.map((n, i) => ({
        ...n,
        id: `${node.id}_x${timestamp}_${i}`,
        parentId: node.id,
        type: 'branch' as const,
      }));

      // Position new nodes above parent, spread horizontally
      const parentPos = positions[node.id] ?? { x: 500, y: 300 };
      const newPositions: Record<string, NodePos> = {};
      newNodes.forEach((n, i) => {
        const offset = (i - (newNodes.length - 1) / 2) * 270;
        newPositions[n.id] = {
          x: parentPos.x + offset,
          y: parentPos.y - 200,
        };
      });

      const expandedBreakdown: ProblemBreakdown = breakdown
        ? { ...breakdown, nodes: [...breakdown.nodes, ...newNodes], nodePositions: { ...positions, ...newPositions } }
        : breakdown!;
      setBreakdown(expandedBreakdown);
      setPositions(prev => resolveCollisions({ ...prev, ...newPositions }, node.id));

      // Persist to server so collaborators receive the new nodes via SSE.
      if (sessionId) {
        api.put(`/api/sessions/${sessionId}`, {
          breakdown_json: JSON.stringify({
            ...expandedBreakdown,
            nodeInsights: nodeInsightsRef.current,
            nodeConversations: nodeConversationsRef.current,
            nodePositions: { ...positionsRef.current, ...newPositions },
          }),
        }).catch(() => {});
      }
    } catch (err: any) {
      setError(resolveQuotaAwareErrorMessage(err, 'Expansion failed'));
    } finally {
      setExpandingId(null);
    }
  }, [breakdown, positions, sessionId]);

  const copyToClipboard = useCallback(async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }, []);

  const handleRegenerateBranchNode = useCallback(async (node: BreakdownNode) => {
    if (!breakdown) return;
    setBranchActionBusy('regenerate');
    try {
      const parentNode = node.parentId
        ? breakdown.nodes.find((n) => n.id === node.parentId) ?? null
        : null;
      const rootNode = breakdown.nodes.find((n) => n.type === 'root') ?? null;
      const parentProblem = parentNode?.mathContent || parentNode?.label || rootNode?.mathContent || rootNode?.label || breakdown.title;
      const { node: regenerated } = await api.post<RegeneratedBranchNodeResponse>('/api/ai/regenerate-node', {
        nodeLabel: node.label,
        nodeDescription: node.description,
        nodeMathContent: node.mathContent || node.label,
        nodeType: node.type,
        parentProblem,
        subject: breakdown.subject,
      });

      const nextLabel = (regenerated?.label ?? '').trim() || node.label;
      const nextDescription = (regenerated?.description ?? '').trim() || node.description;
      const nextMathContent = (regenerated?.mathContent ?? '').trim() || node.mathContent || node.label;
      const nextBreakdown: ProblemBreakdown = {
        ...breakdown,
        nodeInsights: { ...nodeInsights },
        nodeConversations: { ...nodeConversations },
        nodes: breakdown.nodes.map((n) => (
          n.id === node.id
            ? { ...n, label: nextLabel, description: nextDescription, mathContent: nextMathContent }
            : n
        )),
      };
      setSelectedNode((prev) => {
        if (!prev || prev.id !== node.id) return prev;
        return { ...prev, label: nextLabel, description: nextDescription, mathContent: nextMathContent };
      });

      const nextNodeInsights = { ...nodeInsights };
      const nextNodeConversations = { ...nodeConversations };
      delete nextNodeInsights[node.id];
      delete nextNodeConversations[node.id];
      setNodeInsights(nextNodeInsights);
      setNodeConversations(nextNodeConversations);
      const persistedBreakdown: ProblemBreakdown = {
        ...nextBreakdown,
        nodeInsights: nextNodeInsights,
        nodeConversations: nextNodeConversations,
        nodePositions: positionsRef.current,
      };
      setBreakdown(persistedBreakdown);
      if (sessionId) {
        api.put(`/api/sessions/${sessionId}`, {
          breakdown_json: JSON.stringify(persistedBreakdown),
        }).catch(() => {});
      }

      setBranchActionPortal(null);
      showActionToast('Node regenerated.');
    } catch (err: any) {
      setError(resolveQuotaAwareErrorMessage(err, 'Failed to regenerate node'));
      showActionToast('Regenerate failed.');
    } finally {
      setBranchActionBusy(null);
    }
  }, [
    breakdown,
    nodeConversations,
    nodeInsights,
    sessionId,
    showActionToast,
  ]);

  const handleAddBranchToFlashcards = useCallback(async (node: BreakdownNode) => {
    if (!breakdown) return;
    setBranchActionBusy('flashcard');
    const cacheSubjectKeyId = sessionSubjectId ?? null;
    const createQuickDeck = async () => {
      const { deck } = await api.post<{ deck: { id: string } }>('/api/flashcards/decks', {
        title: 'StudySpace Quick Capture',
        description: 'Cards captured from StudySpace branch actions',
        subject_id: cacheSubjectKeyId,
        subject: breakdown.subject,
      });
      setQuickDeckIdForSubject(cacheSubjectKeyId, breakdown.subject, deck.id);
      return deck.id;
    };
    const isDeckSubjectMatch = async (deckId: string) => {
      try {
        const { deck } = await api.get<{ deck: { subject_id: string | null; subject_name: string | null } }>(`/api/flashcards/decks/${deckId}`);
        if (cacheSubjectKeyId) return deck.subject_id === cacheSubjectKeyId;
        return normalizeQuickDeckSubjectName(deck.subject_name) === normalizeQuickDeckSubjectName(breakdown.subject);
      } catch {
        return false;
      }
    };
    try {
      let deckId = getQuickDeckIdForSubject(cacheSubjectKeyId, breakdown.subject);
      if (deckId) {
        const matches = await isDeckSubjectMatch(deckId);
        if (!matches) {
          clearQuickDeckIdForSubject(cacheSubjectKeyId, breakdown.subject);
          deckId = null;
        }
      }
      if (!deckId) deckId = await createQuickDeck();

      const cardPayload = {
        front: (node.mathContent ?? node.label).trim(),
        back: `${node.label}\n${node.description}${node.mathContent ? `\nMath: ${node.mathContent}` : ''}`.trim(),
        hint: breakdown.title,
        difficulty: 'medium' as const,
      };
      try {
        await api.post(`/api/flashcards/decks/${deckId}/cards`, cardPayload);
      } catch {
        clearQuickDeckIdForSubject(cacheSubjectKeyId, breakdown.subject);
        const recreatedDeckId = await createQuickDeck();
        await api.post(`/api/flashcards/decks/${recreatedDeckId}/cards`, cardPayload);
      }

      setBranchActionPortal(null);
      showActionToast('Added to flashcards.');
    } catch (err: any) {
      setError(resolveQuotaAwareErrorMessage(err, 'Failed to add flashcard'));
      showActionToast('Add to flashcards failed.');
    } finally {
      setBranchActionBusy(null);
    }
  }, [breakdown, sessionSubjectId, showActionToast]);

  const handleCopyBranchMath = useCallback(async (node: BreakdownNode) => {
    const raw = (node.mathContent || node.label || '').trim();
    const text = buildCopyMathPayload(raw);
    if (!text) {
      showActionToast('No math content to copy.');
      return;
    }
    try {
      await copyToClipboard(text);
      setBranchActionPortal(null);
      showActionToast('Math copied.');
    } catch {
      showActionToast('Copy failed.');
    }
  }, [copyToClipboard, showActionToast]);

  const handleBranchBreakdownFurther = useCallback((node: BreakdownNode) => {
    setBranchActionPortal(null);
    handleExpand(node);
  }, [handleExpand]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const handleExplainToFiveYearOld = async () => {
    if (!selectedNode || !breakdown) return;
    console.debug('[NodeInsight FE] kid request', {
      nodeId: selectedNode.id,
      level: '5-year-old',
      nodeLabelLength: (selectedNode.label ?? '').length,
      nodeMathLength: (selectedNode.mathContent || selectedNode.label || '').length,
      nodeLabelPreview: debugClip(selectedNode.label ?? ''),
    });
    setInsightLoading(true);
    try {
      const { insight } = await api.post<{ insight: NodeInsight }>('/api/ai/node-insight', {
        nodeLabel: selectedNode.label,
        nodeDescription: selectedNode.description,
        nodeMathContent: selectedNode.mathContent || selectedNode.label,
        subject: breakdown.subject,
        level: '5-year-old',
      });

      console.debug('[NodeInsight FE] kid response', {
        nodeId: selectedNode.id,
        simpleBreakdownLength: (insight?.simpleBreakdown ?? '').length,
        keyFormulaLength: (insight?.keyFormula ?? '').length,
        preview: debugClip(insight?.simpleBreakdown ?? ''),
      });
      logPageMathDebug('node-insight:kid:simpleBreakdown', insight?.simpleBreakdown ?? '', {
        nodeId: selectedNode.id,
        level: '5-year-old',
      });
      logPageMathDebug('node-insight:kid:keyFormula', insight?.keyFormula ?? '', {
        nodeId: selectedNode.id,
        level: '5-year-old',
      });
      if ((insight?.simpleBreakdown ?? '').trim().length < 24) {
        console.warn('[NodeInsight FE] kid response looks too short', {
          nodeId: selectedNode.id,
          content: insight?.simpleBreakdown ?? '',
        });
      }
      
      const normalizedInsight = {
        ...insight,
        simpleBreakdown: normalizeMathMarkdown(insight.simpleBreakdown),
        keyFormula: normalizeMathMarkdown(insight.keyFormula),
      };
      const newNodeInsights = { ...nodeInsights, [selectedNode.id]: normalizedInsight };
      setNodeInsights(newNodeInsights);
      persistNodeInsights(newNodeInsights);
    } catch (err) {
      console.error('[NodeInsight FE] kid request failed', err);
    } finally {
      setInsightLoading(false);
    }
  };

  const handleAskDeepDive = async (rawQuestion: string, contextBlock?: string) => {
    if (!selectedNode || !breakdown) return;
    const baseQuestion = rawQuestion.trim()
      || (deepDiveUploadId ? 'Please analyze this image in the context of this node.' : '');
    const question = contextBlock ? `${baseQuestion}\n\n${contextBlock}` : baseQuestion;
    if (!question || composerLoading) return;

    setComposerError(null);
    const existingMessages = nodeConversations[selectedNode.id] ?? [];
    const userMessage: NodeConversationMessage = {
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...existingMessages, userMessage];
    const nextConversations = { ...nodeConversations, [selectedNode.id]: nextMessages };
    setNodeConversations(nextConversations);
    persistNodeConversations(nextConversations);
    setComposerLoading(true);

    try {
      const contextPrompt = `Deep dive context:
Main problem: ${breakdown.title}
Subject: ${breakdown.subject}
Selected node: ${selectedNode.label} (${selectedNode.type})
Node description: ${selectedNode.description}
Node expression: ${selectedNode.mathContent || selectedNode.label}

Instructions:
- Focus specifically on this selected node.
- Explain reasoning and edge cases clearly.
- Use concise but concrete math details when relevant.
- Do not use $...$ or $$...$$ wrappers. Write math in plain text (example: a < 0).`;

      // Always inject node context into user turns so the model stays anchored
      // to the currently selected node across multi-turn conversation.
      const messages: Array<{ role: 'user' | 'model'; content: string }> = nextMessages.map(m => {
        if (m.role === 'user') {
          return {
            role: 'user',
            content: `${contextPrompt}\n\nStudent question: ${m.content}`,
          };
        }
        return { role: 'model', content: m.content };
      });

      const { response, session_id, finish_reason, visualTable } = await api.post<{ response: string; session_id?: string; finish_reason?: string; visualTable?: VisualTableData }>('/api/ai/chat', {
        messages,
        subject: breakdown.subject,
        session_id: sessionId ?? undefined,
        upload_id: deepDiveUploadId ?? undefined,
      });

      setDeepDiveUploadId(null);
      setHasDeepDiveAttachment(false);
      deepDiveLastOcrInsertRef.current = null;

      let effectiveSessionId = session_id ?? sessionId ?? undefined;
      if (session_id && !sessionId) setSessionId(session_id);

      let finalResponse = (response ?? '').trim();
      let finalVisualTable = visualTable;

      if (/(\$[^$\n]+\$\s*\*:)|\\frac|\\\$|\$|\\[a-zA-Z]+/.test(finalResponse)) {
        console.log('[DeepDive raw model response]', finalResponse);
        logPageMathDebug('deep-dive:model-response', finalResponse, {
          nodeId: selectedNode.id,
        });
      }
      
      const endsWithTerminator = /[.!?។៕]"?$/.test(finalResponse);
      const looksTruncated = (finalResponse.length > 0 && !endsWithTerminator) || finish_reason === 'MAX_TOKENS';

      // If response appears cut mid-sentence, request continuation once.
      if (looksTruncated) {
        const continuePrompt = `${contextPrompt}

Continue your previous explanation exactly where you left off. 
IMPORTANT: 
- START IMMEDIATELY with the next word of your sentence. 
- DO NOT repeat your introduction. 
- DO NOT say "Sure" or "Continuing".
- DO NOT repeat any text you already wrote.`;

        const continuationMessages: Array<{ role: 'user' | 'model'; content: string }> = [
          ...messages,
          { role: 'model', content: finalResponse },
          { role: 'user', content: continuePrompt },
        ];
        const continuation = await api.post<{ response: string; session_id?: string; visualTable?: VisualTableData }>('/api/ai/chat', {
          messages: continuationMessages,
          subject: breakdown.subject,
          session_id: effectiveSessionId,
        });
        if (!effectiveSessionId && continuation.session_id) {
          effectiveSessionId = continuation.session_id;
          setSessionId(continuation.session_id);
        }
        const continuedText = (continuation.response ?? '').trim();
        if (continuedText) {
          finalResponse = `${finalResponse}\n\n${continuedText}`;
        }
        if (continuation.visualTable) {
          finalVisualTable = continuation.visualTable;
        }
      }

      // Fallback: if the backend didn't extract a JSON table block (e.g. the
      // response had Khmer text before the ``\`json fence, or the first block
      // was truncated and the continuation added a second complete block),
      // extract it here and clean the raw JSON out of the displayed text.
      if (!finalVisualTable && finalResponse.includes('```json')) {
        const extracted = extractChatJsonBlocks(finalResponse);
        if (extracted.visualTable) finalVisualTable = extracted.visualTable;
        if (extracted.cleanText) finalResponse = extracted.cleanText;
      } else if (finalVisualTable && finalResponse.includes('```json')) {
        // Backend did extract the table but left the JSON block in the text — strip it.
        const extracted = extractChatJsonBlocks(finalResponse);
        if (extracted.cleanText) finalResponse = extracted.cleanText;
      }

      const modelMessage: NodeConversationMessage = {
        role: 'model',
        content: normalizeMathMarkdown(finalResponse) || 'No response generated. Try rephrasing your question.',
        createdAt: new Date().toISOString(),
        visualTable: finalVisualTable,
      };
      const completedMessages = [...nextMessages, modelMessage];
      const completedConversations = { ...nextConversations, [selectedNode.id]: completedMessages };
      setNodeConversations(completedConversations);
      persistNodeConversations(completedConversations);
    } catch (err: any) {
      console.error('Failed to generate deep dive response:', err);
      setComposerError(resolveQuotaAwareErrorMessage(err, 'Failed to generate deep dive response'));
    } finally {
      setComposerLoading(false);
    }
  };

  const handleBreakdownConversation = async (question: string, answer: string) => {
    if (!breakdown) return;
    setLoading(true);
    setError(null);
    setIsInsightPanelOpen(false);

    try {
      const problemText = `[Context from previous session: ${breakdown.title}]\n\nQuestion: ${question}\n\nAnswer: ${answer}\n\nPlease provide a new study breakdown based on this specific concept.`;
      
      const { breakdown: bd, visualTable: vt } = await api.post<{ breakdown: ProblemBreakdown; visualTable?: VisualTableData }>(
        '/api/ai/breakdown',
        { problem: problemText }
      );

      let newSessionId: string | null = null;
      let newSessionSubjectId: string | null = null;
      try {
        const { session } = await api.post<{ session: { id: string; subject_id: string | null } }>('/api/sessions', {
          title: bd.title,
          subject: bd.subject,
          problem: problemText,
          node_count: bd.nodes.length,
          breakdown_json: JSON.stringify(bd),
          visual_table_json: vt ? JSON.stringify(vt) : undefined,
        });
        newSessionId = session.id;
        newSessionSubjectId = session.subject_id ?? null;
      } catch {
        // Saving the session is non-blocking
      }

      const normalized = sanitizeBreakdownPayload(bd);
      normalized.id = newSessionId ?? bd.id;
      
      setBreakdown(normalized);
      setSessionId(newSessionId);
      setSessionSubjectId(newSessionSubjectId);
      setSessionVisualTable(vt ?? null);
      setNodeInsights(normalized.nodeInsights ?? {});
      setNodeConversations(normalized.nodeConversations ?? {});
      
      const brs = normalized.nodes.filter(n => n.type === 'branch').length;
      const lvs = normalized.nodes.filter(n => n.type === 'leaf').length;
      const w = Math.max(1000, (brs + 1) * 320);
      const h = lvs > 0 ? 700 : 540;
      const initialPos = resolveCollisions(computeInitialPositions(normalized.nodes, w, h));
      setPositions(initialPos);
      
      const rootNode = normalized.nodes.find(n => n.type === 'root') ?? null;
      setSelectedNode(rootNode);
      if (newSessionId) localStorage.setItem('zupiq_lastSessionId', newSessionId);
      
      showActionToast('New study session created from thread!');
    } catch (err) {
      setError(resolveQuotaAwareErrorMessage(err, 'Failed to create new breakdown.'));
    } finally {
      setLoading(false);
    }
  };


  const NAV_ITEMS = [
    { id: 'map',         label: 'Neural Map',   Icon: GitFork },
    { id: 'knowledge-map', label: 'Knowledge Map', Icon: Network },
    { id: 'history',     label: 'History',       Icon: History },
    { id: 'flashcards',  label: 'Flashcards',    Icon: Layers },
    { id: 'quiz',        label: 'Quiz',          Icon: Brain },
    { id: 'quantum-prism', label: 'Quantum Prism', Icon: Zap },
    { id: 'achievements', label: 'Achievements',   Icon: Trophy },
  ];

  const navigateToKnowledgeMap = useCallback(() => {
    if (onNavigateKnowledgeMap) {
      onNavigateKnowledgeMap();
      return;
    }
    if (typeof window !== 'undefined' && window.location.pathname !== '/knowledge-map') {
      window.history.pushState({ page: 'knowledge-map' }, '', '/knowledge-map');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'knowledge-map' } }));
    }
  }, [onNavigateKnowledgeMap]);

  const navigateToQuiz = useCallback(() => {
    const prefill = {
      subjectId: sessionSubjectId ?? null,
      subjectName: breakdown?.subject ?? null,
      specificArea: breakdown?.title ?? null,
    };

    if (onNavigateQuiz) {
      onNavigateQuiz(prefill);
      return;
    }

    const params = new URLSearchParams();
    const subjectId = prefill.subjectId?.trim();
    const subjectName = prefill.subjectName?.trim();
    const specificArea = prefill.specificArea?.trim();
    if (subjectId) {
      params.set('subjectId', subjectId);
    } else if (subjectName) {
      params.set('subject', subjectName);
    }
    if (specificArea) params.set('area', specificArea);

    const query = params.toString();
    const url = query ? `/quiz?${query}` : '/quiz';

    if (window.location.pathname !== '/quiz' || window.location.search !== (query ? `?${query}` : '')) {
      window.history.pushState({ page: 'quiz' }, '', url);
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'quiz' } }));
    }
  }, [breakdown?.subject, breakdown?.title, onNavigateQuiz, sessionSubjectId]);

  const sidebarNavItems = useMemo(() => (
    NAV_ITEMS.map(({ id, label, Icon }) => ({
      id,
      label,
      Icon,
      active: activeTab === id,
      onClick: () => {
        if (id === 'history') {
          onNavigateHistory?.();
          return;
        }
        if (id === 'knowledge-map') {
          navigateToKnowledgeMap();
          return;
        }
        if (id === 'flashcards') {
          onNavigateFlashcards?.();
          return;
        }
        if (id === 'quiz') {
          navigateToQuiz();
          return;
        }
        if (id === 'quantum-prism') {
          onNavigateQuantumPrism?.();
          return;
        }
        if (id === 'achievements') {
          onNavigateAchievements?.();
          return;
        }
        setActiveTab(id);
      },
    }))
  ), [activeTab, navigateToKnowledgeMap, navigateToQuiz, onNavigateAchievements, onNavigateFlashcards, onNavigateHistory, onNavigateQuantumPrism]);

  const selectedNodeKeyFormula = useMemo(() => {
    if (!selectedNode) return '';
    return nodeInsights[selectedNode.id]?.keyFormula ?? '';
  }, [nodeInsights, selectedNode]);
  const selectedNodeExpression = useMemo(() => {
    if (!selectedNode) return '';
    return selectedNode.mathContent || selectedNode.label || '';
  }, [selectedNode]);
  useEffect(() => {
    if (!selectedNode) return;
    const insight = nodeInsights[selectedNode.id];
    if (!insight) return;
    console.debug('[NodeInsight FE] render', {
      nodeId: selectedNode.id,
      nodeType: selectedNode.type,
      simpleBreakdownLength: (insight.simpleBreakdown ?? '').length,
      keyFormulaLength: (insight.keyFormula ?? '').length,
      preview: debugClip(insight.simpleBreakdown ?? ''),
    });
    logPageMathDebug('node-insight:render:simpleBreakdown', insight.simpleBreakdown ?? '', {
      nodeId: selectedNode.id,
      nodeType: selectedNode.type,
    });
    logPageMathDebug('node-insight:render:keyFormula', insight.keyFormula ?? '', {
      nodeId: selectedNode.id,
      nodeType: selectedNode.type,
    });
  }, [nodeInsights, selectedNode]);

  const activeBranchActionNode = useMemo(() => {
    if (!branchActionPortal || !breakdown) return null;
    const node = breakdown.nodes.find((n) => n.id === branchActionPortal.nodeId);
    if (!node) return null;
    return node;
  }, [branchActionPortal, breakdown]);
  const actionPortalActions = useMemo(() => {
    if (!activeBranchActionNode) return [];
    return [
      {
        id: 'regenerate',
        label: 'Regenerate Node',
        onClick: () => handleRegenerateBranchNode(activeBranchActionNode),
        disabled: branchActionBusy !== null,
        icon: branchActionBusy === 'regenerate'
          ? <Loader2 className="w-4 h-4 animate-spin text-secondary" />
          : <RefreshCw className="w-4 h-4 text-secondary" />,
      },
      {
        id: 'flashcard',
        label: 'Add To Flashcard',
        onClick: () => handleAddBranchToFlashcards(activeBranchActionNode),
        disabled: branchActionBusy !== null,
        icon: branchActionBusy === 'flashcard'
          ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
          : <Bookmark className="w-4 h-4 text-primary" />,
      },
      {
        id: 'copy',
        label: 'Copy Math',
        onClick: () => handleCopyBranchMath(activeBranchActionNode),
        disabled: branchActionBusy !== null,
        icon: <Copy className="w-4 h-4 text-tertiary" />,
      },
      {
        id: 'expand',
        label: 'Breakdown Further',
        onClick: () => handleBranchBreakdownFurther(activeBranchActionNode),
        disabled: branchActionBusy !== null || !!expandingId,
        icon: expandingId === activeBranchActionNode.id
          ? <Loader2 className="w-4 h-4 animate-spin text-secondary" />
          : <GitFork className="w-4 h-4 text-secondary" />,
      },
    ];
  }, [
    activeBranchActionNode,
    branchActionBusy,
    expandingId,
    handleAddBranchToFlashcards,
    handleBranchBreakdownFurther,
    handleCopyBranchMath,
    handleRegenerateBranchNode,
  ]);
  useEffect(() => {
    if (!branchActionPortal) return;
    if (activeBranchActionNode) return;
    setBranchActionPortal(null);
  }, [activeBranchActionNode, branchActionPortal]);

  const handleUpgradeToPro = useCallback(() => {
    if (onNavigatePlan) {
      onNavigatePlan();
      return;
    }
    if (typeof window !== 'undefined' && window.location.pathname !== '/plan') {
      window.history.pushState({ page: 'plan' }, '', '/plan');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'plan' } }));
    }
  }, [onNavigatePlan]);

  const toggleLayoutLock = useCallback(() => {
    const nextLocked = !isLayoutLocked;
    setIsLayoutLocked(nextLocked);
    try { localStorage.setItem('studyspace_layout_locked', String(nextLocked)); } catch {}
    if (nextLocked) {
      dragState.current = null;
      setDraggingId(null);
      clearBranchLongPressTimer();
      branchTouchGestureRef.current = null;
    }
  }, [clearBranchLongPressTimer, isLayoutLocked]);

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed top-1/4 -right-20 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-1/4 -left-20 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <AppHeader
        user={user}
        onSettingsClick={onNavigateSettings}
        onSignOut={handleSignOut}
        onNavigateKnowledgeMap={onNavigateKnowledgeMap}
        onNavigateHistory={onNavigateHistory}
        onNavigateFlashcards={onNavigateFlashcards}
        onNavigateAchievements={onNavigateAchievements}
        onNavigateQuiz={navigateToQuiz}
        activeMobileMenu="study"
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
        onNotificationClick={sessionId ? () => setIsActivityDrawerOpen(true) : undefined}
        notificationCount={sessionId ? unseenActivityCount : 0}
        left={

          <nav className="hidden md:flex gap-6 items-center">
            {['Focus Mode', 'Workspace', 'Library'].map((label, i) => (
              <a key={label} href="#"
                className={`font-headline tracking-tight uppercase text-sm transition-all duration-300 ${
                  i === 0 ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >{label}</a>
            ))}
          </nav>
        }
        actions={
          <button
            onClick={() => setShowInput(true)}
            className="bg-gradient-to-r from-primary to-secondary text-on-primary px-5 py-1.5 rounded-full font-headline font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Problem
          </button>
        }
      />

      <AppSidebar
        brandTitle="Neural Breakdown"
        brandSubtitle="Quantum Prism Engine"
        brandIcon={GitFork}
        navItems={sidebarNavItems}
        primaryAction={{ label: 'Upgrade to Pro', onClick: handleUpgradeToPro }}
        onSignOut={handleSignOut}
        collapsible
        defaultPinned={false}
        onExpandedChange={setSidebarExpanded}
      />

      {/* ── Main Canvas ─────────────────────────────────────────────────── */}
      <motion.main
        animate={{ paddingLeft: isMobile ? 0 : (sidebarExpanded ? 256 : 64) }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="pt-14 h-screen flex relative overflow-hidden pb-14 sm:pb-0"
      >

        {/* Problem Map */}
        <section className="flex-1 relative flex flex-col overflow-hidden">

          {/* Title bar (when breakdown loaded) */}
          {breakdown && !loading && (
            <div className="px-2 sm:px-4 md:px-6 pt-1.5 sm:pt-2 md:pt-2.5 pb-0 shrink-0 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-tertiary text-[9px] sm:text-[10px] font-bold tracking-[0.1em] sm:tracking-[0.14em] uppercase">Active Analysis</span>
                <div className="font-headline text-sm sm:text-lg md:text-xl font-bold text-on-surface mt-0 sm:mt-0.5 tracking-tight leading-snug">
                  <RichText discreet>{breakdown.title.split(' ').slice(0, -1).join(' ') + ' '}</RichText>
                  <span className="text-secondary"><RichText discreet>{breakdown.title.split(' ').slice(-1)[0]}</RichText></span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Invite collaborators */}
                {sessionId && (
                  <button
                    onClick={() => setIsCollabModalOpen(true)}
                    title="Invite collaborators"
                    aria-label="Invite collaborators"
                    className="w-9 h-9 rounded-xl backdrop-blur border bg-surface-container-highest/80 border-outline-variant/30 text-on-surface-variant hover:text-secondary hover:border-secondary/40 flex items-center justify-center transition-colors shadow-md relative"
                  >
                    <Users className="w-4 h-4" />
                    {collabMembers.length > 1 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-secondary text-on-secondary text-[8px] font-bold flex items-center justify-center">
                        {collabMembers.length}
                      </span>
                    )}
                  </button>
                )}
                {/* Lock layout */}
                <button
                  onClick={toggleLayoutLock}
                  title={isLayoutLocked ? 'Unlock node layout' : 'Lock node layout'}
                  aria-label={isLayoutLocked ? 'Unlock node layout' : 'Lock node layout'}
                  aria-pressed={isLayoutLocked}
                  className={`w-9 h-9 rounded-xl backdrop-blur border flex items-center justify-center transition-colors shadow-md ${
                    isLayoutLocked
                      ? 'bg-surface-container-highest border-primary/50 text-primary'
                      : 'bg-surface-container-highest/80 border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/40'
                  }`}
                >
                  {isLayoutLocked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Canvas area */}
          <div className="flex-1 relative overflow-hidden">
          {/* Zoom controls overlay */}
          <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-1.5">
            <button
              onClick={() => setScale(s => Math.min(2, +(s + 0.1).toFixed(2)))}
              title="Zoom in"
              className="w-8 h-8 rounded-xl bg-surface-container-highest/80 backdrop-blur border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shadow-md"
            ><ZoomIn className="w-4 h-4" /></button>
            <button
              onClick={() => setScale(1)}
              title="Reset zoom"
              className="w-8 h-8 rounded-xl bg-surface-container-highest/80 backdrop-blur border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shadow-md"
            ><Maximize2 className="w-4 h-4" /></button>
            <button
              onClick={() => setScale(s => Math.max(0.25, +(s - 0.1).toFixed(2)))}
              title="Zoom out"
              className="w-8 h-8 rounded-xl bg-surface-container-highest/80 backdrop-blur border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shadow-md"
            ><ZoomOut className="w-4 h-4" /></button>
            <div className="text-center text-[10px] font-bold text-on-surface-variant tabular-nums">
              {Math.round(scale * 100)}%
            </div>
          </div>

          <div
            ref={scrollerRef}
            className="absolute inset-0 overflow-auto"
            style={{ cursor: draggingId ? 'grabbing' : 'default' }}
          >

            {/* Loading overlay */}
            <AnimatePresence>
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20 bg-background/60 backdrop-blur-sm"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shadow-[0_0_40px_rgba(161,250,255,0.3)]">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
                  </div>
                  <div className="text-center">
                    <SweepText
                      text="Building concept tree..."
                      duration={1550}
                      dimColor="rgba(255,255,255,0.42)"
                      brightColor="rgba(161,250,255,0.98)"
                      style={{
                        fontSize: '0.75rem',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                      }}
                      containerStyle={{ marginTop: '0.3rem' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            {!breakdown && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-8 text-center p-12"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_60px_rgba(161,250,255,0.2)]">
                    <GitFork className="w-12 h-12 text-primary/60" />
                  </div>
                  <div className="absolute inset-0 rounded-full border border-primary/10 animate-ping" />
                </div>
                <div>
                  <h2 className="font-headline text-3xl font-bold text-on-surface mb-3">Ready to Analyze</h2>
                  <p className="text-on-surface-variant max-w-sm leading-relaxed">
                    Enter any problem, equation, or concept and watch the neural engine decompose it into a knowledge tree.
                  </p>
                </div>
                <button
                  onClick={() => setShowInput(true)}
                  className="bg-gradient-to-r from-primary to-secondary text-on-primary px-8 py-3 rounded-full font-headline font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(161,250,255,0.3)] hover:scale-105 transition-transform"
                >
                  <Plus className="w-5 h-5" /> New Problem
                </button>
              </motion.div>
            )}

            {/* Neural tree */}
            {breakdown && !loading && Object.keys(positions).length > 0 && (
              <div style={{ width: canvasW, height: canvasH, position: 'relative', minWidth: '100%', zoom: scale }}>

                {/* SVG lines */}
                <svg
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a1faff" />
                      <stop offset="100%" stopColor="#ff51fa" />
                    </linearGradient>
                  </defs>
                  {breakdown.nodes.map(node => {
                    if (!node.parentId) return null;
                    const p = positions[node.parentId];
                    const c = positions[node.id];
                    if (!p || !c) return null;
                    return (
                      <line
                        key={node.id}
                        x1={p.x + offsetX} y1={p.y + offsetY}
                        x2={c.x + offsetX} y2={c.y + offsetY}
                        stroke="url(#lg)"
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        strokeDasharray={node.type === 'leaf' ? '5 4' : undefined}
                      />
                    );
                  })}
                </svg>

                {/* Nodes */}
                {breakdown.nodes.map(node => {
                  const pos = positions[node.id];
                  if (!pos) return null;
                  const isSelected  = selectedNode?.id === node.id;
                  const isDragging  = draggingId === node.id;

                  return (
                    <NodeCard
                      key={node.id}
                      node={node}
                      pos={pos}
                      offsetX={offsetX}
                      offsetY={offsetY}
                      isSelected={isSelected}
                      isDragging={isDragging}
                      isLayoutLocked={isLayoutLocked}
                      expandingId={expandingId}
                      startDrag={startDrag}
                      handleBranchTouchStart={handleBranchTouchStart}
                      handleBranchTouchMove={handleBranchTouchMove}
                      handleBranchTouchEnd={handleBranchTouchEnd}
                      handleBranchTouchCancel={handleBranchTouchCancel}
                      openBranchActionPortal={openBranchActionPortal}
                      selectNode={selectNode}
                      handleExpand={handleExpand}
                      suppressBranchClickRef={suppressBranchClickRef}
                    />
                  );
                })}

                {/* Floating AI orb */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none">
                  <div className="relative w-10 h-10 bg-primary/10 rounded-full shadow-[0_0_30px_rgba(161,250,255,0.3)] flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-30" />
                    <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                  </div>
                  <span className="text-[9px] font-bold tracking-[0.3em] text-primary uppercase">Neural Pulse Active</span>
                </div>
              </div>
            )}
          </div>{/* end scroller */}
          </div>{/* end canvas area */}
        </section>

        {/* ── Right Panel ─────────────────────────────────────────────────── */}
        <motion.aside
          animate={{
            width: selectedNode && isInsightPanelOpen ? insightPanelWidth : 0,
            opacity: selectedNode && isInsightPanelOpen ? 1 : 0,
            x: selectedNode && isInsightPanelOpen ? insightSwipeOffsetX : 24,
          }}
          transition={{
            width: isResizing ? { duration: 0 } : { duration: 0.22, ease: 'easeInOut' },
            opacity: { duration: 0.18, ease: 'easeOut' },
            x: isInsightSwipeDragging
              ? { duration: 0 }
              : { type: 'spring', stiffness: 420, damping: 34, mass: 0.35 },
          }}
          className="h-full bg-surface-container-low/80 backdrop-blur-md border-l border-outline-variant/10 shrink-0 relative overflow-hidden z-20"
        >
          {/* Resize Handle */}
          {selectedNode && isInsightPanelOpen && (
            <div
              onMouseDown={handlePanelResizeMouseDown}
              className="absolute inset-y-0 left-0 w-2 cursor-col-resize z-30 group"
            >
              <div className="absolute inset-y-0 left-0 w-[2px] bg-primary/0 group-hover:bg-primary/30 transition-colors" />
            </div>
          )}

          {selectedNode && isInsightPanelOpen && (
            <NodeInsightPanel
              selectedNode={selectedNode}
              breakdown={breakdown}
              nodeInsights={nodeInsights}
              nodeConversations={nodeConversations}
              sessionVisualTable={sessionVisualTable}
              expression={selectedNodeExpression}
              keyFormula={selectedNodeKeyFormula}
              insightLoading={insightLoading}
              composerLoading={composerLoading}
              composerError={composerError}
              sessionId={sessionId}
              isInsightSwipeDragging={isInsightSwipeDragging}
              imageLoading={isDeepDiveImageAnalyzing}
              hasAttachment={hasDeepDiveAttachment}
              onAskDeepDive={handleAskDeepDive}
              onExplainToFiveYearOld={handleExplainToFiveYearOld}
              onClose={closeInsightPanel}
              onSyncVisualTable={async () => {
                if (!sessionId) return;
                showActionToast('Syncing from cloud...');
                try {
                  const { session } = await api.get<{ session: any }>(`/api/sessions/${sessionId}`);
                  if (session?.visual_table_json) {
                    const vt = parseJsonSafe<VisualTableData>(session.visual_table_json);
                    setSessionVisualTable(vt);
                    showActionToast('Table restored!');
                  } else {
                    showActionToast('No table found in cloud.');
                  }
                } catch {
                  showActionToast('Sync failed.');
                }
              }}
              onAttachFile={handleAttachDeepDiveFile}
              onImageCropRequest={handleImageCropRequest}
              onClearAttachment={() => {
                setDeepDiveUploadId(null);
                setHasDeepDiveAttachment(false);
              }}
              onExpandTable={setExpandedTable}
              isExpanded={isInsightExpanded}
              onToggleExpand={handleToggleInsightExpand}
              onSaveInsight={async (node) => {
                const insight = nodeInsights[node.id];
                if (!insight) return;
                await saveInsight({
                  nodeLabel: node.label,
                  subject: breakdown?.subject ?? 'General',
                  simpleBreakdown: insight.simpleBreakdown,
                  keyFormula: insight.keyFormula,
                });
                showActionToast('Insight saved to Knowledge.');
              }}
              onSaveVisualTable={async (table, label) => {
                await saveVisualTable({
                  title: label ?? selectedNode?.label ?? 'Table',
                  subject: breakdown?.subject ?? 'General',
                  nodeLabel: selectedNode?.label ?? null,
                  table,
                });
                showActionToast('Table saved to Knowledge.');
              }}
              onSaveConversationMessage={async (question, answer) => {
                await saveConversationMessage({
                  question,
                  answer,
                  subject: breakdown?.subject ?? 'General',
                  nodeLabel: selectedNode?.label ?? '',
                });
                showActionToast('Q&A saved to Knowledge.');
              }}
              onBreakdownConversation={handleBreakdownConversation}
              onSaveNodeBreakdown={async (node) => {
                await saveNodeBreakdown({
                  label: node.label,
                  description: node.description,
                  mathContent: node.mathContent,
                  subject: breakdown?.subject ?? 'General',
                });
                showActionToast('Node saved to Knowledge.');
              }}
              onTouchStart={handleInsightSwipeStart}
              onTouchMove={handleInsightSwipeMove}
              onTouchEnd={handleInsightSwipeEnd}
            />

          )}
        </motion.aside>
      </motion.main>

      <ActionPopover
        open={!!(branchActionPortal && activeBranchActionNode)}
        position={branchActionPortal}
        onRequestClose={() => setBranchActionPortal(null)}
        title="Action Portal"
        subtitle={activeBranchActionNode ? <RichText>{activeBranchActionNode.label}</RichText> : null}
        actions={actionPortalActions}
      />

      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[65] rounded-full px-4 py-2 text-xs font-medium bg-surface-container-highest border border-outline-variant/35 shadow-xl"
          >
            {actionToast}
          </motion.div>
        )}
      </AnimatePresence>

      <ProblemComposer
        open={showInput}
        value={problemInput}
        loading={loading}
        imageLoading={isImageAnalyzing}
        error={error}
        onChange={(next) => {
          // Only clear OCR refs if the user has removed the OCR-extracted content entirely
          // (don't clear if they just prepended extra text before the OCR insert)
          if (lastOcrInsertRef.current && !next.includes(lastOcrInsertRef.current.slice(0, 40))) {
            lastOcrInsertRef.current = null;
            lastOcrUploadIdRef.current = null;
            setOcrDetectedSignTable(false);
          }
          setProblemInput(next);
          if (error) setError(null);
        }}
        hasVisualTable={ocrDetectedSignTable}
        onSubmit={handleSubmit}
        onClose={() => setShowInput(false)}
        onAttachFile={handleAttachProblemFile}
        onImageCropRequest={handleImageCropRequest}
      />

      {showDebugOverlay && (
        <div className="fixed left-2 right-2 bottom-16 sm:left-auto sm:right-4 sm:w-[520px] z-[70] bg-black/85 border border-white/20 rounded-xl p-3 text-[11px] text-white backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold tracking-wide">Study Debug Trace</span>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(STUDY_DEBUG_TRACE_KEY);
                setDebugEntries([]);
              }}
              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="max-h-44 overflow-auto space-y-1 font-mono">
            {debugEntries.length === 0 && (
              <div className="text-white/60">No events yet...</div>
            )}
            {debugEntries.map((entry, idx) => (
              <div key={`${entry.stamp}_${entry.event}_${idx}`} className="border-b border-white/10 pb-1">
                <div className="text-white/80">
                  {entry.stamp} | {entry.event}
                </div>
                {entry.payload && (
                  <pre className="text-white/60 whitespace-pre-wrap break-words">
                    {JSON.stringify(entry.payload)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global table expand modal */}
      <Modal
        isOpen={!!expandedTable}
        onClose={() => setExpandedTable(null)}
        showCloseButton={false}
        maxWidth="fit"
        containerClassName="!bg-transparent !border-0 !shadow-none"
      >
        <div className="overflow-auto max-h-[80vh] [&_table]:w-auto [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
          <div className="w-fit mx-auto">
            {expandedTable && <VisualTable table={expandedTable} />}
          </div>
        </div>
      </Modal>

      {/* Collaboration invite modal */}
      <CollabInviteModal
        isOpen={isCollabModalOpen}
        sessionId={sessionId}
        currentUserId={user?.id ?? user?.sub ?? null}
        members={collabMembers}
        isLoadingMembers={collabLoadingMembers}
        activity={collabActivity}
        isLoadingActivity={collabLoadingActivity}
        onClose={() => setIsCollabModalOpen(false)}
        onCreateInviteLink={createInviteLink}
        onRemoveMember={removeCollabMember}
      />

      {/* ── Activity Drawer ──────────────────────────────────────────── */}
      <AnimatePresence>
        {isActivityDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="activity-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-background/50 backdrop-blur-sm"
              onClick={() => setIsActivityDrawerOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="activity-drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm z-[81] bg-surface-container-low border-l border-outline-variant/20 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 shrink-0">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h2 className="font-headline font-bold text-sm uppercase tracking-widest">Activity Log</h2>
                </div>
                <button
                  onClick={() => setIsActivityDrawerOpen(false)}
                  className="w-7 h-7 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {collabLoadingActivity && collabActivity.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-on-surface-variant">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : collabActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant gap-3">
                    <Activity className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No activity yet.</p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {collabActivity.map((entry, i) => {
                      const actionText = (() => {
                        switch (entry.action) {
                          case 'session_created':   return 'created this session';
                          case 'session_updated': {
                            const fields = entry.metadata.fields as string[] | undefined;
                            return fields?.length ? `updated ${fields.join(', ')}` : 'updated the session';
                          }
                          case 'deep_dive_message':  return 'sent a deep dive message';
                          case 'invitation_created': return `created a ${entry.metadata.role ?? ''} invite link`;
                          case 'member_joined':      return `joined as ${entry.metadata.role ?? 'member'}`;
                          case 'member_left':        return 'left the session';
                          case 'member_removed':     return 'was removed from the session';
                          default:                   return (entry.action as string).replace(/_/g, ' ');
                        }
                      })();
                      const diff = Date.now() - new Date(entry.created_at).getTime();
                      const mins = Math.floor(diff / 60000);
                      const timeLabel = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                      // Build before/after diff rows for session_updated entries
                      const diffRows = (() => {
                        if (entry.action !== 'session_updated') return null;
                        const before = entry.metadata.before as Record<string, unknown> | undefined;
                        const after = entry.metadata.after as Record<string, unknown> | undefined;
                        if (!before || !after) return null;
                        const LABEL: Record<string, string> = { title: 'Title', subject: 'Subject', problem: 'Problem', node_count: 'Nodes' };
                        return Object.keys(after).map((key) => {
                          const oldVal = String(before[key] ?? '');
                          const newVal = String(after[key] ?? '');
                          if (oldVal === newVal) return null;
                          const label = LABEL[key] ?? key;
                          const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s;
                          return (
                            <div key={key} className="mt-1 text-[10px] leading-relaxed rounded-md bg-surface-container px-2 py-1 text-on-surface-variant">
                              <span className="font-medium text-on-surface-variant/70">{label}: </span>
                              <span className="line-through opacity-60">{truncate(oldVal, 48)}</span>
                              <span className="mx-1 opacity-40">→</span>
                              <span className="text-primary font-medium">{truncate(newVal, 48)}</span>
                            </div>
                          );
                        }).filter(Boolean);
                      })();

                      return (
                        <li key={entry.id} className="flex gap-3 relative">
                          {/* Connector line */}
                          {i < collabActivity.length - 1 && (
                            <div className="absolute left-3 top-7 bottom-0 w-px bg-outline-variant/20" />
                          )}
                          {/* Avatar */}
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5 z-10">
                            {entry.actor_name ? entry.actor_name.slice(0, 2).toUpperCase() : '??'}
                          </div>
                          <div className="flex-1 min-w-0 pb-1">
                            <p className="text-sm text-on-surface leading-snug">
                              <span className="font-semibold">{entry.actor_name ?? 'Someone'}</span>
                              {' '}{actionText}
                            </p>
                            {diffRows && diffRows.length > 0 && (
                              <div className="mt-1 space-y-0.5">{diffRows}</div>
                            )}
                            <p className="text-[11px] text-on-surface-variant mt-0.5">{timeLabel}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Global image crop modal */}
      {globalCropState && (
        <ImageCropModal
          imageSrc={globalCropState.src}
          fileName={globalCropState.name}
          onConfirm={async (file) => {
            const handler = globalCropState.onConfirm;
            setGlobalCropState(null);
            await handler(file);
          }}
          onCancel={() => {
            URL.revokeObjectURL(globalCropState.src);
            setGlobalCropState(null);
          }}
        />
      )}

      {/* Table modal chrome — fixed to screen edges */}
      <AnimatePresence>
        {expandedTable && (
          <>
            <motion.div
              key="table-modal-title"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="fixed top-5 left-5 z-[101] pointer-events-none"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {expandedTable.type === 'sign_analysis' ? 'Sign Table' : 'Table'}
              </span>
            </motion.div>
            <motion.button
              key="table-modal-close"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onClick={() => setExpandedTable(null)}
              className="fixed top-4 right-4 z-[101] p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors"
              aria-label="Close table"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
