import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "fit";
  showCloseButton?: boolean;
  containerClassName?: string;
}

const maxWidthClasses: Record<string, string> = {
  sm:  "w-full max-w-sm",
  md:  "w-full max-w-md",
  lg:  "w-full max-w-lg",
  xl:  "w-full max-w-xl",
  fit: "w-full max-w-[calc(100vw-2rem)]",
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "md",
  showCloseButton = true,
  containerClassName,
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={[
              "bg-surface-container-highest/95 backdrop-blur-xl",
              "border border-white/5 rounded-3xl p-6 relative overflow-hidden",
              maxWidthClasses[maxWidth],
              containerClassName ?? "",
            ].join(" ")}
          >
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between mb-6">
                <div>
                  {title && (
                    <h2 className="font-headline text-2xl font-bold text-on-surface">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="ml-4 text-on-surface-variant hover:text-on-surface transition-colors p-1 flex-shrink-0"
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className = "" }: ModalFooterProps) {
  return (
    <div className={`flex justify-end gap-3 mt-6 pt-4 border-t border-white/5 ${className}`}>
      {children}
    </div>
  );
}
