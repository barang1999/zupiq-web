import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, HelpCircle, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AppSidebarNavItem {
  id: string;
  label: string;
  Icon: LucideIcon;
  active?: boolean;
  onClick?: () => void;
}

interface AppSidebarAction {
  label: string;
  onClick: () => void;
}

interface Props {
  brandTitle: string;
  brandSubtitle: string;
  brandIcon: LucideIcon;
  navItems: AppSidebarNavItem[];
  onSignOut: () => void;
  primaryAction?: AppSidebarAction;
  collapsible?: boolean;
  defaultPinned?: boolean;
  expandedWidth?: number;
  collapsedWidth?: number;
  onExpandedChange?: (isExpanded: boolean) => void;
}

export function AppSidebar({
  brandTitle,
  brandSubtitle,
  brandIcon: BrandIcon,
  navItems,
  onSignOut,
  primaryAction,
  collapsible = true,
  defaultPinned = false,
  expandedWidth = 256,
  collapsedWidth = 64,
  onExpandedChange,
}: Props) {
  const [pinned, setPinned] = useState(defaultPinned);
  const [hovered, setHovered] = useState(false);
  const isExpanded = collapsible ? (pinned || hovered) : true;
  const width = isExpanded ? expandedWidth : collapsedWidth;

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  return (
    <>
      <motion.aside
        animate={{ width }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        onMouseEnter={() => {
          if (collapsible) setHovered(true);
        }}
        onMouseLeave={() => {
          if (collapsible) setHovered(false);
        }}
        className="fixed left-0 h-full z-40 bg-surface-container-low hidden sm:flex flex-col pt-20 pb-6 text-sm font-medium overflow-hidden"
        style={{ width }}
      >
        <div className={`mb-8 overflow-hidden transition-all duration-200 ${isExpanded ? "px-6" : "px-0 flex justify-center"}`}>
          {isExpanded ? (
            <div>
              <h2 className="font-headline font-bold text-lg text-secondary leading-tight whitespace-nowrap">{brandTitle}</h2>
              <p className="text-on-surface-variant text-xs uppercase tracking-widest opacity-70 mt-1 whitespace-nowrap">{brandSubtitle}</p>
            </div>
          ) : (
            <BrandIcon className="w-5 h-5 text-secondary" />
          )}
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {navItems.map(({ id, label, Icon, active, onClick }) => (
            <button
              key={id}
              onClick={onClick}
              title={!isExpanded ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 transition-all duration-200 text-left ${
                active
                  ? isExpanded
                    ? "rounded-r-full bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary"
                    : "rounded-xl bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-xl"
              } ${!isExpanded ? "justify-center" : ""}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {isExpanded && <span className="overflow-hidden whitespace-nowrap">{label}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-4 px-2">
          {isExpanded && primaryAction ? (
            <button
              onClick={primaryAction.onClick}
              className="w-full py-3 px-4 rounded-xl bg-surface-container-highest border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest hover:bg-primary/10 transition-all whitespace-nowrap overflow-hidden"
            >
              {primaryAction.label}
            </button>
          ) : null}

          <div className={`pt-4 border-t border-outline-variant/20 flex flex-col gap-2 ${!isExpanded ? "items-center" : ""}`}>
            <a
              href="#"
              title={!isExpanded ? "Support" : undefined}
              className={`flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors ${!isExpanded ? "justify-center p-2 rounded-xl hover:bg-surface-container" : "px-1"}`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              {isExpanded && <span className="text-xs overflow-hidden whitespace-nowrap">Support</span>}
            </a>
            <button
              onClick={onSignOut}
              title={!isExpanded ? "Log Out" : undefined}
              className={`flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors ${!isExpanded ? "justify-center p-2 rounded-xl hover:bg-surface-container" : "px-1"}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {isExpanded && <span className="text-xs overflow-hidden whitespace-nowrap">Log Out</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      {collapsible ? (
        <motion.button
          animate={{ left: isExpanded ? expandedWidth - 12 : collapsedWidth - 12 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          onClick={() => setPinned((prev) => !prev)}
          title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
          className="fixed top-[72px] z-50 w-6 h-6 rounded-full bg-surface-container-highest border border-outline-variant/40 hidden sm:flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shadow-md"
        >
          <motion.div animate={{ rotate: pinned ? 0 : 180 }} transition={{ duration: 0.25 }}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.div>
        </motion.button>
      ) : null}
    </>
  );
}
