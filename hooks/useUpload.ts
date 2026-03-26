import { useState, useCallback } from "react";
import { api, tokenStorage } from "../lib/api";
import type { UploadedFile, UploadProgress, UploadContext } from "../types/upload.types";

interface UseUploadReturn {
  uploads: UploadedFile[];
  progress: UploadProgress[];
  isUploading: boolean;
  error: string | null;
  uploadFiles: (files: File[], context?: UploadContext) => Promise<UploadedFile[]>;
  fetchUploads: (context?: UploadContext) => Promise<void>;
  deleteUpload: (uploadId: string) => Promise<void>;
  clearProgress: () => void;
}

export function useUpload(): UseUploadReturn {
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: File[], context: UploadContext = "general"): Promise<UploadedFile[]> => {
      setIsUploading(true);
      setError(null);

      // Initialize progress tracking
      const initialProgress: UploadProgress[] = files.map((file) => ({
        file,
        progress: 0,
        status: "pending",
      }));
      setProgress(initialProgress);

      const uploadedFiles: UploadedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        setProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "uploading", progress: 10 } : p))
        );

        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("context", context);

          const data = await api.upload<{ uploads: UploadedFile[] }>("/api/uploads", formData);

          if (data.uploads[0]) {
            uploadedFiles.push(data.uploads[0]);
            setUploads((prev) => [...prev, data.uploads[0]]);
          }

          setProgress((prev) =>
            prev.map((p, idx) =>
              idx === i
                ? { ...p, status: "done", progress: 100, uploadId: data.uploads[0]?.id }
                : p
            )
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Upload failed";
          setProgress((prev) =>
            prev.map((p, idx) =>
              idx === i ? { ...p, status: "error", error: message } : p
            )
          );
          setError(message);
        }
      }

      setIsUploading(false);
      return uploadedFiles;
    },
    []
  );

  const fetchUploads = useCallback(async (context?: UploadContext) => {
    setIsUploading(false);
    try {
      const url = context ? `/api/uploads?context=${context}` : "/api/uploads";
      const data = await api.get<{ uploads: UploadedFile[] }>(url);
      setUploads(data.uploads);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch uploads");
    }
  }, []);

  const deleteUpload = useCallback(async (uploadId: string) => {
    try {
      await api.delete(`/api/uploads/${uploadId}`);
      setUploads((prev) => prev.filter((u) => u.id !== uploadId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete upload");
      throw err;
    }
  }, []);

  const clearProgress = useCallback(() => {
    setProgress([]);
  }, []);

  return {
    uploads,
    progress,
    isUploading,
    error,
    uploadFiles,
    fetchUploads,
    deleteUpload,
    clearProgress,
  };
}
