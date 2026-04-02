import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Brain,
  FlaskConical,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { RichText } from '../components/ui/RichText';
import { getSessionsCached } from '../lib/sessions';
import { supabase } from '../lib/supabase';
import { firebaseSignOut } from '../lib/firebase';

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

interface Props {
  user: any;
  onNavigateStudy?: (breakdown?: ProblemBreakdown) => void;
  onNavigateFlashcards?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const m = Math.max(1, Math.floor(secs / 60));
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function toSingleLinePreview(value: string): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function subjectStyle(subject: string): { badge: string; accent: string } {
  const s = subject.toLowerCase();
  if (s.includes('math') || s.includes('calculus') || s.includes('algebra')) {
    return { badge: 'bg-primary/10 text-primary', accent: 'border-primary/40' };
  }
  if (s.includes('physics') || s.includes('science') || s.includes('chemistry')) {
    return { badge: 'bg-secondary/10 text-secondary', accent: 'border-secondary/40' };
  }
  return { badge: 'bg-tertiary/10 text-tertiary', accent: 'border-tertiary/40' };
}

function subjectIcon(subject: string) {
  const s = subject.toLowerCase();
  if (s.includes('physics') || s.includes('science')) return FlaskConical;
  if (s.includes('math') || s.includes('calculus')) return Layers;
  return Brain;
}

export default function MobileHistoryPage({
  user,
  onNavigateStudy,
  onNavigateFlashcards,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
}: Props) {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

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

  const totalSessions = sessions.length;
  const totalHours = useMemo(() => {
    const totalSeconds = sessions.reduce((sum, item) => sum + (item.duration_seconds ?? 0), 0);
    return (totalSeconds / 3600).toFixed(1);
  }, [sessions]);

  const recentActivity = sessions.slice(0, 8);
  const trendSeries = sessions.slice(0, 5).reverse().map((session) => {
    const normalized = Math.max(18, Math.min(100, Math.round(session.node_count * 9)));
    return { id: session.id, value: normalized, label: formatDate(session.created_at).slice(0, 3).toUpperCase() };
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const openSession = (session: StudySession) => {
    try {
      const breakdown: ProblemBreakdown = JSON.parse(session.breakdown_json);
      breakdown.id = session.id;
      onNavigateStudy?.(breakdown);
    } catch {
      onNavigateStudy?.();
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <div className="fixed top-1/4 -right-20 w-[420px] h-[420px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-1/3 -left-20 w-[320px] h-[320px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <AppHeader
        user={user}
        onSettingsClick={onNavigateSettings}
        onSignOut={handleSignOut}
        onNavigateStudy={() => onNavigateStudy?.()}
        onNavigateFlashcards={onNavigateFlashcards}
        activeMobileMenu="history"
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
      />

      <main className="relative z-10 px-5 pt-20 pb-36 space-y-8">
        <section className="relative overflow-hidden pt-2">
          <h1 className="font-headline text-4xl font-black tracking-tighter uppercase mb-6 leading-none">
            Neural <br /> Journey
          </h1>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl p-4 bg-surface-container-low border-l-4 border-primary">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Total Hours</p>
              <p className="font-headline text-3xl font-bold text-primary mt-1">{loading ? '—' : totalHours}</p>
            </div>
            <div className="rounded-3xl p-4 bg-surface-container-low border-l-4 border-secondary">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Sessions</p>
              <p className="font-headline text-3xl font-bold text-secondary mt-1">{loading ? '—' : totalSessions}</p>
            </div>
          </div>
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-secondary-container/10 blur-[60px] rounded-full -z-10" />
        </section>

        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="font-headline text-lg font-bold uppercase tracking-tight">Mastery Trends</h2>
            <span className="text-tertiary text-[11px] font-medium uppercase tracking-tight">
              Retention {loading ? '—' : `${Math.min(99, 70 + Math.round(totalSessions / 3))}%`}
            </span>
          </div>
          <div className="bg-surface-container rounded-3xl p-5 h-56 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-tertiary/5 blur-3xl rounded-full" />
            <div className="flex items-end justify-between h-32 gap-2">
              {(trendSeries.length > 0 ? trendSeries : [1, 2, 3, 4, 5].map((v) => ({ id: String(v), value: 22 + v * 12, label: `W${v}` }))).map((point) => (
                <div key={point.id} className="flex flex-col items-center flex-1">
                  <div className="w-full h-24 rounded-t-lg bg-primary/20 relative">
                    <div
                      className="absolute bottom-0 w-full rounded-t-lg bg-gradient-to-t from-primary to-secondary"
                      style={{ height: `${point.value}%` }}
                    />
                  </div>
                  <span className="text-[10px] mt-2 font-bold text-on-surface-variant">{point.label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Mastery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Intensity</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="rounded-[2.2rem] bg-surface-container-highest/60 backdrop-blur-xl p-6 relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary-container rounded-full opacity-20 blur-2xl animate-pulse" />
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Zap className="w-5 h-5 text-on-primary" />
              </div>
              <div>
                <h3 className="font-headline text-xl font-bold">Neural Pulse</h3>
                <p className="text-tertiary text-[10px] font-bold uppercase tracking-widest">AI Recommendation</p>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              Focus a short recovery round on your least reviewed topic to stabilize retention today.
            </p>
            <button
              onClick={() => onNavigateStudy?.()}
              className="w-full bg-gradient-to-r from-primary to-secondary text-on-primary font-headline font-bold py-3.5 rounded-full active:scale-95 transition-transform"
            >
              Start Recommended Session
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline text-lg font-bold tracking-tight uppercase">Recent Activity</h2>
            <button
              onClick={() => onNavigateStudy?.()}
              className="text-primary text-xs font-bold uppercase tracking-widest"
            >
              New Session
            </button>
          </div>
          {loading ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="min-w-[220px] h-36 rounded-3xl bg-surface-container-high animate-pulse" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="rounded-3xl bg-surface-container p-6 text-center text-on-surface-variant">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-primary" />
              No activity yet.
            </div>
          ) : (
            <div className="flex overflow-x-auto gap-4 pb-2 snap-x">
              {recentActivity.slice(0, 6).map((session) => {
                const style = subjectStyle(session.subject);
                return (
                  <button
                    key={session.id}
                    onClick={() => openSession(session)}
                    className={`min-w-[240px] text-left bg-surface-container rounded-3xl p-5 snap-start border-b-2 ${style.accent}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-widest ${style.badge}`}>
                        {session.subject}
                      </span>
                      <span className="text-on-surface-variant text-[10px]">{formatRelative(session.created_at)}</span>
                    </div>
                    <div className="font-headline font-bold mb-1 line-clamp-1">
                      <RichText mode="preview">{toSingleLinePreview(session.title)}</RichText>
                    </div>
                    <div className="text-xs text-on-surface-variant mb-4 line-clamp-1">
                      <RichText mode="preview">{toSingleLinePreview(session.problem)}</RichText>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-tertiary">
                      <span>{session.node_count} nodes</span>
                      <span>•</span>
                      <span>{formatDuration(session.duration_seconds)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="pb-2">
          <h2 className="font-headline text-lg font-bold tracking-tight uppercase mb-5">Detailed History</h2>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="h-20 rounded-2xl bg-surface-container-high animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl bg-surface-container-low p-6 text-center text-on-surface-variant">
              Your detailed history will appear here after your first session.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const style = subjectStyle(session.subject);
                const Icon = subjectIcon(session.subject);
                return (
                  <button
                    key={session.id}
                    onClick={() => openSession(session)}
                    className={`w-full bg-surface-container-low rounded-2xl p-4 flex items-center justify-between border-r-2 ${style.accent} text-left`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">
                          <RichText mode="preview">{toSingleLinePreview(session.title)}</RichText>
                        </div>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-medium">
                          {formatDate(session.created_at)} • {formatDuration(session.duration_seconds)}
                          {session.user_role && session.user_role !== 'owner' && (
                            <span className="ml-1.5 text-secondary font-bold">· Shared</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-primary font-bold text-xs">{session.node_count} nodes</p>
                      <ArrowRight className="w-3.5 h-3.5 text-on-surface-variant ml-auto mt-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
