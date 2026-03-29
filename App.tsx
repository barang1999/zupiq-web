/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { 
  Layout, 
  ArrowRight, 
  GraduationCap, 
  Network, 
  Share2, 
  Rocket,
  GitFork,
  History as HistoryIcon,
  Brain,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { supabase } from "./lib/supabase";
import { api, tokenStorage } from "./lib/api";
import { firebaseSignOut } from "./lib/firebase";
import { Auth } from "./components/Auth";
import { OnboardingPage } from "./pages/OnboardingPage";
import { StudySpacePage } from "./pages/StudySpacePage";
import { HistoryPage } from "./pages/HistoryPage";
import MobileHistoryPage from "./pages/MobileHistoryPage";
import ArchivePage from "./pages/ArchivePage";
import PlanPage from "./pages/PlanPage";
import BillingSubscriptionPage from "./pages/BillingSubscriptionPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import FlashcardSubjectSelectionPage from "./pages/FlashcardSubjectSelectionPage";
import FlashcardSessionPage from "./pages/FlashcardSessionPage";
import QuizPage from "./pages/QuizPage";
import AchievementPage from "./pages/AchievementPage";
import KnowledgeMapPage from "./pages/KnowledgeMapPage";
import QuantumPrismPage from "./pages/quantum-prism/QuantumPrismPage";
import { PublicHeader } from "./components/layout/PublicHeader";
import { GrowingTreeAnimation } from "./components/ui/GrowingTreeAnimation";

type AppShellPage =
  | 'study'
  | 'history'
  | 'archive'
  | 'plan'
  | 'billingsubscription'
  | 'flashcards'
  | 'flashcards-session'
  | 'quiz'
  | 'knowledge-map'
  | 'achievements'
  | 'quantum-prism'
  | 'settings'
  | 'privacy'
  | 'terms'
  | 'how-it-works';
type IOSNavigator = Navigator & { standalone?: boolean };
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

// Keep the raw browser install event out of React hook state/ref to avoid
// dev-mode object inspection touching cross-origin Window internals.
let deferredInstallPromptEvent: BeforeInstallPromptEvent | null = null;
const ENABLE_CUSTOM_INSTALL_PROMPT = !import.meta.env.DEV;

// --- Components ---

const Hero = ({ onAuthClick }: { onAuthClick: () => void }) => {
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id ?? "");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id ?? "");
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (_userId: string) => {
    try {
      const res = await api.get<{ user: any }>("/api/users/profile");
      if (res.user) {
        setGoal(res.user.preferences?.learning_goal || "");
      }
    } catch {
      // not logged in or token expired
    }
  };

  const saveGoal = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await api.patch("/api/users/preferences", { learning_goal: goal });
      alert("Goal updated!");
    } catch {
      // handle silently
    }
    setIsSaving(false);
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-8 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center overflow-visible">
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="z-10"
      >
        <h1 className="font-headline text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
          Quantum Learning for the <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-tertiary">Modern Mind.</span>
        </h1>
        
        {user ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-container-highest/50 backdrop-blur-md border border-white/5 p-6 rounded-3xl mb-10"
          >
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Your Current Learning Goal</label>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Master Quantum Physics"
                className="flex-1 bg-background/50 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button 
                onClick={saveGoal}
                disabled={isSaving}
                className="bg-primary text-on-primary px-6 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? "..." : "Save"}
              </button>
            </div>
          </motion.div>
        ) : (
          <p className="text-lg lg:text-xl text-on-surface-variant max-w-xl mb-10 leading-relaxed">
            Zupiq refracts complex information into personalized learning paths. Experience prismatic intelligence that adapts to your unique neural signature.
          </p>
        )}

        <div className="flex flex-wrap gap-4">
          <button onClick={onAuthClick} className="btn-primary">
            {user ? "Explore Paths" : "Launch Your Journey"}
          </button>
          <button className="btn-glass">Watch Demo</button>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="relative flex justify-center items-center"
      >
        <GrowingTreeAnimation />
      </motion.div>
    </section>
  );
};

const Stats = () => {
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
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={i === 0 ? "md:ml-12" : i === 3 ? "md:mr-12 text-right md:text-left" : ""}
          >
            <div className={`text-3xl lg:text-4xl font-headline font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs lg:text-sm font-medium text-on-surface-variant uppercase tracking-widest mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Features = () => {
  return (
    <section className="px-8 py-24 max-w-7xl mx-auto">
      <div className="mb-16">
        <h2 className="font-headline text-4xl font-bold mb-4">Neural Infrastructure</h2>
        <div className="h-1 w-24 bg-gradient-to-r from-primary to-transparent"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Large Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="md:col-span-2 glass-card rounded-3xl p-10 relative overflow-hidden group glow-corner"
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
                <Layout className="text-primary w-8 h-8" />
              </div>
              <h3 className="font-headline text-3xl font-bold mb-4">Hyper-Adaptive Syllabus</h3>
              <p className="text-on-surface-variant max-w-md text-lg leading-relaxed">
                Our AI engine analyzes your learning speed and conceptual gaps in real-time, restructuring your entire curriculum on the fly.
              </p>
            </div>
            <div className="mt-12">
              <button className="text-tertiary flex items-center gap-2 font-medium group-hover:gap-4 transition-all">
                Explore Dynamics <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <img 
            className="absolute bottom-0 right-0 w-1/2 h-full object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-700 pointer-events-none" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_zZ8GRMpYRvgNhuB_AHgfqbMhZp-Y7HRZqqxOJ06Xupv7S9MutDpLyCniLaRHjB_8n_yFoVFAnEkejxOcM5PtpypC6Ckg8d7cK4JNS_Re3Sz5dKl8l-12__cALWvMI5NYHg0X7m-0KdyYe9hLUNUiuzbQjcPiLcDdZ2WX-ZnXTrSGT9E1X8nLoSGM-VD_QDHA5v_1RAA5BlLcOARPy2tGlj0VE_Xk5V-YrP4I0gmMLotyFKaYGvOMrMMSkC4lAuakq9FUtpsvOn0" 
            alt="Neural Network Graphic"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* Small Card 1 */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container rounded-3xl p-8 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4">
            <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_10px_#ff51fa]"></div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-6">
            <GraduationCap className="text-secondary w-6 h-6" />
          </div>
          <h3 className="font-headline text-xl font-bold mb-3">Synapse Capture</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Instantly convert lectures into interactive neural maps and spaced-repetition cards.
          </p>
        </motion.div>

        {/* Small Card 2 */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="bg-surface-container-high rounded-3xl p-8 relative overflow-hidden group"
        >
          <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center mb-6">
            <Network className="text-tertiary w-6 h-6" />
          </div>
          <h3 className="font-headline text-xl font-bold mb-3">Community Mesh</h3>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Study within a global hive mind. Share insights through peer-to-peer cognitive linking.
          </p>
        </motion.div>

        {/* Featured Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="md:col-span-2 glass-card rounded-3xl p-10 flex flex-col md:flex-row gap-10 items-center glow-corner"
        >
          <div className="w-full md:w-1/2">
            <img 
              className="rounded-2xl w-full aspect-video object-cover shadow-2xl" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8k77BJR4PlL7y9ZdwI4Ns2-q69xDi5iLchm9XP8BD4WKz6Q_jYNZRlk2zyUadfkCx3qtmci81SZBJDF__CPQAz6RGxbH2GKpBQjRQYZnvFIyEH1zk722s5Jx6LD1DJaDGsH861fFznXV4yCy42XSgNj7bM8SbOPcbQvn9la35twoE9spx07dJLkIoLMZGr4tfuM-AQwbiKM9i3kmNLhf5SmN2Y6cxXUc75m6S32cpXMFOvw4WYIqh3gYRiKyaQhjjwLQsdYmcViE" 
              alt="Prismatic Focus"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="font-headline text-2xl font-bold mb-4">Prismatic Focus Mode</h3>
            <p className="text-on-surface-variant mb-8 italic text-lg leading-relaxed">
              "A revolutionary way to enter deep work. The interface literally breathes with you."
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-sm font-bold text-primary border border-white/5">
                JD
              </div>
              <div>
                <div className="font-bold">Julian Drance</div>
                <div className="text-xs text-on-surface-variant uppercase tracking-wider">Cognitive Scientist</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const CTA = ({ onAuthClick }: { onAuthClick: () => void }) => {
  return (
    <section className="px-8 py-32 max-w-5xl mx-auto text-center relative">
      <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="relative z-10"
      >
        <h2 className="font-headline text-5xl lg:text-7xl font-bold mb-8">
          Join the <span className="italic text-tertiary">Future</span>
        </h2>
        <p className="text-xl text-on-surface-variant mb-12 max-w-2xl mx-auto leading-relaxed">
          Stop studying. Start evolving. Join 500,000+ students leveraging prismatic intelligence to master their fields.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <button 
              onClick={onAuthClick}
              className="relative px-12 py-5 bg-surface rounded-full text-on-surface font-bold text-lg hover:bg-surface/80 transition-colors"
            >
              Get Zupiq Pro
            </button>
          </div>
          <button className="px-12 py-5 border border-outline-variant text-on-surface font-bold rounded-full hover:bg-surface-container-highest transition-colors">
            Compare Plans
          </button>
        </div>
      </motion.div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-black/40 border-t border-white/5 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
          <div className="max-w-xs">
            <div className="text-2xl font-headline font-bold text-on-surface mb-4">Zupiq AI</div>
            <p className="text-on-surface-variant leading-relaxed">
              Prismatic Intelligence for the Modern Learner. Empowering minds through quantum adaptive technology.
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-12">
            <div className="flex flex-col gap-4">
              <div className="text-sm font-bold uppercase tracking-widest text-primary">Product</div>
              <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Features</a>
              <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Pricing</a>
              <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Updates</a>
            </div>
            <div className="flex flex-col gap-4">
              <div className="text-sm font-bold uppercase tracking-widest text-secondary">Company</div>
              <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">About</a>
              <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Careers</a>
              <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Ethics</a>
            </div>
            <div className="flex flex-col gap-4">
              <div className="text-sm font-bold uppercase tracking-widest text-tertiary">Support</div>
              <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Help Center</a>
              <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Community</a>
              <a href="#" className="text-on-surface-variant hover:text-on-surface transition-colors">Contact</a>
            </div>
            <div className="flex flex-col gap-4">
              <div className="text-sm font-bold uppercase tracking-widest text-on-surface">Legal</div>
              <a href="/privacy" className="text-on-surface-variant hover:text-on-surface transition-colors">Privacy</a>
              <a href="/terms" className="text-on-surface-variant hover:text-on-surface transition-colors">Terms</a>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/5 gap-6">
          <p className="text-on-surface-variant text-sm">
            © 2024 Zupiq AI. All rights reserved.
          </p>
          <div className="flex gap-4">
            <button className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary/20 transition-colors group">
              <Share2 className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
            </button>
            <button className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-secondary/20 transition-colors group">
              <Rocket className="w-5 h-5 text-on-surface-variant group-hover:text-secondary transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

const MobileBottomNav = ({
  page,
  onNavigate,
}: {
  page: AppShellPage;
  onNavigate: (next: AppShellPage) => void;
}) => {
  const activeItemForPage = (
    currentPage: AppShellPage
  ): "study" | "knowledge-map" | "history" | "play" => {
    if (currentPage === "knowledge-map") return "knowledge-map";
    if (currentPage === "history") return "history";
    if (
      currentPage === "flashcards" ||
      currentPage === "flashcards-session" ||
      currentPage === "quiz" ||
      currentPage === "achievements"
    ) return "play";
    return "study";
  };

  const [activeItem, setActiveItem] = useState<'study' | 'knowledge-map' | 'history' | 'play'>(
    activeItemForPage(page)
  );

  useEffect(() => {
    setActiveItem(activeItemForPage(page));
  }, [page]);

  const navItems = [
    { id: 'study' as const, page: 'study' as const, label: 'Study', Icon: GitFork },
    { id: 'knowledge-map' as const, page: 'knowledge-map' as const, label: 'Map', Icon: Network },
    { id: 'history' as const, page: 'history' as const, label: 'History', Icon: HistoryIcon },
    { id: 'play' as const, page: 'quiz' as const, label: 'Quiz', Icon: Brain },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden bg-surface-container-low/95 backdrop-blur-md border-t border-outline-variant/20">
      {navItems.map(({ id, page: targetPage, label, Icon }) => {
        const isActive = activeItem === id;
        return (
          <button
            key={id}
            onClick={() => {
              setActiveItem(id);
              onNavigate(targetPage);
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

// --- Main App ---

export default function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(() => tokenStorage.getUser());
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const u = tokenStorage.getUser();
    return !!u && !u.preferences?.onboarding_completed;
  });
  const [canInstallApp, setCanInstallApp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as IOSNavigator).standalone === true
    );
  });
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth < 640);

  const pathToPage = (path: string): AppShellPage => {
    if (path === '/history') return 'history';
    if (path === '/archive') return 'archive';
    if (path === '/plan') return 'plan';
    if (path === '/billingsubscription' || path === '/billing-subscription') return 'billingsubscription';
    if (path === '/how-it-works') return 'how-it-works';
    if (path === '/flashcards/session') return 'flashcards-session';
    if (path === '/flashcards') return 'flashcards';
    if (path === '/quiz') return 'quiz';
    if (path === '/knowledge-map') return 'knowledge-map';
    if (path === '/achievements') return 'achievements';
    if (path === '/quantum-prism') return 'quantum-prism';
    if (path === '/settings') return 'settings';
    if (path === '/privacy') return 'privacy';
    if (path === '/terms') return 'terms';
    return 'study';
  };

  const [page, setPageState] = useState<AppShellPage>(() => pathToPage(window.location.pathname));
  const [flashcardSubject, setFlashcardSubject] = useState<string | null>(() => {
    const value = new URLSearchParams(window.location.search).get("subject");
    return value?.trim() ? value : null;
  });
  const [initialBreakdown, setInitialBreakdown] = useState<any>(null);

  const setPage = (
    next: AppShellPage,
    options?: {
      subject?: string | null;
      quizSubjectId?: string | null;
      quizSubjectName?: string | null;
      quizArea?: string | null;
    }
  ) => {
    let url: string;
    if (next === "study") {
      url = "/";
    } else if (next === "archive") {
      url = "/archive";
    } else if (next === "plan") {
      url = "/plan";
    } else if (next === "billingsubscription") {
      url = "/billingsubscription";
    } else if (next === "how-it-works") {
      url = "/how-it-works";
    } else if (next === "flashcards") {
      url = "/flashcards";
    } else if (next === "quiz") {
      const quizParams = new URLSearchParams();
      const quizSubjectId = options?.quizSubjectId?.trim();
      const quizSubjectName = options?.quizSubjectName?.trim();
      const quizArea = options?.quizArea?.trim();
      if (quizSubjectId) {
        quizParams.set("subjectId", quizSubjectId);
      } else if (quizSubjectName) {
        quizParams.set("subject", quizSubjectName);
      }
      if (quizArea) quizParams.set("area", quizArea);
      const query = quizParams.toString();
      url = query ? `/quiz?${query}` : "/quiz";
    } else if (next === "knowledge-map") {
      url = "/knowledge-map";
    } else if (next === "achievements") {
      url = "/achievements";
    } else if (next === "quantum-prism") {
      url = "/quantum-prism";
    } else if (next === "flashcards-session") {
      const nextSubject = options?.subject ?? flashcardSubject;
      if (options && "subject" in options) {
        setFlashcardSubject(options.subject ?? null);
      }
      const query = nextSubject ? `?subject=${encodeURIComponent(nextSubject)}` : "";
      url = `/flashcards/session${query}`;
    } else {
      url = `/${next}`;
    }

    window.history.pushState({ page: next }, '', url);
    setPageState(next);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setCurrentUser(u);
      if (u && !u.preferences?.onboarding_completed) {
        setShowOnboarding(true);
      }
    });

    // Sync page state with browser back/forward buttons
    const onPopState = (e: PopStateEvent) => {
      setPageState(e.state?.page ?? pathToPage(window.location.pathname));
      const value = new URLSearchParams(window.location.search).get("subject");
      setFlashcardSubject(value?.trim() ? value : null);
    };
    window.addEventListener('popstate', onPopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const updateStandaloneState = () => {
      setIsStandalone(
        displayModeQuery.matches || (window.navigator as IOSNavigator).standalone === true
      );
    };
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 640);
    };

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredInstallPromptEvent = event as BeforeInstallPromptEvent;
      setCanInstallApp(true);
    };

    const onAppInstalled = () => {
      deferredInstallPromptEvent = null;
      setCanInstallApp(false);
      setIsStandalone(true);
    };

    updateStandaloneState();
    window.addEventListener('resize', updateViewport);
    displayModeQuery.addEventListener('change', updateStandaloneState);
    if (ENABLE_CUSTOM_INSTALL_PROMPT) {
      window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.addEventListener('appinstalled', onAppInstalled);
    } else {
      deferredInstallPromptEvent = null;
      setCanInstallApp(false);
    }

    return () => {
      if (ENABLE_CUSTOM_INSTALL_PROMPT) {
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.removeEventListener('appinstalled', onAppInstalled);
      }
      window.removeEventListener('resize', updateViewport);
      displayModeQuery.removeEventListener('change', updateStandaloneState);
    };
  }, []);

  const showInstallButton = ENABLE_CUSTOM_INSTALL_PROMPT && canInstallApp && !isStandalone;

  const handleInstallApp = async () => {
    const installPromptEvent = deferredInstallPromptEvent;
    if (!installPromptEvent) return;

    await installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    deferredInstallPromptEvent = null;
    setCanInstallApp(false);
  };

  if (page === 'privacy') {
    return <PrivacyPage onBack={() => setPage('study')} />;
  }

  if (page === 'terms') {
    return <TermsPage onBack={() => setPage('study')} />;
  }

  if (showOnboarding && currentUser) {
    return (
      <OnboardingPage
        user={currentUser}
        onComplete={(updatedUser) => {
          setCurrentUser(updatedUser);
          setShowOnboarding(false);
          const access = tokenStorage.getAccess();
          const refresh = tokenStorage.getRefresh();
          if (access && refresh) tokenStorage.setTokens(access, refresh, updatedUser);
        }}
      />
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
    setCurrentUser(null);
    setFlashcardSubject(null);
    window.history.pushState({}, '', '/');
    setPageState('study');
  };

  if (page === 'how-it-works') {
    return (
      <>
        <HowItWorksPage
          user={currentUser}
          onAuthClick={() => setShowAuth(true)}
          onSignOut={currentUser ? handleSignOut : undefined}
          onNavigateHome={() => setPage('study')}
          onNavigatePlan={() => setPage('plan')}
          onNavigateHowItWorks={() => setPage('how-it-works')}
        />
        <AnimatePresence>
          {showAuth && <Auth onClose={() => setShowAuth(false)} />}
        </AnimatePresence>
      </>
    );
  }

  if (page === 'quantum-prism') {
    return <QuantumPrismPage onNavigateStudy={() => setPage('study')} />;
  }

  if (currentUser && currentUser.preferences?.onboarding_completed) {
    let authenticatedPage: ReactNode;

    if (page === 'settings') {
      authenticatedPage = (
        <SettingsPage
          user={currentUser}
          onUserUpdate={(u) => {
            setCurrentUser(u);
            // Persist the updated user (e.g. new avatar_url) to localStorage so
            // it survives page refreshes and doesn't revert to the Google picture.
            const access = tokenStorage.getAccess();
            const refresh = tokenStorage.getRefresh();
            if (access && refresh) tokenStorage.setTokens(access, refresh, u);
          }}
          onSignOut={handleSignOut}
          onBack={() => setPage('study')}
          onNavigateHistory={() => setPage('history')}
          onNavigateFlashcards={() => setPage('flashcards')}
          onNavigateBillingSubscription={() => setPage('billingsubscription')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
        />
      );
    } else if (page === 'history') {
      authenticatedPage = isMobileViewport ? (
        <MobileHistoryPage
          user={currentUser}
          onNavigateStudy={(bd) => { setInitialBreakdown(bd ?? null); setPage('study'); }}
          onNavigateFlashcards={() => setPage('flashcards')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
        />
      ) : (
        <HistoryPage
          user={currentUser}
          onNavigateStudy={(bd) => { setInitialBreakdown(bd ?? null); setPage('study'); }}
          onNavigateFlashcards={() => setPage('flashcards')}
          onNavigateQuiz={() => setPage('quiz')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
        />
      );
    } else if (page === 'archive') {
      authenticatedPage = (
        <ArchivePage
          user={currentUser}
          onNavigateStudy={() => setPage('study')}
          onNavigateHistory={() => setPage('history')}
          onNavigateFlashcards={() => setPage('flashcards')}
          onNavigateQuiz={() => setPage('quiz')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
        />
      );
    } else if (page === 'plan') {
      authenticatedPage = (
        <PlanPage
          user={currentUser}
          onNavigateStudy={() => setPage('study')}
          onNavigateBillingSubscription={() => setPage('billingsubscription')}
          onNavigateHowItWorks={() => setPage('how-it-works')}
          onNavigateHistory={() => setPage('history')}
          onNavigateFlashcards={() => setPage('flashcards')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
        />
      );
    } else if (page === 'billingsubscription') {
      authenticatedPage = (
        <BillingSubscriptionPage
          user={currentUser}
          onNavigateStudy={() => setPage('study')}
          onNavigatePlan={() => setPage('plan')}
          onNavigateHowItWorks={() => setPage('how-it-works')}
        />
      );
    } else if (page === 'flashcards') {
      authenticatedPage = (
        <FlashcardSubjectSelectionPage
          user={currentUser}
          initialSubject={flashcardSubject}
          onNavigateStudy={() => setPage('study')}
          onNavigateHistory={() => setPage('history')}
          onNavigateQuiz={() => setPage('quiz')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
          onStartSession={(subject) => setPage('flashcards-session', { subject })}
        />
      );
    } else if (page === 'flashcards-session') {
      authenticatedPage = flashcardSubject ? (
        <FlashcardSessionPage
          user={currentUser}
          selectedSubject={flashcardSubject}
          onNavigateStudy={() => setPage('study')}
          onNavigateHistory={() => setPage('history')}
          onNavigateSubjects={() => setPage('flashcards')}
          onNavigateQuiz={() => setPage('quiz')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
        />
      ) : (
        <FlashcardSubjectSelectionPage
          user={currentUser}
          initialSubject={flashcardSubject}
          onNavigateStudy={() => setPage('study')}
          onNavigateHistory={() => setPage('history')}
          onNavigateQuiz={() => setPage('quiz')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
          onStartSession={(subject) => setPage('flashcards-session', { subject })}
        />
      );
    } else if (page === 'quiz') {
      authenticatedPage = (
        <QuizPage
          user={currentUser}
          onNavigateStudy={(bd) => { setInitialBreakdown(bd ?? null); setPage('study'); }}
          onNavigateKnowledgeMap={() => setPage('knowledge-map')}
          onNavigateHistory={() => setPage('history')}
          onNavigateFlashcards={() => setPage('flashcards')}
          onNavigateAchievements={() => setPage('achievements')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
        />
      );
    } else if (page === 'knowledge-map') {
      authenticatedPage = (
        <KnowledgeMapPage
          user={currentUser}
          onNavigateStudy={(bd) => { setInitialBreakdown(bd ?? null); setPage('study'); }}
          onNavigateHistory={() => setPage('history')}
          onNavigateFlashcards={() => setPage('flashcards')}
          onNavigateQuiz={() => setPage('quiz')}
          onNavigateAchievements={() => setPage('achievements')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
        />
      );
    } else if (page === 'achievements') {
      authenticatedPage = (
        <AchievementPage
          user={currentUser}
          onNavigateStudy={() => setPage('study')}
          onNavigateKnowledgeMap={() => setPage('knowledge-map')}
          onNavigateHistory={() => setPage('history')}
          onNavigateFlashcards={() => setPage('flashcards')}
          onNavigateQuiz={() => setPage('quiz')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
        />
      );
    } else {
      authenticatedPage = (
        <StudySpacePage
          user={currentUser}
          onNavigateKnowledgeMap={() => setPage('knowledge-map')}
          onNavigateHistory={() => setPage('history')}
          onNavigateFlashcards={() => setPage('flashcards')}
          onNavigateAchievements={() => setPage('achievements')}
          onNavigateQuantumPrism={() => setPage('quantum-prism')}
          onNavigateQuiz={(prefill) => setPage('quiz', {
            quizSubjectId: prefill?.subjectId ?? null,
            quizSubjectName: prefill?.subjectName ?? null,
            quizArea: prefill?.specificArea ?? null,
          })}
          onNavigatePlan={() => setPage('plan')}
          onNavigateSettings={() => setPage('settings')}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
          initialBreakdown={initialBreakdown}
          onBreakdownConsumed={() => setInitialBreakdown(null)}
        />
      );
    }

    return (
      <>
        {authenticatedPage}
        {page !== 'plan' && page !== 'billingsubscription' && (
          <MobileBottomNav page={page} onNavigate={setPage} />
        )}
      </>
    );
  }

  if (page === "plan") {
    return (
      <>
        <PlanPage
          user={currentUser}
          onNavigateStudy={() => setPage("study")}
          onNavigateBillingSubscription={() => setPage("billingsubscription")}
          onNavigateHowItWorks={() => setPage("how-it-works")}
          onNavigateHistory={() => setShowAuth(true)}
          onNavigateFlashcards={() => setShowAuth(true)}
          onNavigateSettings={() => setShowAuth(true)}
          showInstallAppButton={showInstallButton}
          onInstallApp={handleInstallApp}
          onRequireAuth={() => setShowAuth(true)}
        />
        <AnimatePresence>
          {showAuth && <Auth onClose={() => setShowAuth(false)} />}
        </AnimatePresence>
      </>
    );
  }

  if (page === "billingsubscription") {
    return (
      <>
        <BillingSubscriptionPage
          user={currentUser}
          onNavigateStudy={() => setPage("study")}
          onNavigatePlan={() => setPage("plan")}
          onNavigateHowItWorks={() => setPage("how-it-works")}
          onRequireAuth={() => setShowAuth(true)}
        />
        <AnimatePresence>
          {showAuth && <Auth onClose={() => setShowAuth(false)} />}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface selection:bg-primary selection:text-on-primary">
      {/* Background Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-container/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-container/5 blur-[120px] rounded-full pointer-events-none"></div>

      <PublicHeader
        user={currentUser}
        onAuthClick={() => setShowAuth(true)}
        onNavigateHome={() => setPage("study")}
        onNavigatePlan={() => setPage("plan")}
        onNavigateHowItWorks={() => setPage("how-it-works")}
        activePage="home"
      />
      <main>
        <Hero onAuthClick={() => setShowAuth(true)} />
        <Stats />
        <Features />
        <CTA onAuthClick={() => setShowAuth(true)} />
      </main>
      <Footer />

      <AnimatePresence>
        {showAuth && <Auth onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </div>
  );
}
