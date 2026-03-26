import React from "react";
import { Users, Lock, Globe, BookOpen } from "lucide-react";
import { motion } from "motion/react";
import type { Group } from "../../types/group.types";
import { Card } from "../ui/Card";
import { Badge, SubjectBadge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatNumber, formatRelativeTime } from "../../utils/formatters";

interface GroupCardProps {
  group: Group;
  onJoin?: (group: Group) => void;
  onView?: (group: Group) => void;
  isMember?: boolean;
}

export function GroupCard({ group, onJoin, onView, isMember = false }: GroupCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <Card variant="glass" className="relative overflow-hidden">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-on-surface">{group.name}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                {group.is_public ? (
                  <Globe className="w-3 h-3 text-green-400" />
                ) : (
                  <Lock className="w-3 h-3 text-yellow-400" />
                )}
                <span className="text-xs text-on-surface-variant">
                  {group.is_public ? "Public" : "Private"}
                </span>
              </div>
            </div>
          </div>
          {isMember && (
            <Badge variant="success" size="sm">Member</Badge>
          )}
        </div>

        {group.description && (
          <p className="text-sm text-on-surface-variant mb-3 line-clamp-2">
            {group.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {formatNumber(group.member_count ?? 0)} members
            </span>
            {group.subject && <SubjectBadge subject={group.subject} />}
          </div>

          <div className="flex gap-2">
            {onView && (
              <Button variant="ghost" size="sm" onClick={() => onView(group)}>
                View
              </Button>
            )}
            {!isMember && onJoin && (
              <Button variant="primary" size="sm" onClick={() => onJoin(group)}>
                Join
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
