import { useState, useCallback } from "react";
import { api } from "../lib/api";
import type { Group, GroupMember, GroupPost, CreateGroupDTO, CreateGroupPostDTO } from "../types/group.types";

interface UseGroupsReturn {
  groups: Group[];
  myGroups: Group[];
  currentGroup: Group | null;
  members: GroupMember[];
  posts: GroupPost[];
  isLoading: boolean;
  error: string | null;
  fetchPublicGroups: (subject?: string) => Promise<void>;
  fetchMyGroups: () => Promise<void>;
  fetchGroup: (groupId: string) => Promise<void>;
  fetchMembers: (groupId: string) => Promise<void>;
  fetchPosts: (groupId: string, page?: number) => Promise<void>;
  createGroup: (dto: CreateGroupDTO) => Promise<Group>;
  joinGroup: (inviteCode: string) => Promise<Group>;
  leaveGroup: (groupId: string) => Promise<void>;
  postMessage: (groupId: string, dto: CreateGroupPostDTO) => Promise<GroupPost>;
  setCurrentGroup: (group: Group | null) => void;
}

export function useGroups(): UseGroupsReturn {
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPublicGroups = useCallback(async (subject?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = subject ? `/api/groups?subject=${subject}` : "/api/groups";
      const data = await api.get<{ groups: Group[] }>(url);
      setGroups(data.groups);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch groups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ groups: Group[] }>("/api/groups/mine");
      setMyGroups(data.groups);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch your groups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchGroup = useCallback(async (groupId: string) => {
    setIsLoading(true);
    try {
      const data = await api.get<{ group: Group }>(`/api/groups/${groupId}`);
      setCurrentGroup(data.group);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch group");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async (groupId: string) => {
    try {
      const data = await api.get<{ members: GroupMember[] }>(`/api/groups/${groupId}/members`);
      setMembers(data.members);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchPosts = useCallback(async (groupId: string, page = 1) => {
    try {
      const data = await api.get<{ posts: GroupPost[] }>(
        `/api/groups/${groupId}/posts?page=${page}`
      );
      setPosts(data.posts);
    } catch {
      // Non-critical
    }
  }, []);

  const createGroup = useCallback(async (dto: CreateGroupDTO): Promise<Group> => {
    const data = await api.post<{ group: Group }>("/api/groups", dto);
    setMyGroups((prev) => [data.group, ...prev]);
    return data.group;
  }, []);

  const joinGroup = useCallback(async (inviteCode: string): Promise<Group> => {
    const data = await api.post<{ group: Group }>("/api/groups/join", {
      invite_code: inviteCode,
    });
    setMyGroups((prev) => [data.group, ...prev]);
    return data.group;
  }, []);

  const leaveGroup = useCallback(
    async (groupId: string) => {
      // TODO: get userId from auth context
      // await api.delete(`/api/groups/${groupId}/members/${userId}`);
      setMyGroups((prev) => prev.filter((g) => g.id !== groupId));
    },
    []
  );

  const postMessage = useCallback(
    async (groupId: string, dto: CreateGroupPostDTO): Promise<GroupPost> => {
      const data = await api.post<{ post: GroupPost }>(
        `/api/groups/${groupId}/posts`,
        dto
      );
      setPosts((prev) => [data.post, ...prev]);
      return data.post;
    },
    []
  );

  return {
    groups,
    myGroups,
    currentGroup,
    members,
    posts,
    isLoading,
    error,
    fetchPublicGroups,
    fetchMyGroups,
    fetchGroup,
    fetchMembers,
    fetchPosts,
    createGroup,
    joinGroup,
    leaveGroup,
    postMessage,
    setCurrentGroup,
  };
}
