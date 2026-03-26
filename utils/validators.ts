// ─── Email ────────────────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateEmail(email: string): string | null {
  if (!email) return "Email is required";
  if (!isValidEmail(email)) return "Please enter a valid email address";
  return null;
}

// ─── Password ─────────────────────────────────────────────────────────────────

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";
  color: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const capped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  const labels: PasswordStrength["label"][] = [
    "Very Weak",
    "Weak",
    "Fair",
    "Strong",
    "Very Strong",
  ];
  const colors = ["#ff4444", "#ff8c00", "#ffd700", "#90ee90", "#00c851"];

  return { score: capped, label: labels[capped], color: colors[capped] };
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}

// ─── Name ─────────────────────────────────────────────────────────────────────

export function validateFullName(name: string): string | null {
  if (!name || !name.trim()) return "Full name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  if (name.trim().length > 100) return "Name must be less than 100 characters";
  return null;
}

// ─── Generic form field ───────────────────────────────────────────────────────

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || !value.trim()) return `${fieldName} is required`;
  return null;
}

export function validateMinLength(
  value: string,
  min: number,
  fieldName: string
): string | null {
  if (value.trim().length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  return null;
}

export function validateMaxLength(
  value: string,
  max: number,
  fieldName: string
): string | null {
  if (value.trim().length > max) {
    return `${fieldName} must be less than ${max} characters`;
  }
  return null;
}

// ─── File validation ──────────────────────────────────────────────────────────

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "text/plain"];
export const ALLOWED_UPLOAD_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];
export const MAX_FILE_SIZE_MB = 10;

export function validateFile(file: File): string | null {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return `File type ${file.type} is not supported. Allowed: JPG, PNG, WebP, PDF, TXT`;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File must be smaller than ${MAX_FILE_SIZE_MB}MB`;
  }
  return null;
}

// ─── Invite code ──────────────────────────────────────────────────────────────

export function validateInviteCode(code: string): string | null {
  if (!code || !code.trim()) return "Invite code is required";
  if (!/^[A-Z0-9]{6,10}$/.test(code.trim().toUpperCase())) {
    return "Invalid invite code format";
  }
  return null;
}
