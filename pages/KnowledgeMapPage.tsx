import { useEffect, useMemo, useState } from "react";
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
    return parsed as StudyBreakdownPayload;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 640 : false));
  const [openingSessionId, setOpeningSessionId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [subjectResponse, sessionResponse] = await Promise.all([
          api.get<{ subjects: Subject[] }>("/api/subjects"),
          api.get<{
            sessions: Array<{
              id: string;
              title?: string | null;
              subject_id?: string | null;
              subject?: string | null;
              created_at?: string | null;
            }>;
          }>("/api/sessions"),
        ]);
        if (cancelled) return;

        const mappedSessions = (sessionResponse.sessions ?? [])
          .map((row) => ({
            id: row.id,
            title: String(row.title ?? "").trim(),
            subject_id: row.subject_id ?? null,
            subject: row.subject ?? null,
            created_at: row.created_at ?? null,
          }))
          .filter((row) => row.title.length > 0)
          .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));

        setSubjects(subjectResponse.subjects ?? []);
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
      return;
    }
    if (selectedSubjectId && !subjectClusters.some((cluster) => cluster.id === selectedSubjectId)) {
      setSelectedSubjectId("");
    }
  }, [selectedSubjectId, subjectClusters]);

  const selectedSubject = useMemo(
    () => subjectClusters.find((cluster) => cluster.id === selectedSubjectId) ?? null,
    [selectedSubjectId, subjectClusters]
  );

  const subjectPositions = useMemo<Record<string, PointPosition>>(() => {
    const entries: Record<string, PointPosition> = {};
    const total = subjectClusters.length;
    if (total === 0) return entries;
    if (total === 1) {
      entries[subjectClusters[0].id] = { x: 50, y: 50 };
      return entries;
    }

    const innerCount = Math.min(total, 8);
    const outerCount = Math.max(0, total - innerCount);

    for (let i = 0; i < total; i += 1) {
      const isInner = i < innerCount;
      const ringSize = isInner ? innerCount : outerCount;
      const angleIndex = isInner ? i : i - innerCount;
      const angle = -Math.PI / 2 + ((Math.PI * 2) / Math.max(1, ringSize)) * angleIndex;
      const radius = isInner ? 24 : 37;
      const x = clampPercent(50 + Math.cos(angle) * radius);
      const y = clampPercent(50 + Math.sin(angle) * radius);
      entries[subjectClusters[i].id] = { x, y };
    }

    return entries;
  }, [subjectClusters]);

  const subjectLinks = useMemo(() => {
    if (subjectClusters.length <= 1) return [];
    return subjectClusters.map((cluster, index) => ({
      from: cluster.id,
      to: subjectClusters[(index + 1) % subjectClusters.length].id,
    }));
  }, [subjectClusters]);

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
        animate={{ marginLeft: isMobile ? 0 : (sidebarExpanded ? 256 : 64) }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative z-10 px-4 pb-24 pt-20 sm:px-8 sm:pt-24"
      >
        <div className="mx-auto max-w-7xl">
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
              <div className="relative min-h-[620px] overflow-hidden p-5">
                <div className="pointer-events-none absolute inset-0">
                  <svg className="h-full w-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none">
                    {subjectLinks.map((link) => {
                      const from = subjectPositions[link.from];
                      const to = subjectPositions[link.to];
                      if (!from || !to) return null;
                      return (
                        <line
                          key={`${link.from}-${link.to}`}
                          x1={toMapX(from.x)}
                          y1={toMapY(from.y)}
                          x2={toMapX(to.x)}
                          y2={toMapY(to.y)}
                          stroke="rgba(161, 250, 255, 0.18)"
                          strokeWidth={1.5}
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
                          stroke="rgba(255, 81, 250, 0.5)"
                          strokeWidth={1.4}
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
                      onClick={() =>
                        setSelectedSubjectId((current) => (current === cluster.id ? "" : cluster.id))
                      }
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                      style={{ left: `${position.x}%`, top: `${position.y}%` }}
                    >
                      <div
                        className={[
                          "mx-auto h-3 w-3 rounded-full transition-all",
                          active
                            ? "bg-secondary shadow-[0_0_18px_rgba(255,81,250,0.8)]"
                            : "bg-primary shadow-[0_0_14px_rgba(161,250,255,0.55)]",
                        ].join(" ")}
                      />
                      <div
                        className={[
                          "mt-2 w-[148px] rounded-2xl border px-3 py-2 backdrop-blur-md transition-all",
                          active
                            ? "border-secondary/40 bg-surface-container-highest/85"
                            : "border-outline-variant/25 bg-surface-container-high/70 hover:border-primary/40",
                        ].join(" ")}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface">{cluster.name}</p>
                        <p className="mt-1 text-[10px] text-primary">{cluster.sessionTitles.length} title{cluster.sessionTitles.length > 1 ? "s" : ""}</p>
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
                      <div className="w-[120px] rounded-xl border border-secondary/40 bg-surface-container-highest/85 px-2.5 py-2 text-center shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition-colors hover:bg-surface-container-highest">
                        <p className="truncate text-[10px] font-semibold text-on-surface" title={node.session.title}>
                          {node.session.title}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>

                <AnimatePresence>
                  {selectedSubject ? (
                    <motion.aside
                      key={`subject-popup-${selectedSubject.id}`}
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
                          onClick={() => setSelectedSubjectId("")}
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
                              className="block w-full rounded-xl bg-surface-container-high p-3 text-left transition-colors hover:bg-surface-container disabled:cursor-wait disabled:opacity-60"
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
