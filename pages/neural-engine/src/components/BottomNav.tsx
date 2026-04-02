import { Network, Brain, Library, TrendingUp } from "lucide-react";
import { cn } from "@/src/lib/utils";

const navItems = [
  { icon: Network, label: "Map", active: true },
  { icon: Brain, label: "Insights" },
  { icon: Library, label: "Library" },
  { icon: TrendingUp, label: "Growth" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 bg-slate-900/60 backdrop-blur-2xl flex justify-around items-center px-4 pb-6 pt-3 rounded-t-[32px] shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
      {navItems.map((item) => (
        <a
          key={item.label}
          href="#"
          className={cn(
            "flex flex-col items-center justify-center transition-all duration-300 ease-out active:scale-90",
            item.active 
              ? "bg-slate-800/80 text-primary-fixed rounded-full px-5 py-2" 
              : "text-slate-500 p-2 hover:text-secondary"
          )}
        >
          <item.icon className="w-5 h-5" />
          <span className="font-body text-[10px] uppercase tracking-widest mt-1 font-medium">
            {item.label}
          </span>
        </a>
      ))}
    </nav>
  );
}
