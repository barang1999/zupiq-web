import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Archive,
  ArrowRight,
  Brain,
  ChevronLeft,
  FileText,
  GitFork,
  HelpCircle,
  History,
  Layers,
  LogOut,
  Search,
  Sparkles,
  UploadCloud,
  Users,
  Video,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { supabase } from '../lib/supabase';
import { firebaseSignOut } from '../lib/firebase';

interface Props {
  user: any;
  onNavigateStudy?: () => void;
  onNavigateHistory?: () => void;
  onNavigateFlashcards?: () => void;
  onNavigateQuiz?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
}

type ResourceType = 'paper' | 'video' | 'breakdown';

interface ResourceItem {
  id: string;
  title: string;
  category: string;
  type: ResourceType;
  duration: string;
  level: string;
  summary: string;
}

const RESOURCES: ResourceItem[] = [
  {
    id: 'res-quantum',
    title: 'Quantum Entanglement: A Neural Overview',
    category: 'Physics',
    type: 'paper',
    duration: '12 min',
    level: 'Advanced',
    summary: 'Concept synthesis of entanglement, Bell inequalities, and measurement interpretation.',
  },
  {
    id: 'res-neuro',
    title: 'Neuroplasticity in the Digital Age',
    category: 'Biology',
    type: 'video',
    duration: '8 min',
    level: 'Intermediate',
    summary: 'Visual lecture on plastic adaptation loops and effective retention behaviors.',
  },
  {
    id: 'res-brutalism',
    title: 'Neo-Brutalism: Architectural Evolution',
    category: 'Art History',
    type: 'breakdown',
    duration: '15 min',
    level: 'Deep Dive',
    summary: 'Structured map connecting form language, context, and socio-technical influence.',
  },
  {
    id: 'res-calc',
    title: 'Multivariable Calculus Compression',
    category: 'Mathematics',
    type: 'paper',
    duration: '10 min',
    level: 'Intermediate',
    summary: 'Compact set of intuition-first derivations for gradients, divergence, and curl.',
  },
];

const SAVED_BREAKDOWNS = [
  {
    id: 'bd-thermo',
    title: 'Thermodynamics II: Entropy Neural Map',
    description: 'Second law review with engine cycles and statistical grounding.',
    tag: 'Physics',
    updated: 'Saved 2d ago',
  },
  {
    id: 'bd-game-theory',
    title: 'Game Theory: Strategic Equilibrium',
    description: 'Nash equilibrium intuition, payoff landscape, and stability modes.',
    tag: 'Economics',
    updated: 'Saved 5d ago',
  },
];

function typeIcon(type: ResourceType) {
  if (type === 'paper') return FileText;
  if (type === 'video') return Video;
  return Brain;
}

export default function ArchivePage({
  user,
  onNavigateStudy,
  onNavigateHistory,
  onNavigateFlashcards,
  onNavigateQuiz,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
}: Props) {
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | ResourceType>('all');

  const isExpanded = sidebarOpen || sidebarHovered;

  const filteredResources = useMemo(() => {
    return RESOURCES.filter((item) => {
      const matchFilter = activeFilter === 'all' || item.type === activeFilter;
      const q = query.trim().toLowerCase();
      const matchQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q);
      return matchFilter && matchQuery;
    });
  }, [activeFilter, query]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const navigateToQuiz = () => {
    if (onNavigateQuiz) {
      onNavigateQuiz();
      return;
    }
    if (window.location.pathname !== '/quiz') {
      window.history.pushState({ page: 'quiz' }, '', '/quiz');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'quiz' } }));
    }
  };

  const NAV_ITEMS = [
    { id: 'study', label: 'Study Space', Icon: GitFork, action: () => onNavigateStudy?.() },
    { id: 'history', label: 'Learning History', Icon: History, action: () => onNavigateHistory?.() },
    { id: 'flashcards', label: 'Flashcards', Icon: Layers, action: () => onNavigateFlashcards?.() },
    { id: 'quiz', label: 'Quiz', Icon: Brain, action: navigateToQuiz },
    { id: 'collab', label: 'Collaborate', Icon: Users, action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      <div className="fixed top-1/4 -right-20 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-1/4 -left-20 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <AppHeader
        user={user}
        onSettingsClick={onNavigateSettings}
        onSignOut={handleSignOut}
        onNavigateStudy={onNavigateStudy}
        onNavigateHistory={onNavigateHistory}
        onNavigateFlashcards={onNavigateFlashcards}
        onNavigateQuiz={navigateToQuiz}
        activeMobileMenu={null}
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
        left={
          <div className="hidden md:flex items-center bg-surface-container-highest px-4 py-2 rounded-full gap-2">
            <Search className="w-4 h-4 text-primary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the archive..."
              className="bg-transparent outline-none text-sm text-on-surface w-56 placeholder:text-on-surface-variant"
            />
          </div>
        }
      />

      <motion.aside
        animate={{ width: isExpanded ? 256 : 64 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className="fixed left-0 h-full z-40 bg-surface-container-low hidden sm:flex flex-col pt-20 pb-6 text-sm font-medium overflow-hidden"
        style={{ width: isExpanded ? 256 : 64 }}
      >
        <div className={`mb-8 overflow-hidden transition-all duration-200 ${isExpanded ? 'px-6' : 'px-0 flex justify-center'}`}>
          {isExpanded ? (
            <div>
              <h2 className="font-headline font-bold text-lg text-secondary leading-tight whitespace-nowrap">Resource Archive</h2>
              <p className="text-on-surface-variant text-xs uppercase tracking-widest opacity-70 mt-1 whitespace-nowrap">Prismatic Library</p>
            </div>
          ) : (
            <Archive className="w-5 h-5 text-secondary" />
          )}
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ id, label, Icon, action }) => {
            const isActive = id === 'archive';
            return (
              <button
                key={id}
                onClick={action}
                title={!isExpanded ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 transition-all duration-200 text-left ${
                  isActive
                    ? isExpanded
                      ? 'rounded-r-full bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary'
                      : 'rounded-xl bg-primary/15 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-xl'
                } ${!isExpanded ? 'justify-center' : ''}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {isExpanded && <span className="overflow-hidden whitespace-nowrap">{label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 px-2">
          {isExpanded && (
            <button
              onClick={() => onNavigateStudy?.()}
              className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity whitespace-nowrap overflow-hidden"
            >
              New Session
            </button>
          )}
          <div className={`pt-4 border-t border-outline-variant/20 flex flex-col gap-2 ${!isExpanded ? 'items-center' : ''}`}>
            <a href="#" className={`flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors ${!isExpanded ? 'justify-center p-2 rounded-xl hover:bg-surface-container' : 'px-1'}`}>
              <HelpCircle className="w-4 h-4 shrink-0" />
              {isExpanded && <span className="text-xs whitespace-nowrap">Support</span>}
            </a>
            <button
              onClick={handleSignOut}
              className={`flex items-center gap-3 text-on-surface-variant hover:text-error transition-colors ${!isExpanded ? 'justify-center p-2 rounded-xl hover:bg-surface-container' : 'px-1'}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {isExpanded && <span className="text-xs whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      <motion.button
        animate={{ left: isExpanded ? 244 : 52 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onClick={() => setSidebarOpen((open) => !open)}
        title={sidebarOpen ? 'Unpin sidebar' : 'Pin sidebar open'}
        className="fixed top-[72px] z-50 w-6 h-6 rounded-full bg-surface-container-highest border border-outline-variant/40 hidden sm:flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shadow-md"
      >
        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.25 }}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </motion.div>
      </motion.button>

      <motion.main
        animate={{ paddingLeft: isExpanded ? 256 : 64 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="pt-20 sm:pt-24 pb-32 px-4 sm:px-6 min-h-screen relative z-10"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <section className="relative rounded-[2rem] overflow-hidden p-6 sm:p-10 bg-surface-container-low">
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-15 pointer-events-none bg-gradient-to-br from-primary/30 to-secondary/30" />
            <div className="relative z-10 space-y-5 max-w-3xl">
              <h1 className="text-4xl sm:text-5xl font-headline font-bold tracking-tighter text-on-surface leading-none">
                Archive The <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Learning Graph</span>
              </h1>
              <p className="text-on-surface-variant text-base sm:text-lg max-w-2xl">
                A searchable vault of saved neural breakdowns, uploaded documents, and AI-curated resources.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'paper', label: 'Research Papers' },
                  { key: 'video', label: 'Video Lectures' },
                  { key: 'breakdown', label: 'Neural Breakdowns' },
                ].map((filter) => {
                  const isActive = activeFilter === filter.key;
                  return (
                    <button
                      key={filter.key}
                      onClick={() => setActiveFilter(filter.key as 'all' | ResourceType)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/20 hover:text-on-surface'
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="glass-card rounded-[2rem] p-5 sm:p-8 border border-outline-variant/10 bg-surface-container-highest/40 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row gap-6 items-center">
              <div className="flex-1 w-full">
                <div className="border-2 border-dashed border-primary/35 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center bg-surface-container-low/60">
                  <UploadCloud className="w-9 h-9 text-primary mb-3" />
                  <p className="font-headline font-semibold text-on-surface text-center mb-1">Drop files to archive</p>
                  <p className="text-xs text-on-surface-variant">PDF, MP4, and notes are indexed automatically</p>
                </div>
              </div>
              <div className="w-full md:w-80 space-y-4">
                <div className="h-1.5 w-full rounded-full bg-surface-container-low overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-primary to-secondary rounded-full animate-pulse" />
                </div>
                <button className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-on-primary font-headline font-bold text-sm active:scale-95 transition-transform">
                  Upload Resource
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold">Featured Resources</h2>
              <span className="text-xs uppercase tracking-widest text-on-surface-variant">{filteredResources.length} items</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {filteredResources.map((resource) => {
                const Icon = typeIcon(resource.type);
                return (
                  <article
                    key={resource.id}
                    className="min-w-[280px] sm:min-w-[320px] bg-surface-container rounded-3xl p-5 border border-outline-variant/15 hover:border-primary/40 transition-colors"
                  >
                    <div className="h-36 rounded-2xl mb-4 bg-gradient-to-br from-primary/10 via-secondary/10 to-tertiary/10 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                          {resource.category}
                        </span>
                        <span className="text-on-surface-variant text-xs">{resource.duration}</span>
                      </div>
                      <h3 className="text-lg font-headline font-bold leading-tight">{resource.title}</h3>
                      <p className="text-xs text-on-surface-variant line-clamp-2">{resource.summary}</p>
                      <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between">
                        <span className="text-xs text-tertiary">{resource.level}</span>
                        <button className="text-xs font-bold text-primary flex items-center gap-1">
                          Explore <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-headline font-bold">Saved Breakdowns</h3>
                <button className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">
                  View All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SAVED_BREAKDOWNS.map((item) => (
                  <article key={item.id} className="bg-surface-container-highest/45 backdrop-blur-xl rounded-2xl p-5 border border-outline-variant/15">
                    <div className="flex justify-between items-start mb-3">
                      <div className="h-9 w-9 rounded-lg bg-surface-container flex items-center justify-center">
                        <Brain className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">{item.updated}</span>
                    </div>
                    <h4 className="font-headline font-bold text-lg leading-tight mb-2">{item.title}</h4>
                    <p className="text-xs text-on-surface-variant mb-3">{item.description}</p>
                    <span className="inline-flex px-2 py-1 rounded-full text-[10px] uppercase tracking-wider bg-secondary/10 text-secondary">
                      {item.tag}
                    </span>
                  </article>
                ))}
              </div>
            </div>
            <aside className="bg-surface-container rounded-3xl p-5 border border-outline-variant/15">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-on-primary" />
                </div>
                <div>
                  <h4 className="font-headline font-bold">Archive Assistant</h4>
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">AI Indexed</p>
                </div>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
                Ask for any concept, and I will return related resources with difficulty sequencing.
              </p>
              <button className="w-full py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary font-headline font-bold text-sm">
                Open Assistant
              </button>
            </aside>
          </section>
        </div>
      </motion.main>
    </div>
  );
}
