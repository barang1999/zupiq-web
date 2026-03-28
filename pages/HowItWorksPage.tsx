import { motion } from "motion/react";
import {
  ArrowRight,
  Check,
  GitBranch,
  Sparkles,
  Languages,
  Globe2,
  ShieldCheck,
  Users,
  BrainCircuit,
} from "lucide-react";
import { PublicHeader } from "../components/layout/PublicHeader";

interface Props {
  user: any;
  onAuthClick: () => void;
  onSignOut?: () => void;
  onNavigateHome: () => void;
  onNavigatePlan: () => void;
  onNavigateHowItWorks?: () => void;
}

export function HowItWorksPage({
  user,
  onAuthClick,
  onSignOut,
  onNavigateHome,
  onNavigatePlan,
  onNavigateHowItWorks,
}: Props) {
  return (
    <div className="min-h-screen bg-surface-dim text-on-surface overflow-x-hidden selection:bg-primary selection:text-on-primary">
      <div className="fixed top-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary-container/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-primary-container/10 blur-[100px] rounded-full pointer-events-none" />

      <PublicHeader
        user={user}
        onAuthClick={onAuthClick}
        onSignOut={onSignOut}
        onNavigateHome={onNavigateHome}
        onNavigatePlan={onNavigatePlan}
        onNavigateHowItWorks={onNavigateHowItWorks}
        activePage="how-it-works"
      />

      <main className="pt-28">
        <header className="relative pb-20 px-6 sm:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <span className="inline-block py-1 px-3 mb-6 rounded-full border border-primary/20 text-primary text-xs font-headline font-bold tracking-widest uppercase bg-primary/5">
                How It Works
              </span>
              <h1 className="text-5xl md:text-7xl font-headline font-black tracking-tighter leading-[0.9] mb-8">
                Complexity <br />
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Solved.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-on-surface-variant max-w-lg mb-10 leading-relaxed">
                Zupiq deconstructs dense academic problems into an intuitive tree-branch map
                so you see the structure before memorizing formulas.
              </p>

              <button
                onClick={user ? onNavigateHome : onAuthClick}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary font-headline font-bold uppercase tracking-widest flex items-center gap-2 hover:shadow-[0_0_30px_rgba(161,250,255,0.3)] transition-all"
              >
                {user ? "Go to Study Space" : "Experience it now"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="relative"
            >
              <div className="aspect-square bg-[rgba(25,37,64,0.6)] backdrop-blur-[20px] rounded-3xl relative p-8 flex items-center justify-center overflow-hidden border border-outline-variant/20">
                <svg className="w-full h-full" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur result="coloredBlur" stdDeviation="2.5" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <style>{`
                      @keyframes drawPath {
                        from { stroke-dashoffset: 1000; }
                        to { stroke-dashoffset: 0; }
                      }
                      @keyframes pulseGlow {
                        0%, 100% { opacity: 0.6; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.2); }
                      }
                      @keyframes float {
                        0%, 100% { transform: translateY(0) rotate(0deg); }
                        50% { transform: translateY(-10px) rotate(1deg); }
                      }
                      .branch {
                        stroke-dasharray: 1000;
                        stroke-dashoffset: 1000;
                        animation: drawPath 4s cubic-bezier(0.445, 0.05, 0.55, 0.95) forwards infinite;
                        filter: url(#glow);
                      }
                      .node {
                        animation: pulseGlow 3s ease-in-out infinite;
                        transform-origin: center;
                        filter: url(#glow);
                      }
                      .svg-group {
                        animation: float 8s ease-in-out infinite;
                        transform-origin: center;
                      }
                    `}</style>
                  </defs>
                  <g className="svg-group">
                    <circle className="node" cx="200" cy="200" fill="#00F5FF" r="8" />

                    <path className="branch" d="M200 200 L120 150 L60 170" fill="none" stroke="#00F5FF" strokeWidth="1.5" />
                    <path className="branch" d="M200 200 L280 150 L340 120" fill="none" stroke="#00F5FF" strokeWidth="1.5" />
                    <path className="branch" d="M200 200 L200 280 L140 340" fill="none" stroke="#00F5FF" strokeWidth="1.5" />

                    <path className="branch" d="M120 150 L100 80" fill="none" stroke="#ff51fa" strokeWidth="1" style={{ animationDelay: "1s" }} />
                    <path className="branch" d="M120 150 L50 120" fill="none" stroke="#ff51fa" strokeWidth="1" style={{ animationDelay: "1.5s" }} />
                    <path className="branch" d="M280 150 L300 220" fill="none" stroke="#ff51fa" strokeWidth="1" style={{ animationDelay: "0.5s" }} />
                    <path className="branch" d="M280 150 L350 180" fill="none" stroke="#ff51fa" strokeWidth="1" style={{ animationDelay: "2s" }} />
                    <path className="branch" d="M200 280 L260 330" fill="none" stroke="#ff51fa" strokeWidth="1" style={{ animationDelay: "1.2s" }} />

                    <circle className="node" cx="120" cy="150" fill="#00F5FF" r="4" style={{ animationDelay: "0.2s" }} />
                    <circle className="node" cx="280" cy="150" fill="#00F5FF" r="4" style={{ animationDelay: "0.4s" }} />
                    <circle className="node" cx="200" cy="280" fill="#00F5FF" r="4" style={{ animationDelay: "0.6s" }} />
                    <circle className="node" cx="60" cy="170" fill="#ff51fa" r="3" style={{ animationDelay: "0.8s" }} />
                    <circle className="node" cx="100" cy="80" fill="#ff51fa" r="3" style={{ animationDelay: "1.1s" }} />
                    <circle className="node" cx="340" cy="120" fill="#ff51fa" r="3" style={{ animationDelay: "1.4s" }} />
                    <circle className="node" cx="300" cy="220" fill="#ff51fa" r="3" style={{ animationDelay: "1.7s" }} />
                    <circle className="node" cx="140" cy="340" fill="#ff51fa" r="3" style={{ animationDelay: "2s" }} />
                  </g>
                </svg>
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dim via-transparent to-transparent" />
              </div>

              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-primary-container rounded-full blur-xl animate-pulse opacity-50" />
              <div className="absolute -bottom-8 -left-8 w-24 h-24 border border-primary/40 rounded-full flex items-center justify-center">
                <BrainCircuit className="w-9 h-9 text-primary" />
              </div>
            </motion.div>
          </div>
        </header>

        <section className="py-24 px-6 sm:px-8 bg-surface-container-low">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
              <h2 className="text-4xl md:text-5xl font-headline font-bold tracking-tight max-w-xl">
                The Three Pillars of <br />
                <span className="text-tertiary">Quantum Learning</span>
              </h2>
              <p className="text-on-surface-variant max-w-sm font-light">
                The system is optimized for durable understanding: break down, simplify, and
                anchor to local language context.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <article className="bg-surface-container-highest/60 backdrop-blur-xl p-10 rounded-3xl glow-corner border border-outline-variant/20 hover:translate-y-[-8px] transition-transform duration-500">
                <GitBranch className="w-12 h-12 text-primary-dim mb-8" />
                <h3 className="text-2xl font-headline font-bold mb-4">Deconstruction</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Every question is split into atomic steps and visualized as a branching map.
                </p>
              </article>

              <article className="bg-surface-container-highest/60 backdrop-blur-xl p-10 rounded-3xl glow-corner border border-outline-variant/20 hover:translate-y-[-8px] transition-transform duration-500">
                <Sparkles className="w-12 h-12 text-secondary mb-8" />
                <h3 className="text-2xl font-headline font-bold mb-4">Simplification</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Jargon becomes plain language so the why is clear before the computation.
                </p>
              </article>

              <article className="bg-surface-container-highest/60 backdrop-blur-xl p-10 rounded-3xl glow-corner border border-outline-variant/20 hover:translate-y-[-8px] transition-transform duration-500">
                <Languages className="w-12 h-12 text-tertiary mb-8" />
                <h3 className="text-2xl font-headline font-bold mb-4">Local Resonance</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Explanations adapt to your language and familiar cultural examples.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="py-24 sm:py-32 px-6 sm:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-surface-container rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 lg:p-20 relative overflow-hidden flex flex-col lg:flex-row items-center gap-16 border border-outline-variant/20">
              <div className="absolute top-0 right-0 w-full h-full bg-secondary-container/5 blur-[150px] pointer-events-none" />

              <div className="flex-1 space-y-8 relative z-10">
                <h2 className="text-4xl sm:text-5xl font-headline font-black tracking-tighter leading-none">
                  Mapping the <br />
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent italic">
                    Chemical Soul
                  </span>
                </h2>
                <p className="text-lg text-on-surface-variant max-w-md">
                  The algorithm detects the root concept and then expands connected ideas into a
                  persistent mental map.
                </p>
                <ul className="space-y-6">
                  <li className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider text-on-surface/80">
                      Dynamic Link Recognition
                    </span>
                  </li>
                  <li className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider text-on-surface/80">
                      Proactive Gap Analysis
                    </span>
                  </li>
                  <li className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-tertiary/20 flex items-center justify-center text-tertiary">
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm uppercase tracking-wider text-on-surface/80">
                      Contextual Synthesis
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex-1 w-full max-w-2xl">
                <div className="bg-surface-dim rounded-3xl p-4 border border-outline-variant/20 shadow-2xl relative group">
                  <svg className="w-full h-auto drop-shadow-2xl" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#a1faff" />
                        <stop offset="100%" stopColor="#ff51fa" />
                      </linearGradient>
                      <radialGradient id="sphereGradient">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="40%" stopColor="#a1faff" />
                        <stop offset="100%" stopColor="#ff51fa" />
                      </radialGradient>
                      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <style>{`
                        @keyframes pulseFlow {
                          0% { stroke-dashoffset: 1000; opacity: 0.3; }
                          50% { opacity: 1; }
                          100% { stroke-dashoffset: 0; opacity: 0.3; }
                        }
                        @keyframes floatAsynch {
                          0%, 100% { transform: translateY(0px) translateX(0px); }
                          33% { transform: translateY(-10px) translateX(5px); }
                          66% { transform: translateY(5px) translateX(-5px); }
                        }
                        .network-line {
                          stroke-dasharray: 200;
                          stroke-dashoffset: 1000;
                          animation: pulseFlow 6s linear infinite;
                          stroke: url(#lineGradient);
                          stroke-width: 1.5;
                          fill: none;
                          filter: url(#softGlow);
                        }
                        .floating-node {
                          animation: floatAsynch 8s ease-in-out infinite alternate;
                          filter: url(#softGlow);
                        }
                      `}</style>
                    </defs>

                    <g opacity="0.6">
                      <path className="network-line" d="M250 250 L100 100" style={{ animationDelay: "0s" }} />
                      <path className="network-line" d="M250 250 L400 80" style={{ animationDelay: "1s" }} />
                      <path className="network-line" d="M250 250 L420 350" style={{ animationDelay: "2s" }} />
                      <path className="network-line" d="M250 250 L120 400" style={{ animationDelay: "1.5s" }} />
                      <path className="network-line" d="M250 250 L50 280" style={{ animationDelay: "0.5s" }} />
                      <path className="network-line" d="M100 100 L60 40" />
                      <path className="network-line" d="M400 80 L460 60" />
                      <path className="network-line" d="M420 350 L480 400" />
                    </g>

                    <g className="floating-node" style={{ animationDuration: "7s" }}>
                      <circle cx="100" cy="100" fill="#a1faff" r="6" />
                    </g>
                    <g className="floating-node" style={{ animationDelay: "-2s", animationDuration: "9s" }}>
                      <circle cx="400" cy="80" fill="#ff51fa" r="8" />
                    </g>
                    <g className="floating-node" style={{ animationDelay: "-4s", animationDuration: "6s" }}>
                      <circle cx="420" cy="350" fill="#a1faff" r="7" />
                    </g>
                    <g className="floating-node" style={{ animationDelay: "-1s", animationDuration: "10s" }}>
                      <circle cx="120" cy="400" fill="#ff51fa" r="5" />
                    </g>
                    <g className="floating-node" style={{ animationDelay: "-5s" }}>
                      <circle cx="50" cy="280" fill="#a1faff" r="6" />
                    </g>

                    <g filter="url(#softGlow)">
                      <circle className="animate-pulse" cx="250" cy="250" r="35" fill="url(#sphereGradient)" />
                      <circle cx="250" cy="250" r="35" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                    </g>
                  </svg>

                  <div className="absolute top-10 right-10 bg-surface-container-highest/60 backdrop-blur-xl px-4 py-2 rounded-full border border-primary/30 text-[10px] font-bold tracking-widest uppercase">
                    Covalent Bond Analysis
                  </div>
                  <div className="absolute bottom-20 left-10 bg-surface-container-highest/60 backdrop-blur-xl px-4 py-2 rounded-full border border-tertiary/30 text-[10px] font-bold tracking-widest uppercase">
                    Electron Flow Visualization
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 sm:px-8 bg-surface-dim">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-headline font-bold text-center mb-20 tracking-tight">
              Smarter Learning, <span className="text-secondary italic">Quantified.</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-2 gap-6 h-auto md:h-[560px]">
              <article className="md:col-span-3 bg-surface-container-highest/60 backdrop-blur-xl rounded-3xl p-10 flex flex-col justify-between relative overflow-hidden border border-outline-variant/20">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
                <div>
                  <span className="text-primary text-5xl font-headline font-black mb-2 block">4.2x</span>
                  <h4 className="text-2xl font-headline font-bold mb-4">Learning Acceleration</h4>
                  <p className="text-on-surface-variant text-sm">
                    Students progress faster by mastering foundational branches first.
                  </p>
                </div>
                <div className="mt-8 flex gap-1 items-end">
                  <div className="w-2 h-8 bg-primary/20 rounded-full" />
                  <div className="w-2 h-12 bg-primary/40 rounded-full" />
                  <div className="w-2 h-20 bg-primary/60 rounded-full" />
                  <div className="w-2 h-32 bg-primary rounded-full" />
                </div>
              </article>

              <article className="md:col-span-3 bg-surface-container-highest/60 backdrop-blur-xl rounded-3xl p-10 flex flex-col justify-between relative overflow-hidden border border-outline-variant/20">
                <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-tertiary to-transparent" />
                <div>
                  <span className="text-tertiary text-5xl font-headline font-black mb-2 block">92%</span>
                  <h4 className="text-2xl font-headline font-bold mb-4">Memory Retention</h4>
                  <p className="text-on-surface-variant text-sm">
                    Spaced repetition is attached directly to each concept branch.
                  </p>
                </div>
                <div className="mt-8 flex justify-center">
                  <BrainCircuit className="w-20 h-20 text-tertiary/60" />
                </div>
              </article>

              <article className="md:col-span-2 bg-surface-container-highest/60 backdrop-blur-xl rounded-3xl p-8 flex flex-col justify-center items-center text-center border border-outline-variant/20">
                <Globe2 className="w-12 h-12 text-secondary mb-4" />
                <h5 className="font-headline font-bold uppercase tracking-widest text-xs mb-2">Global Access</h5>
                <p className="text-on-surface-variant text-xs">
                  Explanations tuned for 45+ languages and local context.
                </p>
              </article>

              <article className="md:col-span-2 bg-surface-container-highest/60 backdrop-blur-xl rounded-3xl p-8 flex flex-col justify-center items-center text-center border border-outline-variant/20">
                <ShieldCheck className="w-12 h-12 text-primary mb-4" />
                <h5 className="font-headline font-bold uppercase tracking-widest text-xs mb-2">Ethical AI</h5>
                <p className="text-on-surface-variant text-xs">
                  Designed for verifiable reasoning and transparent steps.
                </p>
              </article>

              <article className="md:col-span-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl p-8 flex flex-col justify-center items-center text-center border border-primary/20">
                <Users className="w-12 h-12 text-on-surface mb-4" />
                <h5 className="font-headline font-bold uppercase tracking-widest text-xs mb-2">1.2M Brains</h5>
                <p className="text-on-surface-variant text-xs">
                  Learners already using Zupiq for deep study workflows.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-low py-12 px-6 sm:px-8 border-t border-outline-variant/20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-7xl mx-auto">
          <button
            onClick={onNavigateHome}
            className="text-lg font-bold text-on-surface font-headline"
          >
            Zupiq
          </button>
          <div className="flex gap-8">
            <a className="text-on-surface-variant hover:text-primary transition-colors text-xs tracking-wide" href="#">
              AI Ethics
            </a>
            <a className="text-on-surface-variant hover:text-primary transition-colors text-xs tracking-wide" href="/privacy">
              Privacy Policy
            </a>
            <a className="text-on-surface-variant hover:text-primary transition-colors text-xs tracking-wide" href="#">
              Support
            </a>
          </div>
          <p className="text-xs tracking-wide text-on-surface-variant">
            © 2026 Zupiq Intelligence. Built for the Prismatic Era.
          </p>
        </div>
      </footer>
    </div>
  );
}
