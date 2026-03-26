import React from "react";
import { Crown, Shield, User as UserIcon } from "lucide-react";
import type { GroupMember, GroupMemberRole } from "../../types/group.types";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { formatRelativeTime } from "../../utils/formatters";

interface MembersListProps {
  members: GroupMember[];
  currentUserId: string;
  groupOwnerId: string;
}

const roleConfig: Record<GroupMemberRole, { label: string; icon: React.ElementType; variant: "primary" | "secondary" | "default" }> = {
  owner: { label: "Owner", icon: Crown, variant: "primary" },
  moderator: { label: "Mod", icon: Shield, variant: "secondary" },
  member: { label: "Member", icon: UserIcon, variant: "default" },
};

export function MembersList({ members, currentUserId, groupOwnerId }: MembersListProps) {
  const sorted = [...members].sort((a, b) => {
    const order = { owner: 0, moderator: 1, member: 2 };
    return order[a.role] - order[b.role];
  });

  return (
    <div className="space-y-2">
      {sorted.map((member) => {
        const config = roleConfig[member.role];
        const RoleIcon = config.icon;
        const isCurrentUser = member.user_id === currentUserId;

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container transition-colors"
          >
            <Avatar
              src={member.user_avatar}
              name={member.user_name ?? "Member"}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-on-surface truncate">
                  {member.user_name ?? "Unknown User"}
                  {isCurrentUser && (
                    <span className="text-on-surface-variant font-normal ml-1">(you)</span>
                  )}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Joined {formatRelativeTime(member.joined_at)}
              </p>
            </div>
            <Badge variant={config.variant} size="sm">
              <span className="flex items-center gap-1">
                <RoleIcon className="w-3 h-3" />
                {config.label}
              </span>
            </Badge>
          </div>
        );
      })}

      {members.length === 0 && (
        <p className="text-center text-on-surface-variant py-6 text-sm">
          No members found
        </p>
      )}
    </div>
  );
}
