import { useState, useEffect } from 'react';
import { Loader2, Users, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvitationPreview {
  session_id: string;
  session_title: string;
  inviter_name: string;
  role: 'editor' | 'viewer';
  expires_at: string;
}

interface Props {
  token: string;
  onJoined: (sessionId: string) => void;
  onNavigateStudy: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function JoinSessionPage({ token, onJoined, onNavigateStudy }: Props) {
  const [preview, setPreview]   = useState<InvitationPreview | null>(null);
  const [loading, setLoading]   = useState(true);
  const [joining, setJoining]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link.');
      setLoading(false);
      return;
    }

    api.get<{ invitation: InvitationPreview }>(`/api/invitations/${token}`)
      .then(({ invitation }) => setPreview(invitation))
      .catch(() => setError('This invite link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    if (!token) return;
    setJoining(true);
    setError(null);
    try {
      const { sessionId } = await api.post<{ sessionId: string }>(
        `/api/invitations/${token}/accept`
      );
      onJoined(sessionId);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to join session. Please try again.');
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4">
      {/* Ambient glows */}
      <div className="fixed top-1/4 -right-20 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="fixed bottom-1/4 -left-20 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-sm">
        <div className="bg-surface-container-highest/95 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center">

          {loading && (
            <>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
              <p className="text-on-surface-variant text-sm">Loading invitation…</p>
            </>
          )}

          {!loading && error && (
            <>
              <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-7 h-7 text-error" />
              </div>
              <h1 className="font-headline text-xl font-bold mb-2">Link Unavailable</h1>
              <p className="text-on-surface-variant text-sm mb-6">{error}</p>
              <button
                onClick={onNavigateStudy}
                className="w-full py-3 rounded-2xl bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-highest transition-colors"
              >
                Go to Study Space
              </button>
            </>
          )}

          {!loading && !error && preview && (
            <>
              <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-6">
                <Users className="w-7 h-7 text-secondary" />
              </div>

              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                Study Invitation
              </span>

              <h1 className="font-headline text-xl font-bold mt-2 mb-1 leading-tight">
                {preview.session_title}
              </h1>

              <p className="text-on-surface-variant text-sm mb-1">
                <span className="text-on-surface font-medium">{preview.inviter_name}</span>
                {' '}invited you to collaborate as{' '}
                <span className={`font-medium ${preview.role === 'editor' ? 'text-secondary' : 'text-tertiary'}`}>
                  {preview.role === 'editor' ? 'Editor' : 'Viewer'}
                </span>
              </p>

              <p className="text-[11px] text-on-surface-variant/60 mb-8">
                {preview.role === 'editor'
                  ? 'You will be able to contribute to this session.'
                  : 'You will be able to view this session.'}
              </p>

              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-on-primary text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {joining
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining…</>
                  : <><ArrowRight className="w-4 h-4" /> Join Session</>
                }
              </button>

              <button
                onClick={onNavigateStudy}
                className="mt-3 w-full py-2.5 rounded-2xl text-on-surface-variant text-xs font-medium hover:text-on-surface transition-colors"
              >
                Maybe later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
