import { LucideIcon } from "lucide-react";
import { cn } from "@/src/lib/utils";

interface NeuralNodeProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tag: string;
  tagColor?: "primary" | "secondary" | "tertiary";
  className?: string;
}

export function NeuralNode({ icon: Icon, title, subtitle, tag, tagColor = "primary", className }: NeuralNodeProps) {
  const tagColors = {
    primary: "bg-primary-container/20 text-primary-fixed",
    secondary: "bg-secondary-container/20 text-secondary",
    tertiary: "bg-tertiary-container/20 text-tertiary-fixed",
  };

  const iconColors = {
    primary: "text-primary-fixed",
    secondary: "text-secondary",
    tertiary: "text-tertiary-fixed",
  };

  return (
    <div className={cn("relative group w-full flex flex-col items-center", className)}>
      <div className="glass-panel w-full p-6 rounded-xl border border-outline-variant/10 relative overflow-hidden">
        {/* Glow Corner */}
        <div className="absolute top-0 right-0 w-10 h-10 bg-[radial-gradient(circle_at_top_right,rgba(243,255,202,0.15),transparent_70%)] pointer-events-none" />
        
        <div className="flex justify-between items-start mb-4">
          <Icon className={cn("w-6 h-6", iconColors[tagColor])} />
          <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", tagColors[tagColor])}>
            {tag}
          </div>
        </div>
        <h3 className="text-lg font-headline font-bold mb-1">{title}</h3>
        <p className="text-sm text-on-surface-variant leading-relaxed italic">{subtitle}</p>
      </div>
    </div>
  );
}
