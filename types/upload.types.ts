// ─── Enums ────────────────────────────────────────────────────────────────────

export type UploadContext = "ai_query" | "lesson" | "profile_avatar" | "group" | "general";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface UploadedFile {
  id: string;
  user_id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size_bytes: number;
  storage_url: string | null;
  context: UploadContext;
  created_at: string;
}

export interface UploadProgress {
  file: File;
  progress: number; // 0–100
  status: "pending" | "uploading" | "done" | "error";
  uploadId?: string;
  error?: string;
}

export interface UploadResponse {
  uploads: UploadedFile[];
}
