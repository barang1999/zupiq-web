import { api } from "./api";
import type { VisualTableData } from "../components/ui/VisualTable";

// ─── Types ────────────────────────────────────────────────────────────────────

export type KnowledgeContentType =
  | "insight"
  | "visual_table"
  | "conversation_message"
  | "node_breakdown";

export interface KnowledgeRecord {
  id: string;
  user_id: string;
  title: string;
  content_type: KnowledgeContentType;
  subject: string | null;
  node_label: string | null;
  content: Record<string, unknown>;
  summary: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface SaveKnowledgePayload {
  title: string;
  content_type: KnowledgeContentType;
  subject?: string | null;
  node_label?: string | null;
  content: Record<string, unknown>;
  summary?: string | null;
  tags?: string[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export function saveKnowledgeRecord(
  payload: SaveKnowledgePayload
): Promise<{ record: KnowledgeRecord }> {
  return api.post<{ record: KnowledgeRecord }>("/api/knowledge", payload);
}

export function listKnowledgeRecords(options?: {
  subject?: string;
  limit?: number;
  offset?: number;
}): Promise<{ records: KnowledgeRecord[]; total: number }> {
  const params = new URLSearchParams();
  if (options?.subject) params.set("subject", options.subject);
  if (options?.limit   != null) params.set("limit",  String(options.limit));
  if (options?.offset  != null) params.set("offset", String(options.offset));
  const qs = params.toString();
  return api.get<{ records: KnowledgeRecord[]; total: number }>(
    `/api/knowledge${qs ? `?${qs}` : ""}`
  );
}

export function deleteKnowledgeRecord(id: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/api/knowledge/${id}`);
}

// ─── Typed save shortcuts ─────────────────────────────────────────────────────

/** Save a node's AI-generated insight (simple breakdown + key formula). */
export function saveInsight(opts: {
  nodeLabel: string;
  subject: string;
  simpleBreakdown: string;
  keyFormula: string;
}) {
  return saveKnowledgeRecord({
    title: opts.nodeLabel,
    content_type: "insight",
    subject: opts.subject,
    node_label: opts.nodeLabel,
    content: { simpleBreakdown: opts.simpleBreakdown, keyFormula: opts.keyFormula },
    summary: opts.simpleBreakdown.slice(0, 300),
    tags: [opts.subject],
  });
}

/** Save a rendered VisualTable (sign-analysis or generic). */
export function saveVisualTable(opts: {
  title: string;
  subject: string;
  nodeLabel?: string | null;
  table: VisualTableData;
}) {
  const tableType = opts.table.type === "sign_analysis" ? "Sign Table" : "Data Table";
  return saveKnowledgeRecord({
    title: `${tableType}: ${opts.title}`,
    content_type: "visual_table",
    subject: opts.subject,
    node_label: opts.nodeLabel ?? null,
    content: opts.table as unknown as Record<string, unknown>,
    summary: opts.table.type === "sign_analysis"
      ? `Sign analysis for ${opts.table.parameterName} with columns: ${opts.table.columns.join(", ")}`
      : `Table with headers: ${opts.table.headers?.join(", ") ?? ""}`,
    tags: [opts.subject, opts.table.type],
  });
}

/** Save a deep-dive conversation exchange (Q&A pair). */
export function saveConversationMessage(opts: {
  question: string;
  answer: string;
  subject: string;
  nodeLabel: string;
}) {
  return saveKnowledgeRecord({
    title: opts.question.slice(0, 120),
    content_type: "conversation_message",
    subject: opts.subject,
    node_label: opts.nodeLabel,
    content: { question: opts.question, answer: opts.answer },
    summary: `Q: ${opts.question.slice(0, 120)} — A: ${opts.answer.slice(0, 180)}`,
    tags: [opts.subject],
  });
}

/** Save a node's full breakdown (label + description + mathContent). */
export function saveNodeBreakdown(opts: {
  label: string;
  description: string;
  mathContent?: string;
  subject: string;
}) {
  return saveKnowledgeRecord({
    title: opts.label,
    content_type: "node_breakdown",
    subject: opts.subject,
    node_label: opts.label,
    content: {
      label: opts.label,
      description: opts.description,
      mathContent: opts.mathContent ?? null,
    },
    summary: opts.description.slice(0, 300),
    tags: [opts.subject],
  });
}
