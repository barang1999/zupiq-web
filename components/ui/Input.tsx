import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-on-surface-variant mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={[
            "w-full bg-surface-container-highest border rounded-xl py-3 px-4",
            "text-on-surface placeholder:text-on-surface-variant/50",
            "focus:outline-none focus:ring-2 transition-all",
            leftIcon ? "pl-12" : "",
            rightIcon ? "pr-12" : "",
            error
              ? "border-red-500/50 focus:ring-red-500/30"
              : "border-white/5 focus:ring-primary/30 focus:border-primary/50",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-on-surface-variant">{hint}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  fullWidth?: boolean;
}

export function Textarea({
  label,
  error,
  hint,
  fullWidth = true,
  className = "",
  id,
  ...props
}: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-on-surface-variant mb-1.5"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={[
          "w-full bg-surface-container-highest border rounded-xl py-3 px-4",
          "text-on-surface placeholder:text-on-surface-variant/50",
          "focus:outline-none focus:ring-2 transition-all resize-none",
          error
            ? "border-red-500/50 focus:ring-red-500/30"
            : "border-white/5 focus:ring-primary/30 focus:border-primary/50",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-on-surface-variant">{hint}</p>
      )}
    </div>
  );
}
