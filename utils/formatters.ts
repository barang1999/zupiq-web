// ─── ID generation (frontend) ─────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export function formatDate(dateStr: string, locale = "en-US"): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateStr: string, locale = "en-US"): string {
  const date = new Date(dateStr);
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(dateStr);
}

// ─── Text utilities ───────────────────────────────────────────────────────────

export function truncateText(text: string, maxLength: number, suffix = "..."): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map(capitalizeFirst)
    .join(" ");
}

// ─── Number formatting ────────────────────────────────────────────────────────

export function formatScore(score: number, maxScore = 100): string {
  const percentage = Math.round((score / maxScore) * 100);
  return `${percentage}%`;
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toString();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Education level labels ───────────────────────────────────────────────────

export function formatEducationLevel(level: string): string {
  const labels: Record<string, string> = {
    elementary: "Elementary School",
    middle_school: "Middle School",
    high_school: "High School",
    undergraduate: "Undergraduate",
    graduate: "Graduate",
    professional: "Professional",
  };
  return labels[level] ?? capitalizeFirst(level.replace(/_/g, " "));
}
