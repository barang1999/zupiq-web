import React from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "from-primary to-secondary",
    "from-secondary to-tertiary",
    "from-tertiary to-primary",
    "from-blue-400 to-purple-500",
    "from-green-400 to-cyan-500",
    "from-orange-400 to-pink-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ src, name = "User", size = "md", className = "" }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${sizeClass} ${className}`}
        onError={(e) => {
          // Fallback to initials if image fails
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  const initials = getInitials(name);
  const gradientColors = getAvatarColor(name);

  return (
    <div
      className={[
        "rounded-full flex-shrink-0 flex items-center justify-center",
        `bg-gradient-to-br ${gradientColors}`,
        "text-on-primary font-bold",
        sizeClass,
        className,
      ].join(" ")}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

interface AvatarGroupProps {
  users: Array<{ name?: string; avatar_url?: string | null }>;
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ users, max = 4, size = "sm" }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((user, i) => (
        <Avatar
          key={i}
          src={user.avatar_url}
          name={user.name ?? "User"}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {overflow > 0 && (
        <div
          className={[
            "rounded-full flex items-center justify-center bg-surface-container-highest",
            "text-on-surface-variant text-xs font-medium ring-2 ring-background",
            sizeClasses[size],
          ].join(" ")}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
