import React from "react";

type CardVariant = "default" | "glass" | "elevated" | "outline";

interface CardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-surface-container rounded-3xl",
  glass: "bg-surface-container-highest/40 backdrop-blur-xl border border-white/5 rounded-3xl",
  elevated: "bg-surface-container-high shadow-xl rounded-3xl",
  outline: "border border-outline-variant rounded-3xl",
};

export function Card({
  variant = "default",
  className = "",
  children,
  onClick,
  hoverable = false,
}: CardProps) {
  return (
    <div
      className={[
        variantClasses[variant],
        hoverable ? "cursor-pointer hover:scale-[1.02] transition-transform" : "",
        onClick ? "cursor-pointer" : "",
        "p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, action, icon, className = "" }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-headline font-bold text-on-surface text-lg">{title}</h3>
          {subtitle && <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
