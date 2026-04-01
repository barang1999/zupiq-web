import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  GitFork, History, Users,
  Search, ArrowRight, Zap, ChevronLeft,
  HelpCircle, LogOut, Brain, FlaskConical, Layers, Trash2,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { RichText } from '../components/ui/RichText';
import { getSessionsCached, deleteSession } from '../lib/sessions';
import { supabase } from '../lib/supabase';
import { firebaseSignOut } from '../lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudySession {
  id: string;
  title: string;
  subject: string;
  problem: string;
  node_count: number;
  duration_seconds: number | null;
  breakdown_json: string;
  created_at: string;
  user_role?: 'owner' | 'editor' | 'viewer';
}

interface ProblemBreakdown {
  id?: string;
  title: string;
  subject: string;
  nodes: any[];
  insights: { simpleBreakdown: string; keyFormula: string };
  nodeInsights?: Record<string, { simpleBreakdown: string; keyFormula: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  if (hrs < 48) return 'Yesterday';
  return formatDate(iso);
}

function formatDuration(secs: number | null): string {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function toSingleLinePreview(value: string): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function subjectColor(subject: string): { bg: string; text: string; bar: string } {
  const s = subject.toLowerCase();
  if (s.includes('math') || s.includes('calculus') || s.includes('algebra') || s.includes('geometry')) {
    return { bg: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary' };
  }
  if (s.includes('physics') || s.includes('chemistry') || s.includes('science')) {
    return { bg: 'bg-secondary/10', text: 'text-secondary', bar: 'bg-secondary' };
  }
  return { bg: 'bg-tertiary/10', text: 'text-tertiary', bar: 'bg-gradient-to-r from-primary to-secondary' };
}

function subjectIcon(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes('physics') || s.includes('science')) return FlaskConical;
  if (s.includes('math') || s.includes('calculus')) return Layers;
  return Brain;
}

function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function toMonthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function includesAny(source: string, keywords: string[]): boolean {
  return keywords.some(keyword => source.includes(keyword));
}

function formatDelta(current: number, previous: number): string {
  const diff = Math.round(current - previous);
  if (Math.abs(diff) < 1) return 'Stable';
  return `${diff > 0 ? '↑' : '↓'} ${Math.abs(diff)}%`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  user: any;
  onNavigateStudy?: (breakdown?: ProblemBreakdown) => void;
  onNavigateFlashcards?: () => void;
  onNavigateQuiz?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
}

export function HistoryPage({
  user,
  onNavigateStudy,
  onNavigateFlashcards,
  onNavigateQuiz,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
}: Props) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 640
  );
  const isExpanded = sidebarOpen || sidebarHovered;


  useEffect(() => {
    let cancelled = false;
    getSessionsCached()
      .then((rows) => {
        if (cancelled) return;
        setSessions(rows as StudySession[]);
      })
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch {
      // silently fail — session stays in list
    } finally {
      setDeletingId(null);
    }
  };

  const navigateToQuiz = () => {
    if (onNavigateQuiz) {
      onNavigateQuiz();
      return;
    }
    if (window.location.pathname !== '/quiz') {
      window.history.pushState({ page: 'quiz' }, '', '/quiz');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'quiz' } }));
    }
  };

  const filtered = sessions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.subject.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalSessions = sessions.length;
  const totalNodes = sessions.reduce((a, s) => a + s.node_count, 0);
  const recent3 = filtered.slice(0, 3);
  const masteryTrends = useMemo(() => {
    const now = new Date();
    now.setDate(1);
    now.setHours(0, 0, 0, 0);

    const months = Array.from({ length: 6 }, (_v, idx) => {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() - (5 - idx));
      return {
        key: toMonthKey(monthDate),
        month: toMonthLabel(monthDate),
        mathRaw: 0,
        physicsRaw: 0,
        overallRaw: 0,
      };
    });

    const byMonth = new Map(months.map(m => [m.key, m]));
    const mathKeywords = ['math', 'calculus', 'algebra', 'geometry', 'trigonometry', 'statistics'];
    const physicsKeywords = ['physics', 'mechanics', 'kinematic', 'dynamic', 'thermo', 'optics', 'quantum', 'electromagnet'];
    const scienceKeywords = ['science', 'chemistry', 'biology'];

    for (const session of sessions) {
      const date = new Date(session.created_at);
      if (Number.isNaN(date.getTime())) continue;
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      const month = byMonth.get(toMonthKey(date));
      if (!month) continue;

      const weight = Math.max(1, session.node_count || 0);
      const subject = (session.subject ?? '').toLowerCase();

      month.overallRaw += weight;
      if (includesAny(subject, mathKeywords)) month.mathRaw += weight;
      if (includesAny(subject, physicsKeywords) || includesAny(subject, scienceKeywords)) month.physicsRaw += weight;
    }

    const maxRaw = Math.max(
      1,
      ...months.flatMap(m => [m.mathRaw, m.physicsRaw, m.overallRaw])
    );

    return months.map(m => ({
      month: m.month,
      math: Math.round((m.mathRaw / maxRaw) * 100),
      physics: Math.round((m.physicsRaw / maxRaw) * 100),
      overall: Math.round((m.overallRaw / maxRaw) * 100),
    }));
  }, [sessions]);
  const latestTrend = masteryTrends[masteryTrends.length - 1] ?? { month: '—', math: 0, physics: 0, overall: 0 };
  const previousTrend = masteryTrends[masteryTrends.length - 2] ?? latestTrend;
  const trendSummary = [
    {
      label: 'Mathematics',
      value: latestTrend.math,
      delta: formatDelta(latestTrend.math, previousTrend.math),
      color: 'text-primary',
      dot: 'bg-primary',
    },
    {
      label: 'Physics + Science',
      value: latestTrend.physics,
      delta: formatDelta(latestTrend.physics, previousTrend.physics),
      color: 'text-secondary',
      dot: 'bg-secondary',
    },
    {
      label: 'Overall',
      value: latestTrend.overall,
      delta: formatDelta(latestTrend.overall, previousTrend.overall),
      color: 'text-tertiary',
      dot: 'bg-tertiary',
    },
  ];

  const NAV_ITEMS = [
    { id: 'study',   label: 'Study Space',       Icon: GitFork,  action: () => onNavigateStudy?.() },
    { id: 'history', label: 'Learning History',  Icon: History,  action: () => {} },
    { id: 'flashcards', label: 'Flashcards', Icon: Layers, action: () => onNavigateFlashcards?.() },
    { id: 'quiz', label: 'Quiz', Icon: Brain, action: navigateToQuiz },
    { id: 'collab',  label: 'Collaborate',        Icon: Users,    action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Ambient glow */}
      <div className="fixed top-1/4 -right-20 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-1/4 -left-20 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <AppHeader
        user={user}
        onSettingsClick={onNavigateSettings}
        onSignOut={handleSignOut}
        onNavigateStudy={() => onNavigateStudy?.()}
        onNavigateFlashcards={onNavigateFlashcards}
        onNavigateQuiz={navigateToQuiz}
        activeMobileMenu="history"
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
        left={
          <div className="hidden md:flex items-center bg-surface-container-highest px-4 py-2 rounded-full gap-2">
            <Search className="w-4 h-4 text-primary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sessions…"
              className="bg-transparent outline-none text-sm text-on-surface w-52 placeholder:text-on-surface-variant"
            />
          </div>
        }
      />

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: isExpanded ? 256 : 64 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className="fixed left-0 h-full z-40 bg-surface-container-low hidden sm:flex flex-col pt-20 pb-6 text-sm font-medium overflow-hidden"
        style={{ width: isExpanded ? 256 : 64 }}
      >
        <div className={`mb-8 overflow-hidden transition-all duration-200 ${isExpanded ? 'px-6' : 'px-0 flex justify-center'}`}>
          {isExpanded ? (
            <div>
              <h2 className="font-headline font-bold text-lg text-secondary leading-tight whitespace-nowrap">Neural Journey</h2>
              <p className="text-on-surface-variant text-xs uppercase tracking-widest opacity-70 mt-1 whitespace-nowrap">Learning History</p>
            </div>
          ) : (
            <History className="w-5 h-5 text-secondary" />
          )}
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ id, label, Icon, action }) => {
            const isActive = id === 'history';
            return (
              <button
                key={id}
                onClick={action}
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
                {isExpanded && <span className="overflow-hidden whitespace-nowrap">{label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 px-2">
          {isExpanded && (
            <button
              onClick={() => onNavigateStudy?.()}
              className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity whitespace-nowrap overflow-hidden"
            >
              New Session
            </button>
          )}
          <div className={`pt-4 border-t border-outline-variant/20 flex flex-col gap-2 ${!isExpanded ? 'items-center' : ''}`}>
            <a href="#" className={`flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors ${!isExpanded ? 'justify-center p-2 rounded-xl hover:bg-surface-container' : 'px-1'}`}>
              <HelpCircle className="w-4 h-4 shrink-0" />
              {isExpanded && <span className="text-xs whitespace-nowrap">Support</span>}
            </a>
            <button
              onClick={handleSignOut}
              className={`flex items-center gap-3 text-on-surface-variant hover:text-error transition-colors ${!isExpanded ? 'justify-center p-2 rounded-xl hover:bg-surface-container' : 'px-1'}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {isExpanded && <span className="text-xs whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Sidebar pin toggle */}
      <motion.button
        animate={{ left: isExpanded ? 244 : 52 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onClick={() => setSidebarOpen(o => !o)}
        title={sidebarOpen ? 'Unpin sidebar' : 'Pin sidebar open'}
        className="fixed top-[72px] z-50 w-6 h-6 rounded-full bg-surface-container-highest border border-outline-variant/40 hidden sm:flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shadow-md"
      >
        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.25 }}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </motion.div>
      </motion.button>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <motion.main
        animate={{ paddingLeft: isMobile ? 0 : (isExpanded ? 256 : 64) }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="pt-20 sm:pt-24 pb-32 sm:pb-24 px-4 sm:px-6 min-h-screen relative z-10"
      >
        <div className="max-w-7xl mx-auto">

          {/* Mobile search */}
          <div className="mb-6 md:hidden">
            <div className="flex items-center bg-surface-container-highest/70 backdrop-blur-xl px-4 py-3 rounded-2xl gap-2 border border-outline-variant/20">
              <Search className="w-4 h-4 text-primary" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sessions…"
                className="w-full bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant"
              />
            </div>
          </div>

          {/* Hero */}
          <section className="mb-10 sm:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-headline font-bold text-on-surface tracking-tighter mb-3 sm:mb-4">
                Neural Journey
              </h1>
              <p className="text-on-surface-variant text-base sm:text-lg leading-relaxed">
                Your cognitive evolution, mapped across the digital ether. Every session strengthens the neural pathways.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full md:w-auto shrink-0">
              <div className="bg-surface-container-highest/40 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl min-w-0 border border-white/5">
                <p className="text-xs font-label text-primary uppercase tracking-widest mb-1">Sessions</p>
                <p className="text-2xl sm:text-3xl font-headline font-bold">
                  {loading ? '—' : totalSessions}
                  <span className="text-sm font-normal text-on-surface-variant ml-1">total</span>
                </p>
              </div>
              <div className="bg-surface-container-highest/40 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl min-w-0 border border-white/5">
                <p className="text-xs font-label text-secondary uppercase tracking-widest mb-1">Nodes Mapped</p>
                <p className="text-2xl sm:text-3xl font-headline font-bold">
                  {loading ? '—' : totalNodes}
                  <span className="text-sm font-normal text-on-surface-variant ml-1">units</span>
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Mastery Trends */}
            <section className="lg:col-span-8">
              <div className="bg-surface-container-low p-5 sm:p-8 rounded-3xl sm:rounded-[40px] relative overflow-hidden h-full">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8 sm:mb-10">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-headline font-bold text-on-surface">Mastery Trends</h3>
                      <p className="text-sm text-on-surface-variant">Cognitive retention across core disciplines</p>
                    </div>
                    <div className="hidden sm:flex gap-2">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] rounded-full border border-primary/20">REAL DATA</span>
                      <span className="px-3 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] rounded-full">
                        LAST {masteryTrends.length} MONTHS
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-44 sm:h-56 relative border-t border-outline-variant/10 pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={masteryTrends}
                        margin={{ top: 6, right: 4, left: -8, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="masteryPrimary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="masterySecondary" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-secondary)" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="var(--color-secondary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--color-outline-variant)" strokeOpacity={0.12} vertical={false} />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          dy={8}
                          tick={{ fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
                        />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip
                          cursor={{ stroke: 'var(--color-outline-variant)', strokeOpacity: 0.4 }}
                          contentStyle={{
                            borderRadius: 14,
                            border: '1px solid var(--color-outline-variant)',
                            backgroundColor: 'rgba(15, 25, 48, 0.92)',
                            color: 'var(--color-on-surface)',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: 'var(--color-on-surface-variant)' }}
                          formatter={(value: number | string, name: string) => {
                            const label = name === 'math'
                              ? 'Mathematics'
                              : name === 'physics'
                                ? 'Physics + Science'
                                : 'Overall';
                            return [`${value}%`, label];
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="math"
                          name="math"
                          stroke="var(--color-primary)"
                          strokeWidth={2.5}
                          fill="url(#masteryPrimary)"
                          fillOpacity={1}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-primary)' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="physics"
                          name="physics"
                          stroke="var(--color-secondary)"
                          strokeWidth={2.5}
                          fill="url(#masterySecondary)"
                          fillOpacity={1}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-secondary)' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="overall"
                          name="overall"
                          stroke="var(--color-tertiary)"
                          strokeWidth={1.8}
                          fillOpacity={0}
                          dot={false}
                          activeDot={{ r: 3.5, strokeWidth: 0, fill: 'var(--color-tertiary)' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {trendSummary.map(stat => (
                      <div key={stat.label} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${stat.dot}`} />
                          <span className="text-xs text-on-surface-variant">{stat.label}</span>
                        </div>
                        <p className="text-lg font-bold">{stat.value}% <span className={`text-xs font-normal ${stat.color}`}>{stat.delta}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-secondary-container/10 blur-[120px] rounded-full pointer-events-none" />
              </div>
            </section>

            {/* Neural Pulse */}
            <aside className="lg:col-span-4">
              <div className="bg-surface-container p-5 sm:p-8 rounded-3xl sm:rounded-[40px] relative border border-white/5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-5 sm:mb-6">
                    <motion.div
                      animate={{ boxShadow: ['0 0 0 0 rgba(161,250,255,0.4)', '0 0 0 15px rgba(161,250,255,0)', '0 0 0 0 rgba(161,250,255,0)'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center"
                    >
                      <Zap className="w-5 h-5 text-on-primary" />
                    </motion.div>
                    <span className="font-headline font-bold text-lg sm:text-xl">Neural Pulse</span>
                  </div>
                  <p className="text-on-surface mb-6 leading-relaxed">
                    Based on your recent sessions, explore deeper into{' '}
                    <span className="text-primary">advanced topics</span> to bridge your knowledge gaps.
                  </p>
                  <div className="bg-surface-container-low p-4 rounded-2xl mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-on-surface-variant font-label uppercase">Predicted Effort</span>
                      <span className="text-[10px] text-tertiary font-label uppercase">High Efficiency</span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-primary to-secondary w-3/4 h-full" />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateStudy?.()}
                  className="w-full py-3.5 sm:py-4 rounded-full bg-surface-container-highest border border-outline-variant/30 text-on-surface font-bold hover:bg-surface-bright transition-all"
                >
                  Start New Session
                </button>
              </div>
            </aside>

            {/* Recent Activity */}
            <section className="lg:col-span-12">
              <h3 className="text-xl sm:text-2xl font-headline font-bold text-on-surface mb-5 sm:mb-6">Recent Activity</h3>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[0,1,2].map(i => (
                    <div key={i} className="bg-surface-container-highest/40 backdrop-blur-xl p-6 rounded-[32px] h-48 animate-pulse" />
                  ))}
                </div>
              ) : recent3.length === 0 ? (
                <div className="text-center py-16 text-on-surface-variant">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-40" />
                  <p className="text-lg">No sessions yet. Start your neural journey!</p>
                  <button onClick={() => onNavigateStudy?.()} className="mt-6 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-on-primary rounded-full font-bold hover:opacity-90 transition-opacity">
                    Begin Session
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {recent3.map((session, i) => {
                    const colors = ['text-primary', 'text-secondary', 'text-tertiary'];
                    const bgs    = ['bg-primary/10', 'bg-secondary/10', 'bg-tertiary/10'];
                    const color  = colors[i % 3];
                    const bg     = bgs[i % 3];
                    const Icon   = subjectIcon(session.subject);
                    const handleOpen = () => {
                      try {
                        const bd: ProblemBreakdown = JSON.parse(session.breakdown_json);
                        bd.id = session.id;
                        onNavigateStudy?.(bd);
                      } catch {
                        onNavigateStudy?.();
                      }
                    };
                    return (
                      <motion.div
                        key={session.id}
                        onClick={handleOpen}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-surface-container-highest/40 backdrop-blur-xl p-5 sm:p-6 rounded-3xl sm:rounded-[32px] group hover:bg-surface-container transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/3 blur-[60px] rounded-full pointer-events-none" />
                        <div className="flex justify-between items-start mb-6 relative z-10">
                          <div className={`p-3 rounded-2xl ${bg}`}>
                            <Icon className={`w-5 h-5 ${color}`} />
                          </div>
                          <span className="text-[10px] font-label text-on-surface-variant">{formatRelative(session.created_at)}</span>
                        </div>
                        <h4 className={`text-lg sm:text-xl font-bold mb-2 group-hover:${color} transition-colors relative z-10 line-clamp-2`}>
                          <RichText mode="preview">{toSingleLinePreview(session.title)}</RichText>
                        </h4>
                        <p className="text-sm text-on-surface-variant mb-2 relative z-10">
                          Subject: {session.subject} • {session.node_count} nodes
                        </p>
                        {session.user_role && session.user_role !== 'owner' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest mb-4 relative z-10">
                            <Users className="w-2.5 h-2.5" /> Shared with you
                          </span>
                        )}
                        <div className={`flex items-center gap-2 ${color} font-bold text-xs uppercase tracking-widest relative z-10`}>
                          <span>View breakdown</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Detailed History Log */}
            <section className="lg:col-span-12">
              <div className="bg-surface-container-low rounded-3xl sm:rounded-[40px] overflow-hidden">
                <div className="p-5 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/10">
                  <h3 className="text-xl sm:text-2xl font-headline font-bold">Detailed History Log</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-on-surface-variant">{filtered.length} sessions</span>
                  </div>
                </div>

                <div className="md:hidden">
                  {loading ? (
                    <div className="p-5 space-y-3">
                      {[0,1,2].map(i => <div key={i} className="h-24 bg-surface-container-highest rounded-2xl animate-pulse" />)}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="px-5 py-12 text-center text-on-surface-variant">No sessions found.</div>
                  ) : (
                    <div className="divide-y divide-outline-variant/10">
                      {filtered.map(session => {
                        const sc = subjectColor(session.subject);
                        const handleOpen = () => {
                          try {
                            const bd: ProblemBreakdown = JSON.parse(session.breakdown_json);
                            bd.id = session.id;
                            onNavigateStudy?.(bd);
                          } catch {
                            onNavigateStudy?.();
                          }
                        };
                        return (
                          <div key={session.id} className="flex items-center gap-2 pr-3 hover:bg-surface-container-highest/40 transition-colors group">
                            <button
                              onClick={handleOpen}
                              className="flex-1 text-left px-5 py-4 min-w-0"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <h4 className="font-bold text-on-surface line-clamp-2">
                                    <RichText mode="preview">{toSingleLinePreview(session.title)}</RichText>
                                  </h4>
                                  <p className="mt-1 text-xs text-on-surface-variant line-clamp-1">
                                    <RichText mode="preview">{toSingleLinePreview(session.problem)}</RichText>
                                  </p>
                                </div>
                                <span className="shrink-0 text-[10px] text-on-surface-variant">{formatDate(session.created_at)}</span>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs">
                                <span className={`px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>{session.subject}</span>
                                {session.user_role && session.user_role !== 'owner' && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest">
                                    <Users className="w-2.5 h-2.5" /> Shared
                                  </span>
                                )}
                                <span className="text-on-surface-variant">{session.node_count} nodes</span>
                                <span className="text-on-surface-variant">{formatDuration(session.duration_seconds)}</span>
                              </div>
                            </button>
                            {(!session.user_role || session.user_role === 'owner') && (
                              <button
                                onClick={() => setConfirmDeleteId(session.id)}
                                disabled={deletingId === session.id}
                                className="shrink-0 p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete session"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  {loading ? (
                    <div className="p-8 space-y-3">
                      {[0,1,2].map(i => <div key={i} className="h-12 bg-surface-container-highest rounded-2xl animate-pulse" />)}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="px-8 py-16 text-center text-on-surface-variant">No sessions found.</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-surface-container text-on-surface-variant text-[10px] font-label uppercase tracking-widest">
                        <tr>
                          <th className="px-8 py-4 font-medium">Session Date</th>
                          <th className="px-8 py-4 font-medium">Topic</th>
                          <th className="px-8 py-4 font-medium">Subject</th>
                          <th className="px-8 py-4 font-medium">Nodes</th>
                          <th className="px-8 py-4 font-medium">Duration</th>
                          <th className="px-4 py-4 font-medium" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {filtered.map(session => {
                          const sc = subjectColor(session.subject);
                          const handleOpen = () => {
                            try {
                              const bd: ProblemBreakdown = JSON.parse(session.breakdown_json);
                              bd.id = session.id;
                              onNavigateStudy?.(bd);
                            } catch {
                              onNavigateStudy?.();
                            }
                          };
                          return (
                            <motion.tr
                              key={session.id}
                              onClick={handleOpen}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="hover:bg-surface-container-highest/50 transition-colors cursor-pointer group"
                            >
                              <td className="px-8 py-6 text-sm text-on-surface-variant">{formatDate(session.created_at)}</td>
                              <td className="px-8 py-6 font-bold text-on-surface max-w-xs">
                                <span className="line-clamp-1 block">
                                  <RichText mode="preview">{toSingleLinePreview(session.title)}</RichText>
                                </span>
                                <span className="block text-xs text-on-surface-variant font-normal mt-0.5 line-clamp-1">
                                  <RichText mode="preview">{toSingleLinePreview(session.problem)}</RichText>
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-3 py-1 ${sc.bg} ${sc.text} text-[10px] rounded-full`}>{session.subject}</span>
                                  {session.user_role && session.user_role !== 'owner' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-widest">
                                      <Users className="w-2.5 h-2.5" /> Shared
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                  <div className="w-12 bg-surface-container-highest h-1 rounded-full overflow-hidden">
                                    <div className={`${sc.bar} h-full`} style={{ width: `${Math.min(100, session.node_count * 10)}%` }} />
                                  </div>
                                  <span className="text-xs font-bold">{session.node_count}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-sm text-on-surface-variant">
                                {formatDuration(session.duration_seconds)}
                              </td>
                              <td className="px-4 py-6" onClick={e => e.stopPropagation()}>
                                {(!session.user_role || session.user_role === 'owner') && (
                                  <button
                                    onClick={() => setConfirmDeleteId(session.id)}
                                    disabled={deletingId === session.id}
                                    className="p-2 rounded-xl text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete session"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </section>

          </div>
        </div>
      </motion.main>

      {/* ── Delete confirmation dialog ──────────────────────────────────── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-container-low border border-outline-variant/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-error/10">
                <Trash2 className="w-5 h-5 text-error" />
              </div>
              <h3 className="font-headline font-bold text-lg">Delete session?</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              This will permanently remove the session and all its data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-full border border-outline-variant/30 text-on-surface text-sm font-bold hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-full bg-error text-on-error text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
