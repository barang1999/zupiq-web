import { useId } from "react";
import { Sparkles } from "lucide-react";

interface GrowingTreeAnimationProps {
  className?: string;
  showAccent?: boolean;
}

export function GrowingTreeAnimation({
  className = "",
  showAccent = true,
}: GrowingTreeAnimationProps) {
  const gradientId = `baseGlow-${useId().replace(/:/g, "")}`;

  return (
    <div
      className={[
        "relative w-full max-w-lg aspect-square flex items-center justify-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        className="w-full h-full drop-shadow-[0_0_30px_rgba(0,245,255,0.2)]"
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <style>{`
          @keyframes draw-line {
            from { stroke-dashoffset: 1; opacity: 1; }
            to { stroke-dashoffset: 0; opacity: 1; }
          }
          .neural-link {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            opacity: 0;
            animation-name: draw-line;
            animation-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
            animation-fill-mode: forwards;
            stroke-linecap: round;
            stroke-linejoin: round;
            fill: none;
            stroke-width: 2;
          }
          .neural-node {
            opacity: 0.95;
          }
        `}</style>
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="100%" r="50%">
            <stop offset="0%" stopColor="#00F5FF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00F5FF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="100" y="250" width="200" height="150" fill={`url(#${gradientId})`} />
        <g stroke="#00F5FF">
          <path pathLength={1} className="neural-link" d="M200 380 L200 300" style={{ animationDelay: "0.4s", animationDuration: "1.3s", strokeWidth: 3 }} />
          <path pathLength={1} className="neural-link" d="M200 300 L140 240" style={{ animationDelay: "1.9s", animationDuration: "1.2s" }} />
          <path pathLength={1} className="neural-link" d="M200 300 L260 240" style={{ animationDelay: "1.9s", animationDuration: "1.2s" }} />
          <path pathLength={1} className="neural-link" d="M140 240 L80 200" style={{ animationDelay: "3.35s", animationDuration: "1.1s", strokeWidth: 1.5 }} />
          <path pathLength={1} className="neural-link" d="M140 240 L160 160" style={{ animationDelay: "3.35s", animationDuration: "1.1s", strokeWidth: 1.5 }} />
          <path pathLength={1} className="neural-link" d="M260 240 L320 200" style={{ animationDelay: "3.35s", animationDuration: "1.1s", strokeWidth: 1.5 }} />
          <path pathLength={1} className="neural-link" d="M260 240 L240 160" style={{ animationDelay: "3.35s", animationDuration: "1.1s", strokeWidth: 1.5 }} />
          <path pathLength={1} className="neural-link" d="M160 160 L120 100" style={{ animationDelay: "4.75s", animationDuration: "1s", strokeWidth: 1 }} />
          <path pathLength={1} className="neural-link" d="M160 160 L200 80" style={{ animationDelay: "4.75s", animationDuration: "1s", strokeWidth: 1 }} />
          <path pathLength={1} className="neural-link" d="M240 160 L280 100" style={{ animationDelay: "4.75s", animationDuration: "1s", strokeWidth: 1 }} />
          <path pathLength={1} className="neural-link" d="M240 160 L220 60" style={{ animationDelay: "4.75s", animationDuration: "1s", strokeWidth: 1 }} />
          <path pathLength={1} className="neural-link" d="M80 200 L52 154" style={{ animationDelay: "4.75s", animationDuration: "1s", strokeWidth: 0.9 }} />
          <path pathLength={1} className="neural-link" d="M80 200 L92 142" style={{ animationDelay: "4.75s", animationDuration: "1s", strokeWidth: 0.9 }} />
          <path pathLength={1} className="neural-link" d="M320 200 L348 154" style={{ animationDelay: "4.75s", animationDuration: "1s", strokeWidth: 0.9 }} />
          <path pathLength={1} className="neural-link" d="M320 200 L308 142" style={{ animationDelay: "4.75s", animationDuration: "1s", strokeWidth: 0.9 }} />
          <path pathLength={1} className="neural-link" d="M120 100 L92 66" style={{ animationDelay: "6.05s", animationDuration: "0.95s", strokeWidth: 0.85 }} />
          <path pathLength={1} className="neural-link" d="M120 100 L142 58" style={{ animationDelay: "6.05s", animationDuration: "0.95s", strokeWidth: 0.85 }} />
          <path pathLength={1} className="neural-link" d="M280 100 L258 66" style={{ animationDelay: "6.05s", animationDuration: "0.95s", strokeWidth: 0.85 }} />
          <path pathLength={1} className="neural-link" d="M280 100 L308 58" style={{ animationDelay: "6.05s", animationDuration: "0.95s", strokeWidth: 0.85 }} />
          <path pathLength={1} className="neural-link" d="M200 80 L176 48" style={{ animationDelay: "6.05s", animationDuration: "0.95s", strokeWidth: 0.8 }} />
          <path pathLength={1} className="neural-link" d="M200 80 L226 44" style={{ animationDelay: "6.05s", animationDuration: "0.95s", strokeWidth: 0.8 }} />
          <path pathLength={1} className="neural-link" d="M220 60 L200 28" style={{ animationDelay: "6.05s", animationDuration: "0.95s", strokeWidth: 0.8 }} />
          <path pathLength={1} className="neural-link" d="M220 60 L246 34" style={{ animationDelay: "6.05s", animationDuration: "0.95s", strokeWidth: 0.8 }} />
        </g>
        <circle className="neural-node" cx="200" cy="300" r="6" fill="#00F5FF" style={{ filter: "drop-shadow(0 0 8px #00F5FF)" }} />
        <circle className="neural-node" cx="140" cy="240" r="4" fill="#ff51fa" />
        <circle className="neural-node" cx="260" cy="240" r="4" fill="#ff51fa" />
        <circle className="neural-node" cx="80" cy="200" r="3" fill="#6d758c" />
        <circle className="neural-node" cx="160" cy="160" r="4" fill="#00F5FF" />
        <circle className="neural-node" cx="320" cy="200" r="3" fill="#6d758c" />
        <circle className="neural-node" cx="240" cy="160" r="4" fill="#00F5FF" />
        <circle className="neural-node" cx="120" cy="100" r="3" fill="#ff51fa" />
        <circle className="neural-node" cx="200" cy="80" r="2" fill="#6d758c" />
        <circle className="neural-node" cx="280" cy="100" r="3" fill="#ff51fa" />
        <circle className="neural-node" cx="220" cy="60" r="2" fill="#6d758c" />
        <circle className="neural-node" cx="52" cy="154" r="2.5" fill="#6d758c" />
        <circle className="neural-node" cx="92" cy="142" r="2.5" fill="#00F5FF" />
        <circle className="neural-node" cx="348" cy="154" r="2.5" fill="#6d758c" />
        <circle className="neural-node" cx="308" cy="142" r="2.5" fill="#00F5FF" />
        <circle className="neural-node" cx="92" cy="66" r="2.2" fill="#ff51fa" />
        <circle className="neural-node" cx="142" cy="58" r="2.2" fill="#6d758c" />
        <circle className="neural-node" cx="258" cy="66" r="2.2" fill="#ff51fa" />
        <circle className="neural-node" cx="308" cy="58" r="2.2" fill="#6d758c" />
        <circle className="neural-node" cx="176" cy="48" r="2" fill="#00F5FF" />
        <circle className="neural-node" cx="226" cy="44" r="2" fill="#ff51fa" />
        <circle className="neural-node" cx="200" cy="28" r="2" fill="#6d758c" />
        <circle className="neural-node" cx="246" cy="34" r="2" fill="#00F5FF" />
      </svg>
      {showAccent && (
        <div className="absolute -bottom-6 left-1/4 w-12 h-12 bg-surface-variant/40 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center animate-bounce">
          <Sparkles className="text-primary w-5 h-5" />
        </div>
      )}
    </div>
  );
}
