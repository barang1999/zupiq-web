import React, { useRef } from "react";
import { Paperclip, X, FileText, Image, Loader2 } from "lucide-react";
import type { UploadedFile, UploadProgress } from "../../types/upload.types";
import { formatFileSize } from "../../utils/formatters";
import { validateFile } from "../../utils/validators";

interface FileAttachmentProps {
  progress: UploadProgress[];
  uploads: UploadedFile[];
  onFilesSelected: (files: File[]) => void;
  onRemoveUpload: (uploadId: string) => void;
  isUploading: boolean;
  disabled?: boolean;
}

export function FileAttachment({
  progress,
  uploads,
  onFilesSelected,
  onRemoveUpload,
  isUploading,
  disabled = false,
}: FileAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => {
      const err = validateFile(f);
      if (err) console.warn(`File ${f.name}: ${err}`);
      return !err;
    });
    if (valid.length > 0) {
      onFilesSelected(valid);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Upload button */}
      <button
        type="button"
        disabled={disabled || isUploading}
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors p-2 rounded-lg hover:bg-surface-container text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title="Attach file"
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Paperclip className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Attach</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf,text/plain"
        multiple
        onChange={handleFileSelect}
      />

      {/* Upload progress */}
      {progress.length > 0 && (
        <div className="flex flex-col gap-1">
          {progress.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {getFileIcon(p.file.type)}
              <span className="truncate max-w-[120px] text-on-surface-variant">
                {p.file.name}
              </span>
              {p.status === "uploading" && (
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
              )}
              {p.status === "done" && (
                <span className="text-green-400">Done</span>
              )}
              {p.status === "error" && (
                <span className="text-red-400">Error</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed uploads as chips */}
      {uploads.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center gap-1.5 bg-surface-container border border-white/10 rounded-lg px-2 py-1 text-xs"
            >
              {getFileIcon(upload.mime_type)}
              <span className="truncate max-w-[100px] text-on-surface-variant">
                {upload.original_name}
              </span>
              <span className="text-on-surface-variant/50">
                {formatFileSize(upload.size_bytes)}
              </span>
              <button
                onClick={() => onRemoveUpload(upload.id)}
                className="text-on-surface-variant hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
