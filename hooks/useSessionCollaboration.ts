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
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSessionCollaboration(
  sessionId: string | null,
  options?: UseSessionCollaborationOptions
) {
  const [members, setMembers]             = useState<SessionMember[]>([]);
  const [connected, setConnected]         = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

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

  // ─── SSE connection ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sessionId) {
      setConnected(false);
      setMembers([]);
      return;
    }

    fetchMembers();

    const token = tokenStorage.getAccess();
    if (!token) return;

    const abort = new AbortController();
    abortRef.current = abort;

    (async () => {
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
          return;
        }

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
                  optionRef.current?.onMemberJoined?.(payload.userId as string);
                } else if (currentEvent === 'member_left') {
                  fetchMembers();
                  optionRef.current?.onMemberLeft?.(payload.userId as string);
                }
              } catch {
                // Ignore parse errors
              }
              currentEvent = '';
            }
          }
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          setConnected(false);
        }
      }
    })();

    return () => {
      abort.abort();
      setConnected(false);
    };
  }, [sessionId, fetchMembers]);

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
    createInviteLink,
    removeMember,
    refreshMembers: fetchMembers,
  };
}
