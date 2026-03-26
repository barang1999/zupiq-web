import React, { useEffect, useState } from "react";
import { Plus, Search, ChevronLeft, Copy, Check } from "lucide-react";
import { PageLayout, PageContainer } from "../components/layout/PageLayout";
import { GroupCard } from "../components/groups/GroupCard";
import { GroupChat } from "../components/groups/GroupChat";
import { MembersList } from "../components/groups/MembersList";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal, ModalFooter } from "../components/ui/Modal";
import { PageLoading } from "../components/ui/Spinner";
import { useGroups } from "../hooks/useGroups";
import { useAuth } from "../hooks/useAuth";
import type { Group } from "../types/group.types";

type View = "list" | "group";
type Tab = "chat" | "members";

export default function GroupsPage() {
  const [view, setView] = useState<View>("list");
  const [tab, setTab] = useState<Tab>("chat");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", subject: "" });
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);

  const { user } = useAuth();
  const {
    groups, myGroups, currentGroup, members, posts,
    isLoading, fetchPublicGroups, fetchMyGroups, fetchGroup,
    fetchMembers, fetchPosts, createGroup, joinGroup, postMessage,
    setCurrentGroup,
  } = useGroups();

  useEffect(() => {
    fetchPublicGroups();
    fetchMyGroups();
  }, [fetchPublicGroups, fetchMyGroups]);

  const handleViewGroup = async (group: Group) => {
    setCurrentGroup(group);
    await Promise.all([
      fetchGroup(group.id),
      fetchMembers(group.id),
      fetchPosts(group.id),
    ]);
    setView("group");
  };

  const handleJoin = async (group: Group) => {
    await joinGroup(group.invite_code);
    await handleViewGroup(group);
  };

  const handleCreateGroup = async () => {
    await createGroup({ ...createForm });
    setIsCreateOpen(false);
    setCreateForm({ name: "", description: "", subject: "" });
    fetchMyGroups();
  };

  const handleJoinByCode = async () => {
    const group = await joinGroup(inviteCode);
    setIsJoinOpen(false);
    setInviteCode("");
    await handleViewGroup(group);
  };

  const copyInviteCode = async () => {
    if (!currentGroup) return;
    await navigator.clipboard.writeText(currentGroup.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading && groups.length === 0) return <PageLoading message="Loading groups..." />;

  return (
    <PageLayout>
      <PageContainer
        title={view === "list" ? "Study Groups" : currentGroup?.name ?? "Group"}
        subtitle={view === "list" ? "Connect with other students and learn together" : currentGroup?.description ?? undefined}
        action={
          view === "list" ? (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsJoinOpen(true)}>Join</Button>
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>Create</Button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              {currentGroup && (
                <Button variant="ghost" size="sm" onClick={copyInviteCode} leftIcon={copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}>
                  {currentGroup.invite_code}
                </Button>
              )}
              <Button variant="ghost" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />} onClick={() => setView("list")}>Back</Button>
            </div>
          )
        }
      >
        {view === "list" ? (
          <div className="space-y-6">
            {/* My groups */}
            {myGroups.length > 0 && (
              <section>
                <h2 className="font-headline text-lg font-bold text-on-surface mb-3">My Groups</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myGroups.map((g) => (
                    <GroupCard key={g.id} group={g} onView={handleViewGroup} isMember />
                  ))}
                </div>
              </section>
            )}

            {/* Explore */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-headline text-lg font-bold text-on-surface">Explore Groups</h2>
                <div className="w-64">
                  <Input
                    placeholder="Search groups..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGroups.map((g) => {
                  const isMember = myGroups.some((mg) => mg.id === g.id);
                  return (
                    <GroupCard key={g.id} group={g} onView={handleViewGroup} onJoin={!isMember ? handleJoin : undefined} isMember={isMember} />
                  );
                })}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex flex-col h-[calc(100vh-280px)]">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {(["chat", "members"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${tab === t ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-surface-container-high"}`}>
                  {t}
                  {t === "members" && ` (${members.length})`}
                </button>
              ))}
            </div>

            {tab === "chat" ? (
              <div className="flex-1 bg-surface-container-low rounded-2xl border border-white/5 overflow-hidden">
                <GroupChat
                  posts={posts}
                  onPost={(content) => postMessage(currentGroup!.id, { content })}
                  isLoading={isLoading}
                  currentUserId={user?.id ?? ""}
                />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <MembersList members={members} currentUserId={user?.id ?? ""} groupOwnerId={currentGroup?.owner_id ?? ""} />
              </div>
            )}
          </div>
        )}
      </PageContainer>

      {/* Create group modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Study Group">
        <div className="space-y-4">
          <Input label="Group Name" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Calc Study Squad" required />
          <Input label="Subject (optional)" value={createForm.subject} onChange={(e) => setCreateForm((f) => ({ ...f, subject: e.target.value }))} placeholder="e.g. Mathematics" />
          <Input label="Description (optional)" value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} placeholder="What will this group focus on?" />
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateGroup} disabled={!createForm.name.trim()}>Create Group</Button>
        </ModalFooter>
      </Modal>

      {/* Join group modal */}
      <Modal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} title="Join a Group" subtitle="Enter the invite code shared by a group member">
        <Input label="Invite Code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="e.g. ABC12345" />
        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsJoinOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleJoinByCode} disabled={!inviteCode.trim()}>Join Group</Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
