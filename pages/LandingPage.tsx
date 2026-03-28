/**
 * LandingPage.tsx
 * The original App.tsx landing page content has been moved here.
 * The full landing page implementation (Navbar, Hero, Stats, Features, CTA, Footer)
 * lives in the root App.tsx which was preserved and now acts as the landing page
 * component when routed to "landing" state.
 *
 * This file is a thin wrapper that re-exports the landing page for use within
 * the new routing system.
 */

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, Layout, GraduationCap,
  Network, Share2, Rocket, Menu, X, User as UserIcon, LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Auth } from "../components/Auth";
import { useAppStore } from "../store/app.store";

// ─── Landing Page (standalone, no PageLayout wrapper — has own Navbar) ─────────

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState(false);
  const { navigateTo } = useAppStore();

  return (
    <div className="min-h-screen bg-background text-on-surface selection:bg-primary selection:text-on-primary">
      {/* Background Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-container/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-container/5 blur-[120px] rounded-full pointer-events-none" />

      <LandingNavbar onAuthClick={() => setShowAuth(true)} />

      <main>
        <HeroSection onAuthClick={() => setShowAuth(true)} />
        <StatsSection />
        <FeaturesSection />
        <CTASection onAuthClick={() => setShowAuth(true)} />
      </main>

      <LandingFooter />

      <AnimatePresence>
        {showAuth && <Auth onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function LandingNavbar({ onAuthClick }: { onAuthClick: () => void }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => { window.removeEventListener("scroll", handleScroll); subscription.unsubscribe(); };
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-background/80 backdrop-blur-xl py-4 shadow-2xl" : "bg-transparent py-6"}`}>
      <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
        <div className="text-2xl font-headline font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Zupiq</div>
        <div className="hidden md:flex gap-8 items-center font-headline font-medium">
          <a href="#" className="text-primary border-b-2 border-primary pb-1">Features</a>
          <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">How it Works</a>
          <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Pricing</a>
          <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Community</a>
        </div>
        <div className="hidden md:flex gap-4 items-center">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-on-surface-variant">
                <UserIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{user.user_metadata.full_name || user.email}</span>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="text-on-surface-variant hover:text-secondary transition-colors p-2" title="Sign Out">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <button onClick={onAuthClick} className="text-on-surface-variant hover:text-on-surface transition-colors px-4 py-2">Log In</button>
              <button onClick={onAuthClick} className="bg-gradient-to-r from-primary to-secondary text-on-primary font-bold px-6 py-2 rounded-full hover:opacity-90 transition-opacity">Get Started</button>
            </>
          )}
        </div>
        <button className="md:hidden text-on-surface" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ onAuthClick }: { onAuthClick: () => void }) {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-8 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
      <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="z-10">
        <h1 className="font-headline text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
          Quantum Learning for the <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-tertiary">Modern Mind.</span>
        </h1>
        <p className="text-lg lg:text-xl text-on-surface-variant max-w-xl mb-10 leading-relaxed">
          Zupiq refracts complex information into personalized learning paths. Experience prismatic intelligence that adapts to your unique neural signature.
        </p>
        <div className="flex flex-wrap gap-4">
          <button onClick={onAuthClick} className="btn-primary">Launch Your Journey</button>
          <button className="btn-glass">Watch Demo</button>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} className="relative flex justify-center items-center">
        <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
          <svg className="w-full h-full drop-shadow-[0_0_30px_rgba(0,245,255,0.2)]" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
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
              <radialGradient id="baseGlow" cx="50%" cy="100%" r="50%">
                <stop offset="0%" stopColor="#00F5FF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00F5FF" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect x="100" y="250" width="200" height="150" fill="url(#baseGlow)" />
            <g stroke="#00F5FF">
              <path pathLength={1} className="neural-link" d="M200 380 L200 300" style={{ animationDelay: "0.2s", animationDuration: "0.55s", strokeWidth: 3 }} />
              <path pathLength={1} className="neural-link" d="M200 300 L140 240" style={{ animationDelay: "0.85s", animationDuration: "0.6s" }} />
              <path pathLength={1} className="neural-link" d="M200 300 L260 240" style={{ animationDelay: "1.5s", animationDuration: "0.6s" }} />
              <path pathLength={1} className="neural-link" d="M140 240 L80 200" style={{ animationDelay: "2.15s", animationDuration: "0.55s", strokeWidth: 1.5 }} />
              <path pathLength={1} className="neural-link" d="M140 240 L160 160" style={{ animationDelay: "2.75s", animationDuration: "0.55s", strokeWidth: 1.5 }} />
              <path pathLength={1} className="neural-link" d="M260 240 L320 200" style={{ animationDelay: "3.35s", animationDuration: "0.55s", strokeWidth: 1.5 }} />
              <path pathLength={1} className="neural-link" d="M260 240 L240 160" style={{ animationDelay: "3.95s", animationDuration: "0.55s", strokeWidth: 1.5 }} />
              <path pathLength={1} className="neural-link" d="M160 160 L120 100" style={{ animationDelay: "4.55s", animationDuration: "0.5s", strokeWidth: 1 }} />
              <path pathLength={1} className="neural-link" d="M160 160 L200 80" style={{ animationDelay: "5.1s", animationDuration: "0.5s", strokeWidth: 1 }} />
              <path pathLength={1} className="neural-link" d="M240 160 L280 100" style={{ animationDelay: "5.65s", animationDuration: "0.5s", strokeWidth: 1 }} />
              <path pathLength={1} className="neural-link" d="M240 160 L220 60" style={{ animationDelay: "6.2s", animationDuration: "0.5s", strokeWidth: 1 }} />
              <path pathLength={1} className="neural-link" d="M80 200 L52 154" style={{ animationDelay: "6.75s", animationDuration: "0.45s", strokeWidth: 0.9 }} />
              <path pathLength={1} className="neural-link" d="M80 200 L92 142" style={{ animationDelay: "7.25s", animationDuration: "0.45s", strokeWidth: 0.9 }} />
              <path pathLength={1} className="neural-link" d="M320 200 L348 154" style={{ animationDelay: "7.75s", animationDuration: "0.45s", strokeWidth: 0.9 }} />
              <path pathLength={1} className="neural-link" d="M320 200 L308 142" style={{ animationDelay: "8.25s", animationDuration: "0.45s", strokeWidth: 0.9 }} />
              <path pathLength={1} className="neural-link" d="M120 100 L92 66" style={{ animationDelay: "8.75s", animationDuration: "0.42s", strokeWidth: 0.85 }} />
              <path pathLength={1} className="neural-link" d="M120 100 L142 58" style={{ animationDelay: "9.2s", animationDuration: "0.42s", strokeWidth: 0.85 }} />
              <path pathLength={1} className="neural-link" d="M280 100 L258 66" style={{ animationDelay: "9.65s", animationDuration: "0.42s", strokeWidth: 0.85 }} />
              <path pathLength={1} className="neural-link" d="M280 100 L308 58" style={{ animationDelay: "10.1s", animationDuration: "0.42s", strokeWidth: 0.85 }} />
              <path pathLength={1} className="neural-link" d="M200 80 L176 48" style={{ animationDelay: "10.55s", animationDuration: "0.42s", strokeWidth: 0.8 }} />
              <path pathLength={1} className="neural-link" d="M200 80 L226 44" style={{ animationDelay: "11s", animationDuration: "0.42s", strokeWidth: 0.8 }} />
              <path pathLength={1} className="neural-link" d="M220 60 L200 28" style={{ animationDelay: "11.45s", animationDuration: "0.42s", strokeWidth: 0.8 }} />
              <path pathLength={1} className="neural-link" d="M220 60 L246 34" style={{ animationDelay: "11.9s", animationDuration: "0.42s", strokeWidth: 0.8 }} />
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
          <div className="absolute -bottom-6 left-1/4 w-12 h-12 bg-surface-variant/40 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center animate-bounce">
            <Sparkles className="text-primary w-5 h-5" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatsSection() {
  const stats = [
    { label: "Active Minds", value: "500k+", color: "text-primary" },
    { label: "Retention Rate", value: "98%", color: "text-secondary" },
    { label: "Neural Support", value: "24/7", color: "text-tertiary" },
    { label: "Technology", value: "AI+", color: "text-on-surface" },
  ];
  return (
    <section className="px-8 py-12 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-y border-outline-variant/20 py-12">
        {stats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <div className={`text-3xl lg:text-4xl font-headline font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs lg:text-sm font-medium text-on-surface-variant uppercase tracking-widest mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section className="px-8 py-24 max-w-7xl mx-auto">
      <div className="mb-16">
        <h2 className="font-headline text-4xl font-bold mb-4">Neural Infrastructure</h2>
        <div className="h-1 w-24 bg-gradient-to-r from-primary to-transparent" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="md:col-span-2 glass-card rounded-3xl p-10 relative overflow-hidden group glow-corner">
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8"><Layout className="text-primary w-8 h-8" /></div>
            <h3 className="font-headline text-3xl font-bold mb-4">Hyper-Adaptive Syllabus</h3>
            <p className="text-on-surface-variant max-w-md text-lg leading-relaxed">Our AI engine analyzes your learning speed and conceptual gaps in real-time, restructuring your entire curriculum on the fly.</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-surface-container rounded-3xl p-8">
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-6"><GraduationCap className="text-secondary w-6 h-6" /></div>
          <h3 className="font-headline text-xl font-bold mb-3">Synapse Capture</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed">Instantly convert lectures into interactive neural maps and spaced-repetition cards.</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="bg-surface-container-high rounded-3xl p-8">
          <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center mb-6"><Network className="text-tertiary w-6 h-6" /></div>
          <h3 className="font-headline text-xl font-bold mb-3">Community Mesh</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed">Study within a global hive mind. Share insights through peer-to-peer cognitive linking.</p>
        </motion.div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection({ onAuthClick }: { onAuthClick: () => void }) {
  return (
    <section className="px-8 py-32 max-w-5xl mx-auto text-center relative">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative z-10">
        <h2 className="font-headline text-5xl lg:text-7xl font-bold mb-8">Join the <span className="italic text-tertiary">Future</span></h2>
        <p className="text-xl text-on-surface-variant mb-12 max-w-2xl mx-auto leading-relaxed">Stop studying. Start evolving. Join 500,000+ students leveraging prismatic intelligence to master their fields.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000" />
            <button onClick={onAuthClick} className="relative px-12 py-5 bg-surface rounded-full text-on-surface font-bold text-lg hover:bg-surface/80 transition-colors">Get Zupiq Pro</button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="bg-black/40 border-t border-white/5 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
          <div className="max-w-xs">
            <div className="text-2xl font-headline font-bold text-on-surface mb-4">Zupiq AI</div>
            <p className="text-on-surface-variant leading-relaxed">Prismatic Intelligence for the Modern Learner.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-12">
            {[
              { title: "Product", color: "text-primary", links: ["Features", "Pricing", "Updates"] },
              { title: "Company", color: "text-secondary", links: ["About", "Careers", "Ethics"] },
              { title: "Support", color: "text-tertiary", links: ["Help Center", "Community", "Contact"] },
              { title: "Legal", color: "text-on-surface", links: ["Privacy", "Terms"] },
            ].map((col) => (
              <div key={col.title} className="flex flex-col gap-4">
                <div className={`text-sm font-bold uppercase tracking-widest ${col.color}`}>{col.title}</div>
                {col.links.map((link) => (
                  <a key={link} href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">{link}</a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between items-center pt-8 border-t border-white/5">
          <p className="text-on-surface-variant text-sm">© 2025 Zupiq AI. All rights reserved.</p>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary/20 transition-colors">
              <Share2 className="w-5 h-5 text-on-surface-variant" />
            </button>
            <button className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-secondary/20 transition-colors">
              <Rocket className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
