import React from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { useAppStore } from "../../store/app.store";

interface PageLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  className?: string;
}

export function PageLayout({
  children,
  showSidebar,
  className = "",
}: PageLayoutProps) {
  const { isAuthenticated } = useAuth();
  const { isSidebarOpen } = useAppStore();

  // Auto-show sidebar for authenticated users unless explicitly disabled
  const shouldShowSidebar = showSidebar ?? isAuthenticated;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Background blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-container/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-container/5 blur-[120px] rounded-full pointer-events-none" />

      <Navbar />

      <div className="flex pt-20">
        {shouldShowSidebar && <Sidebar />}

        <main
          className={[
            "flex-1 transition-all duration-300",
            shouldShowSidebar
              ? isSidebarOpen
                ? "md:ml-64"
                : "md:ml-16"
              : "",
            "min-h-[calc(100vh-5rem)]",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export function PageContainer({
  children,
  title,
  subtitle,
  action,
  className = "",
  maxWidth = "xl",
}: PageContainerProps) {
  return (
    <div className={`${maxWidthClasses[maxWidth]} mx-auto px-6 py-8 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-8">
          <div>
            {title && (
              <h1 className="font-headline text-3xl font-bold text-on-surface">{title}</h1>
            )}
            {subtitle && (
              <p className="text-on-surface-variant mt-1">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
