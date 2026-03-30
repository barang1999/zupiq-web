import { useEffect, useState, useRef, useCallback } from 'react';
import { api, tokenStorage } from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface SessionMember {
  id: string;
  user_id: string;
  role: MemberRole;
  full_name: string;
  email: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface ActivityLogEntry {
  id: string;
  session_id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_name?: string | null;
  actor_avatar?: string | null;
}

interface CollabEvent {
  type: string;
  sessionId: string;
  payload: unknown;
  timestamp: string;
}

interface UseSessionCollaborationOptions {
  /** Called when a collaborator saves the session (session_updated event). */
  onSessionUpdated?: (updatedByUserId: string) => void;
  /** Called when a new member joins. */
  onMemberJoined?: (userId: string) => void;
  /** Called when a member leaves. */
  onMemberLeft?: (userId: string) => void;
  /**
   * Called when the SSE stream reconnects after a drop.
   * Use this to re-sync any state that may have changed while disconnected.
   */
  onReconnected?: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSessionCollaboration(
  sessionId: string | null,
  options?: UseSessionCollaborationOptions
) {
  const [members, setMembers]             = useState<SessionMember[]>([]);
  const [connected, setConnected]         = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [activity, setActivity]           = useState<ActivityLogEntry[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  const abortRef  = useRef<AbortController | null>(null);
  const optionRef = useRef(options);
  optionRef.current = options;

  // ─── Fetch member list ─────────────────────────────────────────────────────

  const fetchMembers = useCallback(async () => {
    if (!sessionId) return;
    setIsLoadingMembers(true);
    try {
      const { members: list } = await api.get<{ members: SessionMember[] }>(
        `/api/sessions/${sessionId}/members`
      );
      setMembers(list);
    } catch {
      // Non-fatal — leave the previous list in place
    } finally {
      setIsLoadingMembers(false);
    }
  }, [sessionId]);

  // ─── Fetch activity log ────────────────────────────────────────────────────

  const fetchActivity = useCallback(async () => {
    if (!sessionId) return;
    setIsLoadingActivity(true);
    try {
      const { activity: log } = await api.get<{ activity: ActivityLogEntry[] }>(
        `/api/sessions/${sessionId}/activity`
      );
      setActivity(log);
    } catch {
      // Non-fatal
    } finally {
      setIsLoadingActivity(false);
    }
  }, [sessionId]);

  // ─── SSE connection with auto-reconnect ───────────────────────────────────

  useEffect(() => {
    if (!sessionId) {
      setConnected(false);
      setMembers([]);
      return;
    }

    fetchMembers();
    fetchActivity();

    const abort = new AbortController();
    abortRef.current = abort;

    const BASE_DELAY_MS = 2_000;
    const MAX_DELAY_MS  = 30_000;
    let retryDelay      = BASE_DELAY_MS;
    let isFirstConnect  = true;

    // Jitter helper — spreads reconnects so a server restart doesn't get
    // hit by all clients simultaneously (thundering herd).
    const withJitter = (ms: number) => ms * (0.75 + Math.random() * 0.5);

    const connect = async (): Promise<void> => {
      if (abort.signal.aborted) return;

      const token = tokenStorage.getAccess();
      if (!token) return;

      try {
        const rawBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
        const base = rawBase || window.location.origin;
        const url = `${base}/api/sessions/${sessionId}/collab/stream`;

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abort.signal,
        });

        if (!response.ok || !response.body) {
          setConnected(false);
          throw new Error(`SSE responded ${response.status}`);
        }

        // Connection established — reset backoff and notify on reconnects.
        if (!isFirstConnect) {
          fetchMembers();
          fetchActivity();
          optionRef.current?.onReconnected?.();
        }
        isFirstConnect = false;
        retryDelay = BASE_DELAY_MS;
        setConnected(true);

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer       = '';
        let currentEvent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as CollabEvent;
                const payload = data.payload as Record<string, unknown>;

                if (currentEvent === 'session_updated') {
                  optionRef.current?.onSessionUpdated?.(payload.updatedBy as string);
                } else if (currentEvent === 'member_joined') {
                  fetchMembers();
                  fetchActivity();
                  optionRef.current?.onMemberJoined?.(payload.userId as string);
                } else if (currentEvent === 'member_left') {
                  fetchMembers();
                  fetchActivity();
                  optionRef.current?.onMemberLeft?.(payload.userId as string);
                } else if (currentEvent === 'activity_logged') {
                  fetchActivity();
                }
              } catch {
                // Ignore parse errors
              }
              currentEvent = '';
            }
          }
        }

        // Stream ended cleanly — treat as a drop and reconnect.
        throw new Error('SSE stream closed');
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError' || abort.signal.aborted) return;
        setConnected(false);
      }

      // Wait with jitter then reconnect.
      const delay = withJitter(retryDelay);
      console.log('[SSE] will reconnect in', Math.round(delay), 'ms');
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, delay);
        abort.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); });
      });
      retryDelay = Math.min(MAX_DELAY_MS, retryDelay * 2);
      void connect();
    };

    void connect();

    // Re-sync data when the tab becomes visible again — catches missed events while hidden.
    // Does NOT touch the SSE connection; the reconnect loop handles that independently.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !abort.signal.aborted) {
        fetchMembers();
        fetchActivity();
        optionRef.current?.onReconnected?.();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      abort.abort();
      setConnected(false);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sessionId, fetchMembers, fetchActivity]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const createInviteLink = useCallback(
    async (role: 'editor' | 'viewer' = 'editor'): Promise<string | null> => {
      if (!sessionId) return null;
      try {
        const { invitation } = await api.post<{ invitation: { invite_token: string } }>(
          `/api/sessions/${sessionId}/invite`,
          { role }
        );
        return `${window.location.origin}/join?token=${invitation.invite_token}`;
      } catch {
        return null;
      }
    },
    [sessionId]
  );

  const removeMember = useCallback(
    async (memberUserId: string): Promise<void> => {
      if (!sessionId) return;
      await api.delete(`/api/sessions/${sessionId}/members/${memberUserId}`);
      setMembers(prev => prev.filter(m => m.user_id !== memberUserId));
    },
    [sessionId]
  );

  return {
    members,
    connected,
    isLoadingMembers,
    activity,
    isLoadingActivity,
    createInviteLink,
    removeMember,
    refreshMembers: fetchMembers,
    refreshActivity: fetchActivity,
  };
}
