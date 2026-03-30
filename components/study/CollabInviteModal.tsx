import { useState, useCallback } from 'react';
import { Copy, Check, Loader2, UserMinus, Users, Activity } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { SessionMember, MemberRole, ActivityLogEntry } from '../../hooks/useSessionCollaboration';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  sessionId: string | null;
  currentUserId: string | null;
  members: SessionMember[];
  isLoadingMembers: boolean;
  activity: ActivityLogEntry[];
  isLoadingActivity: boolean;
  onClose: () => void;
  onCreateInviteLink: (role: 'editor' | 'viewer') => Promise<string | null>;
  onRemoveMember: (memberUserId: string) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roleLabel(role: MemberRole): string {
  if (role === 'owner')  return 'Owner';
  if (role === 'editor') return 'Editor';
  return 'Viewer';
}

function roleBadgeClass(role: MemberRole): string {
  if (role === 'owner')  return 'text-primary   bg-primary/10';
  if (role === 'editor') return 'text-secondary bg-secondary/10';
  return 'text-tertiary  bg-tertiary/10';
}

function initials(name: string, email: string): string {
  const src = name.trim() || email.trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

function actionLabel(action: string, metadata: Record<string, unknown>): string {
  switch (action) {
    case 'session_created': return 'created this session';
    case 'session_updated': {
      const fields = metadata.fields as string[] | undefined;
      return fields?.length ? `updated ${fields.join(', ')}` : 'updated the session';
    }
    case 'deep_dive_message': return 'sent a deep dive message';
    case 'invitation_created': return `created a ${metadata.role ?? ''} invite link`;
    case 'member_joined':      return `joined as ${metadata.role ?? 'member'}`;
    case 'member_left':        return 'left the session';
    case 'member_removed':     return 'was removed from the session';
    default:                   return action.replace(/_/g, ' ');
  }
}

function formatRelativeShort(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CollabInviteModal({
  isOpen,
  sessionId,
  currentUserId,
  members,
  isLoadingMembers,
  activity,
  isLoadingActivity,
  onClose,
  onCreateInviteLink,
  onRemoveMember,
}: Props) {
  const [inviteRole, setInviteRole]           = useState<'editor' | 'viewer'>('editor');
  const [inviteLink, setInviteLink]           = useState<string | null>(null);
  const [isGenerating, setIsGenerating]       = useState(false);
  const [isCopied, setIsCopied]               = useState(false);
  const [removingId, setRemovingId]           = useState<string | null>(null);
  const [inviteError, setInviteError]         = useState<string | null>(null);

  const currentUserIsOwner = members.some(
    m => m.user_id === currentUserId && m.role === 'owner'
  );

  const handleGenerateLink = useCallback(async () => {
    if (!sessionId) return;
    setIsGenerating(true);
    setInviteError(null);
    try {
      const link = await onCreateInviteLink(inviteRole);
      if (link) {
        setInviteLink(link);
      } else {
        setInviteError('Failed to generate link. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  }, [sessionId, inviteRole, onCreateInviteLink]);

  const handleCopy = useCallback(async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
    }
  }, [inviteLink]);

  const handleRemove = useCallback(async (memberUserId: string) => {
    setRemovingId(memberUserId);
    try {
      await onRemoveMember(memberUserId);
    } finally {
      setRemovingId(null);
    }
  }, [onRemoveMember]);

  const handleClose = () => {
    setInviteLink(null);
    setIsCopied(false);
    setInviteError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Collaborators"
      subtitle="Share this session so others can study together with you."
      maxWidth="md"
    >
      {/* ── Invite link generator ────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
          Generate Invite Link
        </p>

        {/* Role selector */}
        <div className="flex gap-2 mb-3">
          {(['editor', 'viewer'] as const).map(r => (
            <button
              key={r}
              onClick={() => { setInviteRole(r); setInviteLink(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                inviteRole === r
                  ? 'bg-primary/15 border-primary/50 text-primary'
                  : 'bg-transparent border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60'
              }`}
            >
              {r === 'editor' ? 'Can Edit' : 'View Only'}
            </button>
          ))}
        </div>

        {!inviteLink ? (
          <>
            <button
              onClick={handleGenerateLink}
              disabled={isGenerating || !sessionId}
              className="w-full py-3 rounded-xl bg-primary text-on-primary text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isGenerating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><Users className="w-4 h-4" /> Generate Link</>
              }
            </button>
            {inviteError && (
              <p className="text-xs text-error mt-2 text-center">{inviteError}</p>
            )}
          </>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1 bg-surface-container rounded-xl px-3 py-2.5 text-xs text-on-surface-variant font-mono truncate border border-outline-variant/20">
              {inviteLink}
            </div>
            <button
              onClick={handleCopy}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                isCopied
                  ? 'bg-secondary/15 border-secondary/50 text-secondary'
                  : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-primary hover:border-primary/40'
              }`}
              title="Copy link"
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        <p className="text-[10px] text-on-surface-variant/60 mt-2 text-center">
          Link expires in 7 days · {inviteRole === 'editor' ? 'Editors can contribute to the session' : 'Viewers can only read'}
        </p>
      </div>

      {/* ── Members list ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
          Members · {members.length}
        </p>

        {isLoadingMembers && members.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-on-surface-variant">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-4">No members yet.</p>
        ) : (
          <ul className="space-y-2">
            {members.map(member => {
              const isSelf     = member.user_id === currentUserId;
              const canRemove  = (currentUserIsOwner && !isSelf && member.role !== 'owner') || isSelf;
              const isRemoving = removingId === member.user_id;

              return (
                <li
                  key={member.user_id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container/50 border border-outline-variant/10"
                >
                  {/* Avatar */}
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                      {initials(member.full_name, member.email)}
                    </div>
                  )}

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate">
                      {member.full_name || member.email}
                      {isSelf && <span className="text-on-surface-variant font-normal"> (you)</span>}
                    </p>
                    {member.full_name && (
                      <p className="text-[10px] text-on-surface-variant truncate">{member.email}</p>
                    )}
                  </div>

                  {/* Role badge */}
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${roleBadgeClass(member.role)}`}>
                    {roleLabel(member.role)}
                  </span>

                  {/* Remove / Leave */}
                  {canRemove && (
                    <button
                      onClick={() => handleRemove(member.user_id)}
                      disabled={isRemoving}
                      className="w-7 h-7 rounded-lg text-on-surface-variant/40 hover:text-error hover:bg-error/10 flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
                      title={isSelf ? 'Leave session' : 'Remove member'}
                    >
                      {isRemoving
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <UserMinus className="w-3.5 h-3.5" />
                      }
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {/* ── Activity log ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Activity className="w-3 h-3" /> Activity
        </p>

        {isLoadingActivity && activity.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-on-surface-variant">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : activity.length === 0 ? (
          <p className="text-xs text-on-surface-variant text-center py-4">No activity yet.</p>
        ) : (
          <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {activity.map(entry => (
              <li key={entry.id} className="flex items-start gap-2.5">
                {/* Actor avatar */}
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {entry.actor_name ? entry.actor_name.slice(0, 2).toUpperCase() : '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-on-surface leading-snug">
                    <span className="font-semibold">{entry.actor_name ?? 'Someone'}</span>
                    {' '}{actionLabel(entry.action, entry.metadata)}
                  </p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">
                    {formatRelativeShort(entry.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
