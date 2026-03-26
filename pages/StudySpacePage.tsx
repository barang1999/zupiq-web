import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GitFork, History, BookOpen, Users, Archive,
  Plus, X, Loader2, Sparkles,
  Bookmark, Zap, LogOut, HelpCircle, ArrowRight, Paperclip,
  ChevronLeft, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { api } from '../lib/api';
import { MathText } from '../components/ui/MathText';
import { RichText } from '../components/ui/RichText';
import { supabase } from '../lib/supabase';
import { firebaseSignOut } from '../lib/firebase';

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

// ─── Layout ───────────────────────────────────────────────────────────────────

const NODE_MIN_DIST = 240; // min px between node centers

function debugClip(text: string, max = 120): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}...`;
}

function isPageMathDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const flag = (window as unknown as { __ZUPIQ_PAGE_DEBUG__?: boolean }).__ZUPIQ_PAGE_DEBUG__;
  return flag !== false;
}

function toCodePoints(input: string): string[] {
  return Array.from(input).map((ch) => `U+${ch.codePointAt(0)!.toString(16).toUpperCase()}`);
}

function extractInlineMathTokens(text: string): string[] {
  if (!text) return [];
  return text.match(/\$[^$\n]+\$/g) ?? [];
}

function extractEscapedInlineMathTokens(text: string): string[] {
  if (!text) return [];
  return text.match(/\\\$[^$\n]+\\\$/g) ?? [];
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
  onNavigateSettings?: () => void;
  initialBreakdown?: ProblemBreakdown | null;
  onBreakdownConsumed?: () => void;
}

export function StudySpacePage({ user, onNavigateHistory, onNavigateSettings, initialBreakdown, onBreakdownConsumed }: Props) {
  const [breakdown,      setBreakdown]      = useState<ProblemBreakdown | null>(null);
  const [sessionId,      setSessionId]      = useState<string | null>(null);
  const [positions,      setPositions]      = useState<Record<string, NodePos>>({});
  const [selectedNode,   setSelectedNode]   = useState<BreakdownNode | null>(null);
  const [draggingId,     setDraggingId]     = useState<string | null>(null);
  const [expandingId,    setExpandingId]    = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [composerLoading, setComposerLoading] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [nodeInsights,   setNodeInsights]   = useState<Record<string, NodeInsight>>({});
  const [nodeConversations, setNodeConversations] = useState<Record<string, NodeConversationMessage[]>>({});
  const [showInput,      setShowInput]      = useState(false);
  const [problemInput,   setProblemInput]   = useState('');
  const [composerInput,  setComposerInput]  = useState('');
  const [activeTab,      setActiveTab]      = useState<string>('map');
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [scale,          setScale]          = useState(1);
  const isExpanded = sidebarOpen || sidebarHovered;

  const dragState  = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scaleRef   = useRef(1);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

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

  // Always-current refs used by save callbacks to avoid stale closures
  const positionsRef      = useRef<Record<string, NodePos>>({});
  const nodeInsightsRef   = useRef<Record<string, NodeInsight>>({});
  const nodeConversationsRef = useRef<Record<string, NodeConversationMessage[]>>({});
  const breakdownRef      = useRef<ProblemBreakdown | null>(null);
  const sessionIdRef      = useRef<string | null>(null);
  useEffect(() => { positionsRef.current      = positions; },      [positions]);
  useEffect(() => { nodeInsightsRef.current   = nodeInsights; },   [nodeInsights]);
  useEffect(() => { nodeConversationsRef.current = nodeConversations; }, [nodeConversations]);
  useEffect(() => { breakdownRef.current      = breakdown; },      [breakdown]);
  useEffect(() => { sessionIdRef.current      = sessionId; },      [sessionId]);

  const hydrateBreakdown = useCallback((bd: ProblemBreakdown) => {
    const brs = bd.nodes.filter((n: BreakdownNode) => n.type === 'branch').length;
    const lvs = bd.nodes.filter((n: BreakdownNode) => n.type === 'leaf').length;
    const w = Math.max(1000, (brs + 1) * 320);
    const h = lvs > 0 ? 700 : 540;
    const hasSavedPositions = Object.keys(bd.nodePositions ?? {}).length > 0;
    const restoredPositions = hasSavedPositions
      ? bd.nodePositions!
      : resolveCollisions(computeInitialPositions(bd.nodes, w, h));
    setBreakdown(bd);
    setSessionId(bd.id ?? null);
    setNodeInsights(bd.nodeInsights ?? {});
    setNodeConversations(bd.nodeConversations ?? {});
    setPositions(restoredPositions);
    setSelectedNode(bd.nodes.find((n: BreakdownNode) => n.type === 'root') ?? null);
    setShowInput(false);
    setComposerInput('');
    if (bd.id) localStorage.setItem('zupiq_lastSessionId', bd.id);
  }, []);

  const persistBreakdownData = useCallback((
    nextNodeInsights: Record<string, NodeInsight>,
    nextNodeConversations: Record<string, NodeConversationMessage[]>
  ) => {
    if (!sessionId || !breakdown) return;
    const updatedBreakdown: ProblemBreakdown = {
      ...breakdown,
      nodeInsights: nextNodeInsights,
      nodeConversations: nextNodeConversations,
      nodePositions: positionsRef.current,
    };
    setBreakdown(updatedBreakdown);
    api.put(`/api/sessions/${sessionId}`, {
      breakdown_json: JSON.stringify(updatedBreakdown),
    }).catch(err => console.error('Failed to persist insight:', err));
  }, [breakdown, sessionId]);

  const persistNodeInsights = useCallback((nextNodeInsights: Record<string, NodeInsight>) => {
    persistBreakdownData(nextNodeInsights, nodeConversations);
  }, [nodeConversations, persistBreakdownData]);

  const persistNodeConversations = useCallback((nextNodeConversations: Record<string, NodeConversationMessage[]>) => {
    persistBreakdownData(nodeInsights, nextNodeConversations);
  }, [nodeInsights, persistBreakdownData]);

  // Load from navigation payload first; otherwise restore most recent saved session.
  // Use a ref so clearing initialBreakdown after consuming it doesn't re-trigger the fallback.
  const initialBreakdownRef = useRef(initialBreakdown);
  useEffect(() => {
    const bd = initialBreakdownRef.current;
    if (bd) {
      hydrateBreakdown(bd);
      onBreakdownConsumed?.();
      return;
    }

    let cancelled = false;
    api.get<{ sessions: Array<{ id: string; breakdown_json: string }> }>('/api/sessions')
      .then(({ sessions }) => {
        if (cancelled || !sessions?.length) return;
        const lastId = localStorage.getItem('zupiq_lastSessionId');
        const target = (lastId && sessions.find(s => s.id === lastId)) || sessions[0];
        try {
          const parsed = JSON.parse(target.breakdown_json) as ProblemBreakdown;
          parsed.id = target.id;
          hydrateBreakdown(parsed);
        } catch {
          // Ignore malformed historical payloads
        }
      })
      .catch(() => {
        // Non-blocking restore failure
      });

    return () => { cancelled = true; };
  }, [hydrateBreakdown]);

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
    if (nodeInsights[selectedNode.id]) return; // already cached
    console.debug('[NodeInsight FE] auto request', {
      nodeId: selectedNode.id,
      nodeType: selectedNode.type,
      subject: breakdown.subject,
      level: 'standard',
      nodeLabelLength: (selectedNode.label ?? '').length,
      nodeMathLength: (selectedNode.mathContent || selectedNode.label || '').length,
      nodeLabelPreview: debugClip(selectedNode.label ?? ''),
    });
    setInsightLoading(true);
    api.post<{ insight: NodeInsight }>('/api/ai/node-insight', {
      nodeLabel: selectedNode.label,
      nodeDescription: selectedNode.description,
      nodeMathContent: selectedNode.mathContent || selectedNode.label,
      subject: breakdown.subject,
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
        setNodeInsights(prev => {
          const next = { ...prev, [selectedNode.id]: insight };
          persistNodeInsights(next);
          return next;
        });
      })
      .catch((err) => {
        console.error('[NodeInsight FE] auto request failed', {
          nodeId: selectedNode.id,
          error: err?.message ?? String(err),
        });
        // fallback to node description so panel isn't empty
        setNodeInsights(prev => {
          const next = {
            ...prev,
            [selectedNode.id]: {
              simpleBreakdown: selectedNode.description,
              keyFormula: selectedNode.mathContent || '',
            },
          };
          persistNodeInsights(next);
          return next;
        });
      })
      .finally(() => setInsightLoading(false));
  }, [breakdown, nodeInsights, persistNodeInsights, selectedNode]);

  const startDrag = useCallback((e: React.MouseEvent, id: string) => {
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
  }, [positions]);

  const startTouchDrag = useCallback((e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    dragState.current = {
      id,
      startX: touch.clientX,
      startY: touch.clientY,
      origX: positions[id]?.x ?? 0,
      origY: positions[id]?.y ?? 0,
    };
    setDraggingId(id);
  }, [positions]);

  useEffect(() => { if (showInput) inputRef.current?.focus(); }, [showInput]);
  useEffect(() => { setComposerInput(''); setComposerError(null); }, [selectedNode?.id]);

  const handleSubmit = async () => {
    if (!problemInput.trim()) return;
    const trimmedProblem = problemInput.trim();
    setLoading(true);
    setError(null);
    setSessionId(null);
    setNodeInsights({});
    setNodeConversations({});
    setSelectedNode(null);
    setBreakdown(null);
    setPositions({});
    try {
      const { breakdown: bd } = await api.post<{ breakdown: ProblemBreakdown }>(
        '/api/ai/breakdown',
        { problem: trimmedProblem }
      );
      let newSessionId: string | null = null;
      try {
        const { session } = await api.post<{ session: { id: string } }>('/api/sessions', {
          title: bd.title,
          subject: bd.subject,
          problem: trimmedProblem,
          node_count: bd.nodes.length,
          breakdown_json: JSON.stringify(bd),
        });
        newSessionId = session.id;
      } catch {
        // Session save is non-blocking; user can still continue
      }
      // Compute initial layout right here — avoids useEffect re-triggering on expansions
      const brs = bd.nodes.filter(n => n.type === 'branch').length;
      const lvs = bd.nodes.filter(n => n.type === 'leaf').length;
      const w = Math.max(1000, (brs + 1) * 320);
      const h = lvs > 0 ? 700 : 540;
      const initial = computeInitialPositions(bd.nodes, w, h);
      setBreakdown({
        ...bd,
        id: newSessionId ?? undefined,
        nodeInsights: bd.nodeInsights ?? {},
        nodeConversations: bd.nodeConversations ?? {},
      });
      setSessionId(newSessionId);
      setNodeInsights(bd.nodeInsights ?? {});
      setNodeConversations(bd.nodeConversations ?? {});
      setPositions(resolveCollisions(initial));
      setSelectedNode(bd.nodes.find(n => n.type === 'root') ?? null);
      setShowInput(false);
      setProblemInput('');
      setComposerInput('');
    } catch (err: any) {
      setError(err.message ?? 'Failed to break down problem');
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (node: BreakdownNode) => {
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

      setBreakdown(prev => prev ? { ...prev, nodes: [...prev.nodes, ...newNodes] } : prev);
      setPositions(prev => resolveCollisions({ ...prev, ...newPositions }, node.id));
    } catch (err: any) {
      setError(err.message ?? 'Expansion failed');
    } finally {
      setExpandingId(null);
    }
  };

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
      
      const newNodeInsights = { ...nodeInsights, [selectedNode.id]: insight };
      setNodeInsights(newNodeInsights);
      persistNodeInsights(newNodeInsights);
    } catch (err) {
      console.error('[NodeInsight FE] kid request failed', err);
    } finally {
      setInsightLoading(false);
    }
  };

  const handleAskDeepDive = async () => {
    if (!selectedNode || !breakdown) return;
    const question = composerInput.trim();
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
    setComposerInput('');
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

      const { response, session_id } = await api.post<{ response: string; session_id?: string }>('/api/ai/chat', {
        messages,
        subject: breakdown.subject,
        session_id: sessionId ?? undefined,
      });

      let effectiveSessionId = session_id ?? sessionId ?? undefined;
      if (session_id && !sessionId) setSessionId(session_id);

      let finalResponse = (response ?? '').trim();
      if (/(\$[^$\n]+\$\s*\*:)|\\frac|\\\$|\$|\\[a-zA-Z]+/.test(finalResponse)) {
        console.log('[DeepDive raw model response]', finalResponse);
        logPageMathDebug('deep-dive:model-response', finalResponse, {
          nodeId: selectedNode.id,
        });
      }
      const looksTruncated = finalResponse.length > 0 && !/[.!?]"?$/.test(finalResponse);

      // If response appears cut mid-sentence, request continuation once.
      if (looksTruncated) {
        const continuePrompt = `${contextPrompt}

Continue exactly from your last sentence for the same selected branch.
Do not repeat content already given.`;
        const continuationMessages: Array<{ role: 'user' | 'model'; content: string }> = [
          ...messages,
          { role: 'model', content: finalResponse },
          { role: 'user', content: continuePrompt },
        ];
        const continuation = await api.post<{ response: string; session_id?: string }>('/api/ai/chat', {
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
      }

      const modelMessage: NodeConversationMessage = {
        role: 'model',
        content: finalResponse || 'No response generated. Try rephrasing your question.',
        createdAt: new Date().toISOString(),
      };
      const completedMessages = [...nextMessages, modelMessage];
      const completedConversations = { ...nextConversations, [selectedNode.id]: completedMessages };
      setNodeConversations(completedConversations);
      persistNodeConversations(completedConversations);
    } catch (err: any) {
      console.error('Failed to generate deep dive response:', err);
      setComposerInput(question);
      setComposerError(err?.message ?? 'Failed to generate deep dive response');
    } finally {
      setComposerLoading(false);
    }
  };


  const NAV_ITEMS = [
    { id: 'map',         label: 'Neural Map',   Icon: GitFork },
    { id: 'history',     label: 'History',       Icon: History },
    { id: 'concepts',    label: 'Base Concepts', Icon: BookOpen },
    { id: 'collaborate', label: 'Collaborate',   Icon: Users },
    { id: 'archives',    label: 'Archives',      Icon: Archive },
  ];

  const isBranchSelected = !!selectedNode;
  const activeBranchConversation = selectedNode
    ? (nodeConversations[selectedNode.id] ?? [])
    : [];
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

  const composerPlaceholder = selectedNode
    ? `Ask Zupiq about ${selectedNode.label}...`
    : 'Select a node to start deep dive...';

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed top-1/4 -right-20 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-1/4 -left-20 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <AppHeader
        user={user}
        onSettingsClick={onNavigateSettings}
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

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: isExpanded ? 256 : 64 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className="fixed left-0 h-full z-40 bg-surface-container-low flex flex-col pt-20 pb-6 text-sm font-medium overflow-hidden"
        style={{ width: isExpanded ? 256 : 64 }}
      >
        {/* Brand */}
        <div className={`mb-8 overflow-hidden transition-all duration-200 ${isExpanded ? 'px-6' : 'px-0 flex justify-center'}`}>
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <h2 className="font-headline font-bold text-lg text-secondary leading-tight whitespace-nowrap">Neural Breakdown</h2>
                <p className="text-on-surface-variant text-xs uppercase tracking-widest opacity-70 mt-1 whitespace-nowrap">Quantum Prism Engine</p>
              </motion.div>
            ) : (
              <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <GitFork className="w-5 h-5 text-secondary" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => { if (id === 'history') { onNavigateHistory?.(); } else { setActiveTab(id); } }}
                title={!isExpanded ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 transition-all duration-200 text-left ${
                  isActive
                    ? isExpanded
                      ? 'rounded-r-full bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary'
                      : 'rounded-xl bg-primary/15 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-xl'
                } ${!isExpanded ? 'justify-center' : ''}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="mt-auto space-y-4 px-2">
          <AnimatePresence>
            {isExpanded && (
              <motion.button
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full py-3 px-4 rounded-xl bg-surface-container-highest border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/10 transition-all whitespace-nowrap overflow-hidden"
              >
                Upgrade to Pro
              </motion.button>
            )}
          </AnimatePresence>
          <div className={`pt-4 border-t border-outline-variant/20 flex flex-col gap-2 ${!isExpanded ? 'items-center' : ''}`}>
            <a
              href="#"
              title={!isExpanded ? 'Support' : undefined}
              className={`flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors ${!isExpanded ? 'justify-center p-2 rounded-xl hover:bg-surface-container' : 'px-1'}`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="text-xs overflow-hidden whitespace-nowrap">
                    Support
                  </motion.span>
                )}
              </AnimatePresence>
            </a>
            <button
              onClick={handleSignOut}
              title={!isExpanded ? 'Log Out' : undefined}
              className={`flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors ${!isExpanded ? 'justify-center p-2 rounded-xl hover:bg-surface-container' : 'px-1'}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="text-xs overflow-hidden whitespace-nowrap">
                    Log Out
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ── Sidebar pin toggle (outside aside to avoid overflow-hidden clip) ── */}
      <motion.button
        animate={{ left: isExpanded ? 244 : 52 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onClick={() => setSidebarOpen(o => !o)}
        title={sidebarOpen ? 'Unpin sidebar' : 'Pin sidebar open'}
        className="fixed top-[72px] z-50 w-6 h-6 rounded-full bg-surface-container-highest border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shadow-md"
      >
        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.25 }}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </motion.div>
      </motion.button>

      {/* ── Main Canvas ─────────────────────────────────────────────────── */}
      <motion.main
        animate={{ paddingLeft: isExpanded ? 256 : 64 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="pt-14 h-screen flex relative overflow-hidden"
      >

        {/* Problem Map */}
        <section className="flex-1 relative flex flex-col overflow-hidden">

          {/* Problem input bar */}
          <AnimatePresence>
            {showInput && (
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="relative z-30 px-10 pt-6 pb-2 shrink-0"
              >
                <div className="flex items-center gap-3 bg-surface-container rounded-2xl px-5 py-4 border border-primary/30 shadow-[0_0_30px_rgba(161,250,255,0.1)]">
                  <input
                    ref={inputRef}
                    type="text"
                    value={problemInput}
                    onChange={e => setProblemInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="Enter a problem, equation, or concept to break down…"
                    className="flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant text-base"
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !problemInput.trim()}
                    className="bg-gradient-to-r from-primary to-secondary text-on-primary px-5 py-2 rounded-full font-bold text-sm flex items-center gap-2 disabled:opacity-50 hover:scale-105 transition-transform"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" />Analyze</>}
                  </button>
                  <button onClick={() => setShowInput(false)} className="text-on-surface-variant hover:text-on-surface p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {error && <p className="mt-2 text-sm text-error px-2">{error}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Title bar (when breakdown loaded) */}
          {breakdown && !loading && (
            <div className="px-4 sm:px-6 md:px-10 pt-3 sm:pt-4 md:pt-6 pb-0 shrink-0">
              <span className="text-tertiary text-xs font-bold tracking-[0.2em] uppercase">Active Analysis</span>
              <h1 className="font-headline text-xl sm:text-2xl md:text-3xl font-bold text-on-surface mt-1 tracking-tighter">
                {breakdown.title.split(' ').slice(0, -1).join(' ')}{' '}
                <span className="text-secondary">{breakdown.title.split(' ').slice(-1)}</span>
              </h1>
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
                    <p className="font-headline font-bold text-on-surface">Neural Analysis Active</p>
                    <p className="text-xs text-on-surface-variant tracking-widest uppercase mt-1">Building concept tree…</p>
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
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.05 }}
                      style={{
                        position: 'absolute',
                        left: pos.x + offsetX,
                        top: pos.y + offsetY,
                        transform: 'translate(-50%, -50%)',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        zIndex: isSelected ? 20 : isDragging ? 30 : 10,
                        userSelect: 'none',
                      }}
                      onMouseDown={e => startDrag(e, node.id)}
                      onTouchStart={e => startTouchDrag(e, node.id)}
                      onClick={() => setSelectedNode(node)}
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
                            <MathText math className="text-base text-on-surface leading-relaxed">
                              {node.mathContent || node.label}
                            </MathText>
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
                              <h3 className="text-sm font-headline font-bold text-on-surface"><MathText>{node.label}</MathText></h3>
                              <p className="text-[10px] text-on-surface-variant mt-0.5 leading-relaxed"><MathText>{node.description}</MathText></p>
                            </div>
                          </div>
                          {node.mathContent && (
                            <div className="bg-background/50 rounded-lg px-3 py-2">
                              <MathText math className="text-xs text-primary leading-relaxed">
                                {node.mathContent}
                              </MathText>
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
                            <span className="text-xs font-headline font-bold text-tertiary"><MathText>{node.label}</MathText></span>
                          </div>
                          {node.mathContent && (
                            <MathText math className="text-[11px] text-on-surface-variant leading-relaxed block">
                              {node.mathContent}
                            </MathText>
                          )}
                          {node.description && (
                            <p className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed"><MathText>{node.description}</MathText></p>
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

        {/* ── Click-outside overlay ───────────────────────────────────────── */}
        {selectedNode && (
          <div
            className="absolute inset-0 z-10"
            onClick={() => setSelectedNode(null)}
          />
        )}

        {/* ── Right Panel ─────────────────────────────────────────────────── */}
        <motion.aside
          animate={{ width: selectedNode ? 384 : 0, opacity: selectedNode ? 1 : 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="h-full bg-surface-container-low/80 backdrop-blur-md border-l border-outline-variant/10 shrink-0 relative overflow-hidden z-20"
        >
          {/* Invisible swipe handle on the left edge — sits above scroll content to capture rightward swipes */}
          {selectedNode && (
            <div
              className="absolute left-0 top-0 h-full w-8 z-20 pointer-events-auto"
              style={{ touchAction: 'pan-y' }}
              onTouchStart={(e) => {
                insightSwipeStartX.current = e.touches[0].clientX;
                insightSwipeStartY.current = e.touches[0].clientY;
              }}
              onTouchEnd={(e) => {
                if (insightSwipeStartX.current === null || insightSwipeStartY.current === null) return;
                const dx = e.changedTouches[0].clientX - insightSwipeStartX.current;
                const dy = Math.abs(e.changedTouches[0].clientY - insightSwipeStartY.current);
                if (dx > 60 && dy < 80) setSelectedNode(null);
                insightSwipeStartX.current = null;
                insightSwipeStartY.current = null;
              }}
            />
          )}
          {selectedNode && <><div className="h-full overflow-y-auto p-8 pb-[200px]" style={{ width: 384 }}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-headline font-bold text-xl">Node Insights</h2>
              {selectedNode && (
                <button onClick={() => setSelectedNode(null)} className="text-on-surface-variant hover:text-on-surface">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

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
                  <h3 className="font-headline text-xl font-bold mt-1 leading-tight"><MathText>{selectedNode.label}</MathText></h3>
                  <RichText className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                    {selectedNode.description}
                  </RichText>
                </div>

                {/* Math content */}
                {selectedNode.mathContent && (
                  <div className="bg-background/60 rounded-xl px-4 py-3 border border-outline-variant/20">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Expression</span>
                    <MathText math className="text-base text-primary leading-relaxed">
                      {selectedNode.mathContent}
                    </MathText>
                  </div>
                )}

                {/* Simple breakdown — per-node, fetched on selection */}
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
                        {nodeInsights[selectedNode.id]?.keyFormula && (
                          <div className="bg-background/50 p-3 rounded-xl text-center">
                            <MathText math className="text-sm text-primary">
                              {nodeInsights[selectedNode.id].keyFormula}
                            </MathText>
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
                    onClick={handleExplainToFiveYearOld}
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
                        className={`rounded-xl px-4 py-3 text-xs leading-relaxed ${
                          message.role === 'user'
                            ? 'bg-primary/10 border border-primary/20 text-on-surface'
                            : 'bg-transparent text-on-surface-variant'
                        }`}
                      >
                        {message.role === 'user'
                          ? <span>{message.content}</span>
                          : <RichText className="text-xs leading-relaxed">{message.content}</RichText>
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

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-on-surface-variant">Subject:</span>
                  <span className="text-xs font-bold text-tertiary bg-tertiary/10 px-3 py-1 rounded-full">{breakdown.subject}</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Floating composer */}
          <div className="absolute inset-x-4 bottom-4 z-30">
            <div className="bg-surface-container-highest/95 rounded-[24px] p-4 border border-outline-variant/20 shadow-2xl backdrop-blur-xl">
              <textarea
                value={composerInput}
                onChange={e => setComposerInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAskDeepDive();
                  }
                }}
                rows={1}
                disabled={!isBranchSelected || composerLoading}
                placeholder={composerPlaceholder}
                className="w-full bg-transparent text-on-surface text-sm placeholder:text-on-surface/40 outline-none resize-none px-1 mb-2 min-h-[40px]"
              />

              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-4 text-on-surface-variant/60">
                  <button type="button" className="hover:text-primary transition-colors disabled:opacity-30" disabled={!isBranchSelected}>
                    <Plus className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                    <Archive className="w-5 h-5" />
                    <ChevronLeft className="w-3 h-3 rotate-[-90deg]" />
                  </div>
                  <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
                    <Zap className="w-5 h-5" />
                    <ChevronLeft className="w-3 h-3 rotate-[-90deg]" />
                  </div>
                  <div className="w-[1px] h-4 bg-outline-variant/30 mx-1" />
                  <button type="button" className="text-primary">
                    <Sparkles className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={handleAskDeepDive}
                  disabled={!isBranchSelected || composerLoading || !composerInput.trim()}
                  className="w-10 h-10 rounded-full bg-on-surface-variant/20 text-on-surface flex items-center justify-center hover:bg-on-surface-variant/30 transition-all disabled:opacity-30"
                >
                  {composerLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5 rotate-[-90deg]" />}
                </button>
              </div>
            </div>

            {composerError && (
              <p className="mt-2 text-[10px] text-error px-2">{composerError}</p>
            )}
          </div></>}
        </motion.aside>
      </motion.main>
    </div>
  );
}
