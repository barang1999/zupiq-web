import React from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "tertiary"
  | "success"
  | "warning"
  | "danger"
  | "math"
  | "physics"
  | "chemistry";

type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-container-highest text-on-surface-variant border border-outline-variant/50",
  primary: "bg-primary/10 text-primary border border-primary/20",
  secondary: "bg-secondary/10 text-secondary border border-secondary/20",
  tertiary: "bg-tertiary/10 text-tertiary border border-tertiary/20",
  success: "bg-green-500/10 text-green-400 border border-green-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  danger: "bg-red-500/10 text-red-400 border border-red-500/20",
  math: "bg-primary/10 text-primary border border-primary/20",
  physics: "bg-secondary/10 text-secondary border border-secondary/20",
  chemistry: "bg-tertiary/10 text-tertiary border border-tertiary/20",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs rounded-md",
  md: "px-3 py-1 text-sm rounded-lg",
};

export function Badge({
  children,
  variant = "default",
  size = "sm",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center font-medium",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

interface SubjectBadgeProps {
  subject: string;
  size?: BadgeSize;
}

export function SubjectBadge({ subject, size = "sm" }: SubjectBadgeProps) {
  const variant = (
    subject.toLowerCase().includes("math")
      ? "math"
      : subject.toLowerCase().includes("physics")
      ? "physics"
      : subject.toLowerCase().includes("chem")
      ? "chemistry"
      : "default"
  ) as BadgeVariant;

  return <Badge variant={variant} size={size}>{subject}</Badge>;
}

interface DifficultyBadgeProps {
  difficulty: "beginner" | "intermediate" | "advanced" | "expert" | "easy" | "medium" | "hard";
  size?: BadgeSize;
}

export function DifficultyBadge({ difficulty, size = "sm" }: DifficultyBadgeProps) {
  const variantMap: Record<string, BadgeVariant> = {
    beginner: "success",
    easy: "success",
    intermediate: "warning",
    medium: "warning",
    advanced: "danger",
    hard: "danger",
    expert: "secondary",
  };

  return (
    <Badge variant={variantMap[difficulty] ?? "default"} size={size}>
      {difficulty}
    </Badge>
  );
}
