export const STUDY_RECOMMENDED_PROMPT_STORAGE_KEY = 'zupiq_study_recommended_prompt_v1';

export interface RecommendationSourceSession {
  id: string;
  title: string;
  subject: string;
  problem: string;
  node_count: number;
  breakdown_json: string;
  created_at: string;
}

export interface StudyRecommendation {
  subject: string;
  normalizedSubject: string;
  sessionCount: number;
  totalNodes: number;
  lastReviewedAt: string;
  focusSession: RecommendationSourceSession;
  recoveryPrompt: string;
}

interface SubjectBucket {
  subject: string;
  normalizedSubject: string;
  sessions: RecommendationSourceSession[];
  sessionCount: number;
  totalNodes: number;
  lastReviewedMs: number;
}

function normalizeSubject(subject: string): string {
  return (subject ?? '').trim().toLowerCase().replace(/\s+/g, ' ') || 'general';
}

function toEpochMs(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function clipSingleLine(input: string, max = 120): string {
  const compact = String(input ?? '').replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trimEnd()}...`;
}

function buildRecoveryPrompt(subject: string, title: string, problem: string): string {
  const safeTitle = clipSingleLine(title || problem, 120);
  const safeProblem = clipSingleLine(problem, 180);
  return [
    `Create a short recovery study round for ${subject}.`,
    `Focus topic: ${safeTitle}.`,
    `Reference context: ${safeProblem}.`,
    'Give a clear root concept, 3 focused subtopics, and quick practice checks.',
  ].join('\n');
}

export function computeLeastReviewedRecommendation(
  sessions: RecommendationSourceSession[]
): StudyRecommendation | null {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;

  const buckets = new Map<string, SubjectBucket>();

  for (const session of sessions) {
    if (!session) continue;
    const normalizedSubject = normalizeSubject(session.subject);
    const subjectDisplay = (session.subject ?? '').trim() || 'General';
    const reviewedNodes = Math.max(0, Number(session.node_count) || 0);
    const reviewedAtMs = toEpochMs(session.created_at);

    const existing = buckets.get(normalizedSubject);
    if (!existing) {
      buckets.set(normalizedSubject, {
        subject: subjectDisplay,
        normalizedSubject,
        sessions: [session],
        sessionCount: 1,
        totalNodes: reviewedNodes,
        lastReviewedMs: reviewedAtMs,
      });
      continue;
    }

    existing.sessions.push(session);
    existing.sessionCount += 1;
    existing.totalNodes += reviewedNodes;
    if (reviewedAtMs >= existing.lastReviewedMs) {
      existing.lastReviewedMs = reviewedAtMs;
      existing.subject = subjectDisplay;
    }
  }

  const ranked = [...buckets.values()].sort((a, b) => {
    if (a.sessionCount !== b.sessionCount) return a.sessionCount - b.sessionCount;
    if (a.totalNodes !== b.totalNodes) return a.totalNodes - b.totalNodes;
    if (a.lastReviewedMs !== b.lastReviewedMs) return a.lastReviewedMs - b.lastReviewedMs;
    return a.normalizedSubject.localeCompare(b.normalizedSubject);
  });

  const weakest = ranked[0];
  if (!weakest) return null;

  const focusSession = [...weakest.sessions].sort(
    (a, b) => toEpochMs(b.created_at) - toEpochMs(a.created_at)
  )[0];

  if (!focusSession) return null;

  return {
    subject: weakest.subject,
    normalizedSubject: weakest.normalizedSubject,
    sessionCount: weakest.sessionCount,
    totalNodes: weakest.totalNodes,
    lastReviewedAt: focusSession.created_at,
    focusSession,
    recoveryPrompt: buildRecoveryPrompt(
      weakest.subject,
      focusSession.title,
      focusSession.problem
    ),
  };
}
