import { Brain, ChevronUp, Send } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

export function InsightPanel() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <section className="fixed bottom-24 inset-x-4 z-40">
      <motion.div 
        initial={false}
        animate={{ height: isExpanded ? "auto" : "80px" }}
        className="glass-panel rounded-[2rem] border border-outline-variant/20 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Insight Header */}
        <div className="p-6 pb-4 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container shadow-[0_0_15px_rgba(0,244,254,0.4)] flex items-center justify-center">
              <Brain className="w-5 h-5 text-on-primary-container fill-current" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none">Neural Insights</p>
              <h4 className="font-headline font-bold text-lg">Visual Logic</h4>
            </div>
          </div>
          <button className="text-on-surface-variant">
            <ChevronUp className={`w-6 h-6 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Insight Content Area */}
        <motion.div 
          animate={{ opacity: isExpanded ? 1 : 0 }}
          className="px-6 pb-6 space-y-4"
        >
          <div className="bg-surface-container-highest/50 rounded-2xl p-4">
            <p className="text-sm leading-relaxed text-on-surface">
              Think of the <span className="text-primary-fixed font-medium">Power Rule</span> as a lever. For every unit you move the base, the exponent dictates the steepness of the descent. In the context of <span className="text-secondary font-medium">Optimization</span>, it's the fundamental gear that drives the entire engine.
            </p>
          </div>
          {/* AI Composer / Chat Input */}
          <div className="relative">
            <input 
              className="w-full bg-transparent border-0 border-b-2 border-surface-container-high focus:ring-0 focus:border-primary-fixed py-3 px-1 text-sm placeholder:text-on-surface-variant transition-all outline-none" 
              placeholder="Ask for a simpler breakdown..." 
              type="text"
            />
            <button className="absolute right-0 bottom-3 text-primary-fixed hover:scale-110 transition-transform">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
