import { useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Brain,
  GitFork,
  History,
  Layers,
  Loader2,
  Network,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { AppHeader } from "../components/layout/AppHeader";
import { AppSidebar } from "../components/layout/AppSidebar";
import { api } from "../lib/api";
import { getSessionsCached } from "../lib/sessions";
import { getSubjectsCached } from "../lib/subjects";
import { supabase } from "../lib/supabase";
import { firebaseSignOut } from "../lib/firebase";
import type { Subject } from "../types/subject.types";

interface StudySessionSummary {
  id: string;
  title: string;
  subject_id: string | null;
  subject: string | null;
  created_at: string | null;
}

interface StudyBreakdownPayload {
  id?: string;
  title: string;
  subject: string;
  nodes: Array<Record<string, unknown>>;
  insights: {
    simpleBreakdown: string;
    keyFormula: string;
  };
  nodeInsights?: Record<string, { simpleBreakdown: string; keyFormula: string }>;
  nodeConversations?: Record<string, Array<{ role: string; content: string; createdAt: string }>>;
  nodePositions?: Record<string, { x: number; y: number }>;
}

interface SubjectCluster {
  id: string;
  name: string;
  sessionTitles: StudySessionSummary[];
}

interface PointPosition {
  x: number;
  y: number;
}

interface SubjectPoint extends PointPosition {
  id: string;
}

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 700;

interface Props {
  user: any;
  onNavigateStudy?: (breakdown?: StudyBreakdownPayload | null) => void;
  onNavigateHistory?: () => void;
  onNavigateFlashcards?: () => void;
  onNavigateQuiz?: () => void;
  onNavigateAchievements?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function clampPercent(value: number): number {
  return Math.min(94, Math.max(6, value));
}

function toMapX(percent: number): number {
  return (percent / 100) * MAP_WIDTH;
}

function toMapY(percent: number): number {
  return (percent / 100) * MAP_HEIGHT;
}

function distance(a: PointPosition, b: PointPosition): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const CONSTELLATION_TEMPLATE_POINTS: Array<PointPosition> = [
  { x: 20, y: 28 },
  { x: 30, y: 52 },
  { x: 40, y: 35 },
  { x: 58, y: 28 },
  { x: 76, y: 40 },
  { x: 54, y: 62 },
  { x: 72, y: 74 },
  { x: 24, y: 70 },
  { x: 42, y: 18 },
  { x: 64, y: 16 },
  { x: 84, y: 58 },
  { x: 14, y: 50 },
  { x: 34, y: 80 },
  { x: 50, y: 82 },
  { x: 68, y: 54 },
  { x: 82, y: 24 },
  { x: 48, y: 46 },
  { x: 62, y: 70 },
  { x: 28, y: 38 },
  { x: 74, y: 26 },
];

const CONSTELLATION_TEMPLATE_EDGES: Array<[number, number]> = [
  [0, 2], [0, 1], [2, 3], [3, 4], [2, 5], [1, 5], [5, 6], [4, 6],
  [1, 7], [7, 11], [2, 8], [8, 9], [3, 9], [4, 10], [6, 10],
  [5, 12], [12, 13], [6, 17], [14, 5], [14, 4], [15, 4], [16, 2],
  [16, 5], [18, 0], [18, 2], [19, 3], [19, 15],
];

function formatDate(value: string | null): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function parseBreakdownPayload(raw: string | null | undefined): StudyBreakdownPayload | null {
  if (!raw) return null;
  try {
    let parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    if (!parsed || typeof parsed !== "object") return null;
    const candidate = parsed as Partial<StudyBreakdownPayload>;
    if (!Array.isArray(candidate.nodes)) return null;
    return candidate as StudyBreakdownPayload;
  } catch {
    return null;
  }
}

export default function KnowledgeMapPage({
  user,
  onNavigateStudy,
  onNavigateHistory,
  onNavigateFlashcards,
  onNavigateQuiz,
  onNavigateAchievements,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
}: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySessionSummary[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 640 : false));
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null);

  // Map Navigation & Transformation
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapTransform, setMapTransform] = useState({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const resetMap = () => {
    setMapTransform({ x: 0, y: 0, scale: 1 });
  };

  const centerNode = (xPercent: number, yPercent: number) => {
    if (!containerRef.current) return;
    const { offsetWidth: width, offsetHeight: height } = containerRef.current;
    
    // Zoom in on focus
    const scale = isMobile ? 1.8 : 1.4;
    
    // Convert percentage to pixels relative to the container center
    const xNode = (xPercent / 100) * width;
    const yNode = (yPercent / 100) * height;
    
    // Calculate translation needed to put node at center of viewport
    // (Center - NodePos) * Scale
    const tx = (width / 2 - xNode) * scale;
    const ty = (height / 2 - yNode) * scale;
    
    setMapTransform({ x: tx, y: ty, scale });
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [subjectResponse, sessionResponse] = await Promise.all([
          getSubjectsCached(),
          getSessionsCached(),
        ]);
        if (cancelled) return;

        const mappedSessions = (sessionResponse ?? [])
          .map((row) => ({
            id: row.id,
            title: String(row.title ?? "").trim(),
            subject_id: row.subject_id ?? null,
            subject: row.subject ?? null,
            created_at: row.created_at ?? null,
          }))
          .filter((row) => row.title.length > 0)
          .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

        setSubjects(subjectResponse ?? []);
        setSessions(mappedSessions);
      } catch {
        if (cancelled) return;
        setSubjects([]);
        setSessions([]);
        setError("Could not load your knowledge map right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const handleOpenSessionInStudy = async (sessionId: string) => {
    if (!sessionId || openingSessionId) return;
    setOpeningSessionId(sessionId);

    try {
      const { session } = await api.get<{ session: { id: string; breakdown_json: string } }>(`/api/sessions/${sessionId}`);
      const parsed = parseBreakdownPayload(session.breakdown_json);
      if (!parsed) return;

      const hydrated: StudyBreakdownPayload = {
        ...parsed,
        id: session.id,
      };
      onNavigateStudy?.(hydrated);
    } catch {
      // Silent fallback; keep user on the map if loading fails.
    } finally {
      setOpeningSessionId(null);
    }
  };

  const subjectClusters = useMemo<SubjectCluster[]>(() => {
    const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
    const subjectIdByName = new Map<string, string>();
    for (const subject of subjects) {
      subjectIdByName.set(normalizeText(subject.name), subject.id);
    }

    const grouped = new Map<string, SubjectCluster>();
    for (const subject of subjects) {
      grouped.set(subject.id, { id: subject.id, name: subject.name, sessionTitles: [] });
    }

    for (const session of sessions) {
      let subjectId = session.subject_id;
      if (!subjectId || !subjectById.has(subjectId)) {
        subjectId = subjectIdByName.get(normalizeText(session.subject)) ?? null;
      }
      if (!subjectId) continue;

      const cluster = grouped.get(subjectId);
      if (!cluster) continue;
      cluster.sessionTitles.push(session);
    }

    return Array.from(grouped.values())
      .filter((cluster) => cluster.sessionTitles.length > 0)
      .sort((a, b) => {
        const byCount = b.sessionTitles.length - a.sessionTitles.length;
        if (byCount !== 0) return byCount;
        return a.name.localeCompare(b.name);
      });
  }, [sessions, subjects]);

  useEffect(() => {
    if (!subjectClusters.length) {
      setSelectedSubjectId("");
      setIsSubjectModalOpen(false);
      resetMap();
      return;
    }
    if (selectedSubjectId && !subjectClusters.some((cluster) => cluster.id === selectedSubjectId)) {
      setSelectedSubjectId("");
      setIsSubjectModalOpen(false);
      resetMap();
    }
  }, [selectedSubjectId, subjectClusters]);

  const selectedSubject = useMemo(
    () => subjectClusters.find((cluster) => cluster.id === selectedSubjectId) ?? null,
    [selectedSubjectId, subjectClusters]
  );

  const subjectPoints = useMemo<SubjectPoint[]>(() => {
    const total = subjectClusters.length;
    if (total === 0) return [];
    if (total === 1) {
      return [{ id: subjectClusters[0].id, x: 50, y: 50 }];
    }

    const points: SubjectPoint[] = [];
    const templateCount = CONSTELLATION_TEMPLATE_POINTS.length;

    for (let i = 0; i < Math.min(total, templateCount); i += 1) {
      points.push({
        id: subjectClusters[i].id,
        x: clampPercent(CONSTELLATION_TEMPLATE_POINTS[i].x),
        y: clampPercent(CONSTELLATION_TEMPLATE_POINTS[i].y),
      });
    }

    for (let i = templateCount; i < total; i += 1) {
      const step = i - templateCount;
      const angle = step * 2.399963229728653; // golden angle
      const ring = 28 + (step % 6) * 4;
      const x = clampPercent(50 + Math.cos(angle) * ring);
      const y = clampPercent(50 + Math.sin(angle) * (ring * 0.74));
      points.push({ id: subjectClusters[i].id, x, y });
    }

    return points;
  }, [subjectClusters]);

  const subjectPositions = useMemo<Record<string, PointPosition>>(
    () => Object.fromEntries(subjectPoints.map((point) => [point.id, { x: point.x, y: point.y }])),
    [subjectPoints]
  );

  const subjectLinks = useMemo(() => {
    if (subjectPoints.length <= 1) return [];

    const links = new Set<string>();
    for (const [fromIndex, toIndex] of CONSTELLATION_TEMPLATE_EDGES) {
      if (fromIndex >= subjectPoints.length || toIndex >= subjectPoints.length) continue;
      const from = subjectPoints[fromIndex].id;
      const to = subjectPoints[toIndex].id;
      const key = [from, to].sort().join("|");
      links.add(key);
    }

    // Only add nearest-neighbor fallback edges for nodes beyond the curated
    // template so the base shape keeps the intended irregular geometry.
    const templateCount = CONSTELLATION_TEMPLATE_POINTS.length;
    for (let i = templateCount; i < subjectPoints.length; i += 1) {
      const source = subjectPoints[i];
      const nearest = subjectPoints
        .filter((point) => point.id !== source.id)
        .map((point) => ({ id: point.id, d: distance(source, point) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);

      for (const target of nearest) {
        const key = [source.id, target.id].sort().join("|");
        links.add(key);
      }
    }

    return Array.from(links).map((key) => {
      const [from, to] = key.split("|");
      return { from, to };
    });
  }, [subjectPoints]);

  const expandedTitleNodes = useMemo(() => {
    if (!selectedSubject) return [];
    const center = subjectPositions[selectedSubject.id];
    if (!center) return [];

    const visible = selectedSubject.sessionTitles.slice(0, 10);
    const count = visible.length;
    if (count === 0) return [];

    return visible.map((session, index) => {
      const angle = -Math.PI / 2 + ((Math.PI * 2) / count) * index;
      const radius = count <= 4 ? 14 : 18;
      const x = clampPercent(center.x + Math.cos(angle) * radius);
      const y = clampPercent(center.y + Math.sin(angle) * radius);
      return { session, x, y };
    });
  }, [selectedSubject, subjectPositions]);

  const animatedBranchLinks = useMemo(() => {
    if (!selectedSubject) return [];
    const center = subjectPositions[selectedSubject.id];
    if (!center) return [];

    const x1 = toMapX(center.x);
    const y1 = toMapY(center.y);
    return expandedTitleNodes.map((node, index) => ({
      key: `${selectedSubject.id}-${node.session.id}`,
      index,
      x1,
      y1,
      x2: toMapX(node.x),
      y2: toMapY(node.y),
    }));
  }, [expandedTitleNodes, selectedSubject, subjectPositions]);

  const navItems = useMemo(
    () => [
      { id: "study", label: "Study Space", Icon: GitFork, active: false, onClick: onNavigateStudy },
      { id: "knowledge-map", label: "Knowledge Map", Icon: Network, active: true, onClick: undefined },
      { id: "history", label: "Learning History", Icon: History, active: false, onClick: onNavigateHistory },
      { id: "flashcards", label: "Flashcards", Icon: Layers, active: false, onClick: onNavigateFlashcards },
      { id: "quiz", label: "Quiz", Icon: Brain, active: false, onClick: onNavigateQuiz },
      { id: "achievements", label: "Achievements", Icon: Trophy, active: false, onClick: onNavigateAchievements },
    ],
    [onNavigateAchievements, onNavigateFlashcards, onNavigateHistory, onNavigateQuiz, onNavigateStudy]
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-dim text-on-surface">
      <div className="pointer-events-none fixed -left-20 top-24 h-[420px] w-[420px] rounded-full bg-secondary-container/10 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-16 right-0 h-[460px] w-[460px] rounded-full bg-primary/10 blur-[120px]" />

      <AppHeader
        user={user}
        onSettingsClick={onNavigateSettings}
        onSignOut={handleSignOut}
        onNavigateStudy={onNavigateStudy}
        onNavigateHistory={onNavigateHistory}
        onNavigateFlashcards={onNavigateFlashcards}
        onNavigateQuiz={onNavigateQuiz}
        onNavigateAchievements={onNavigateAchievements}
        onNavigateKnowledgeMap={() => undefined}
        activeMobileMenu="knowledge-map"
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
        left={(
          <div className="hidden items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2 md:flex">
            <Network className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Knowledge Map</span>
          </div>
        )}
      />

      <AppSidebar
        brandTitle="Knowledge Graph"
        brandSubtitle="Subject Session Atlas"
        brandIcon={Network}
        navItems={navItems}
        primaryAction={{ label: "New Study Session", onClick: () => onNavigateStudy?.() }}
        onSignOut={handleSignOut}
        collapsible
        defaultPinned={false}
        onExpandedChange={setSidebarExpanded}
      />

      <motion.main
        animate={{ paddingLeft: isMobile ? 0 : (sidebarExpanded ? 256 : 64) }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative z-10 pb-24 pt-20 sm:pt-24"
      >
        <div className="w-full">
          {loading ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" />
              Building your knowledge constellation...
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl bg-error/20 px-4 py-3 text-sm text-red-200">{error}</p>
          ) : null}

          {!loading && !error && subjectClusters.length === 0 ? (
            <div className="mt-6 rounded-[2rem] border border-outline-variant/20 bg-surface-container-low p-8">
              <p className="font-headline text-2xl font-bold">No subject nodes yet</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Create a study session first. Once sessions are saved with subject IDs, they will appear as map points here.
              </p>
            </div>
          ) : null}

          {!loading && !error && subjectClusters.length > 0 ? (
            <section className="mt-6">
              <div
                ref={containerRef}
                className="relative min-h-[620px] overflow-hidden p-5"
                onClick={() => {
                  if (!selectedSubjectId) {
                    resetMap();
                    return;
                  }
                  if (isSubjectModalOpen) {
                    setIsSubjectModalOpen(false);
                    return;
                  }
                  setSelectedSubjectId("");
                  resetMap();
                }}
              >
                <motion.div
                  animate={mapTransform}
                  transition={{ type: "spring", damping: 25, stiffness: 120 }}
                  className="absolute inset-0"
                >
                  <div className="pointer-events-none absolute inset-0">
                    <svg className="h-full w-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none">
                      {subjectLinks.map((link, index) => {
                        const from = subjectPositions[link.from];
                        const to = subjectPositions[link.to];
                        if (!from || !to) return null;
                        const x1 = toMapX(from.x);
                        const y1 = toMapY(from.y);
                        const x2 = toMapX(to.x);
                        const y2 = toMapY(to.y);
                        return (
                          <motion.line
                            key={`${link.from}-${link.to}`}
                            x1={x1}
                            y1={y1}
                            initial={{ x2: x1, y2: y1, opacity: 0 }}
                            animate={{
                              x2,
                              y2,
                              opacity: 1,
                              transition: {
                                duration: 0.6,
                                delay: index * 0.07,
                                ease: [0.22, 1, 0.36, 1],
                              },
                            }}
                            stroke="rgba(161, 250, 255, 0.28)"
                            strokeWidth={0.9}
                            strokeLinecap="round"
                          />
                        );
                      })}
                      <AnimatePresence>
                        {animatedBranchLinks.map((link) => (
                          <motion.line
                            key={link.key}
                            x1={link.x1}
                            y1={link.y1}
                            initial={{ x2: link.x1, y2: link.y1, opacity: 0 }}
                            animate={{
                              x2: link.x2,
                              y2: link.y2,
                              opacity: 1,
                              transition: {
                                duration: 0.42,
                                delay: link.index * 0.055,
                                ease: [0.22, 1, 0.36, 1],
                              },
                            }}
                            exit={{
                              x2: link.x1,
                              y2: link.y1,
                              opacity: 0,
                              transition: { duration: 0.2, ease: "easeInOut" },
                            }}
                            stroke="rgba(255, 81, 250, 0.42)"
                            strokeWidth={0.95}
                            strokeLinecap="round"
                          />
                        ))}
                      </AnimatePresence>
                    </svg>
                  </div>

                  {subjectClusters.map((cluster) => {
                    const position = subjectPositions[cluster.id];
                    if (!position) return null;
                    const active = selectedSubjectId === cluster.id;
                    return (
                      <button
                        key={cluster.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (selectedSubjectId === cluster.id) {
                            setSelectedSubjectId("");
                            setIsSubjectModalOpen(false);
                            resetMap();
                            return;
                          }
                          setSelectedSubjectId(cluster.id);
                          setIsSubjectModalOpen(true);
                          centerNode(position.x, position.y);
                        }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                        style={{ left: `${position.x}%`, top: `${position.y}%` }}
                      >
                        <div className="relative">
                          <div className="relative mx-auto flex items-center justify-center">
                            <motion.span
                              aria-hidden
                              className={[
                                "absolute rounded-full blur-md",
                                active ? "h-8 w-8 bg-secondary/28" : "h-6 w-6 bg-primary/22",
                              ].join(" ")}
                              animate={active ? { scale: [1, 1.15, 1], opacity: [0.45, 0.62, 0.45] } : { scale: 1, opacity: 0.4 }}
                              transition={active ? { duration: 1.9, ease: "easeInOut", repeat: Infinity } : { duration: 0.25 }}
                            />
                            <motion.span
                              aria-hidden
                              className={[
                                "absolute rounded-full",
                                active ? "h-7 w-7 bg-secondary/14" : "h-6 w-6 bg-primary/10",
                              ].join(" ")}
                              animate={active ? { scale: [1, 1.08, 1], opacity: [0.4, 0.55, 0.4] } : { scale: 1, opacity: 0.35 }}
                              transition={active ? { duration: 2.1, ease: "easeInOut", repeat: Infinity } : { duration: 0.25 }}
                            />
                            <div
                              className={[
                                "relative h-3 w-3 rounded-full transition-all",
                                active
                                  ? "bg-secondary shadow-[0_0_18px_rgba(255,81,250,0.8)]"
                                  : "bg-primary shadow-[0_0_14px_rgba(161,250,255,0.55)]",
                              ].join(" ")}
                            />
                          </div>
                          <div
                            className={[
                              "absolute left-1/2 top-full mt-2 w-[148px] -translate-x-1/2 rounded-2xl px-3 py-2 transition-all",
                              active ? "text-secondary" : "text-on-surface",
                            ].join(" ")}
                          >
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em]">{cluster.name}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <AnimatePresence>
                    {expandedTitleNodes.map((node, index) => (
                      <motion.button
                        type="button"
                        key={`${selectedSubjectId || "none"}-${node.session.id}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleOpenSessionInStudy(node.session.id);
                        }}
                        disabled={openingSessionId === node.session.id}
                        initial={{ opacity: 0, scale: 0.72, y: 9 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          y: 0,
                          transition: {
                            duration: 0.32,
                            delay: 0.12 + index * 0.06,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.74,
                          y: 6,
                          transition: { duration: 0.2, ease: "easeInOut" },
                        }}
                      >
                        <div className="relative">
                          <div className="relative mx-auto flex items-center justify-center">
                            <span
                              aria-hidden
                              className="absolute h-5 w-5 rounded-full bg-secondary/14"
                            />
                            <div
                              className="relative h-2.5 w-2.5 rounded-full bg-secondary shadow-[0_0_10px_rgba(255,81,250,0.6)]"
                            />
                          </div>
                          <div className="absolute left-1/2 top-full mt-2 w-[120px] -translate-x-1/2 rounded-xl px-2.5 py-2 text-center">
                            <p className="truncate text-[10px] font-semibold text-on-surface" title={node.session.title}>
                              {node.session.title}
                            </p>
                          </div>                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </motion.div>

                <AnimatePresence>
                  {selectedSubject && isSubjectModalOpen ? (
                    <motion.aside
                      key={`subject-popup-${selectedSubject.id}`}
                      onClick={(event) => event.stopPropagation()}
                      initial={{ opacity: 0, y: 18, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.97 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="absolute right-4 top-4 z-20 w-[min(360px,calc(100%-2rem))] rounded-3xl border border-outline-variant/20 bg-surface-container-highest/70 p-5 backdrop-blur-xl shadow-[0_24px_48px_rgba(0,0,0,0.45)]"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.16em] text-secondary">Selected Subject</p>
                          <h2 className="mt-1 font-headline text-2xl font-black">{selectedSubject.name}</h2>
                        </div>
                        <button
                          onClick={() => {
                            setIsSubjectModalOpen(false);
                            resetMap();
                          }}
                          className="rounded-full bg-surface-container p-2 text-on-surface-variant transition-colors hover:text-on-surface"
                          aria-label="Close subject popup"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-4">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">Study Session Titles</p>
                        <div className="mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1">
                          {selectedSubject.sessionTitles.map((session) => (
                            <button
                              key={session.id}
                              type="button"
                              onClick={() => void handleOpenSessionInStudy(session.id)}
                              disabled={openingSessionId === session.id}
                              className="block w-full rounded-xl p-3 text-left transition-colors hover:bg-surface-container-high disabled:cursor-wait disabled:opacity-60"
                            >
                              <p className="text-sm font-medium text-on-surface">{session.title}</p>
                              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                                {formatDate(session.created_at)}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.aside>
                  ) : null}
                </AnimatePresence>
              </div>
            </section>
          ) : null}
        </div>
      </motion.main>
    </div>
  );
}
