import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, GraduationCap, SlidersHorizontal, CheckCircle2,
  Sigma, Atom, Terminal, BookOpen, Dna, FlaskConical,
  Globe, AudioLines, Bell, Rocket, Search, Plus,
  ArrowRight, ArrowLeft, Loader2, Sparkles,
} from 'lucide-react';
import { api, tokenStorage } from '../lib/api';
import { notifyAuthChange } from '../lib/supabase';
import { CustomSelect } from '../components/ui/CustomSelect';

// ─── Data ─────────────────────────────────────────────────────────────────────

const SUBJECTS = [
  { id: 'mathematics',     name: 'Mathematics',      desc: 'Pure logic, calculus, and abstract structures.',          Icon: Sigma,       gradient: true,  color: '' },
  { id: 'physics',         name: 'Physics',           desc: 'The fundamental laws governing our universe.',            Icon: Atom,        gradient: false, color: 'text-secondary' },
  { id: 'computer_science',name: 'Computer Science',  desc: 'Algorithms, systems, and digital intelligence.',          Icon: Terminal,    gradient: false, color: 'text-tertiary' },
  { id: 'literature',      name: 'Literature',        desc: 'Narrative structures, history, and linguistic art.',       Icon: BookOpen,    gradient: false, color: 'text-primary' },
  { id: 'biology',         name: 'Biology',           desc: 'Exploring life from cellular levels to ecosystems.',       Icon: Dna,         gradient: false, color: 'text-secondary' },
  { id: 'chemistry',       name: 'Chemistry',         desc: 'Matter, reactions, and molecular structures.',             Icon: FlaskConical,gradient: false, color: 'text-tertiary' },
];

const LANGUAGES = [
  { value: 'en', label: '🇺🇸 English (US)' },
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'de', label: '🇩🇪 Deutsch' },
  { value: 'ja', label: '🇯🇵 日本語' },
  { value: 'km', label: '🇰🇭 ភាសាខ្មែរ' },
];

const EDUCATION_LEVELS = [
  { value: 'high_school',   label: 'High School' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate',      label: 'Graduate' },
];

const NAV_STEPS = [
  { label: 'Profile',     Icon: User },
  { label: 'Academic',    Icon: GraduationCap },
  { label: 'Preferences', Icon: SlidersHorizontal },
  { label: 'Finalize',    Icon: CheckCircle2 },
];

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, accent = 'primary' }: { checked: boolean; onChange: () => void; accent?: 'primary' | 'secondary' }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
        checked
          ? accent === 'secondary' ? 'bg-secondary/30' : 'bg-primary/30'
          : 'bg-surface-container-highest'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full transition-all duration-300 ${
          checked
            ? `left-7 ${accent === 'secondary' ? 'bg-secondary' : 'bg-primary'}`
            : 'left-1 bg-on-surface-variant'
        }`}
      />
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  user: any;
  onComplete: (updatedUser: any) => void;
}

export function OnboardingPage({ user, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [fullName, setFullName]         = useState<string>(user?.full_name || '');
  const [username, setUsername]         = useState<string>(user?.preferences?.username || '');
  const [educationLevel, setEduLevel]   = useState<string>(user?.education_level || '');

  // Step 2
  const [selectedSubjects, setSelected] = useState<string[]>(user?.preferences?.subjects || []);
  const [search, setSearch]             = useState('');

  // Step 3
  const [language, setLanguage]         = useState<string>(user?.language || 'en');
  const [aiVoice, setAiVoice]           = useState(true);
  const [reminders, setReminders]       = useState(true);

  const toggleSubject = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const filtered = SUBJECTS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch('/api/users/profile', {
        full_name: fullName || user?.full_name,
        education_level: educationLevel || user?.education_level,
        language,
      });
      await api.patch('/api/users/preferences', {
        username,
        subjects: selectedSubjects,
        ai_voice: aiVoice,
        daily_reminders: reminders,
        onboarding_completed: true,
      });
      const { user: fresh } = await api.get<{ user: any }>('/api/users/profile');
      tokenStorage.setTokens(tokenStorage.getAccess()!, tokenStorage.getRefresh()!, fresh);
      notifyAuthChange('SIGNED_IN', { user: fresh, access_token: tokenStorage.getAccess()! });
      onComplete(fresh);
    } catch (err: any) {
      setError(err.message ?? 'Setup failed. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Background blobs */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-secondary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Top Nav */}
      <header className="fixed top-0 w-full z-50 bg-surface-container-highest/60 backdrop-blur-xl flex justify-between items-center px-6 h-16 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <span className="text-2xl font-headline font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          Zupiq
        </span>
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
          <User className="w-4 h-4" />
        </div>
      </header>

      <div className="flex min-h-screen pt-16">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 fixed left-0 top-0 h-full bg-surface-container-low pt-20 px-4 z-40">
          <div className="mb-8 px-4">
            <h2 className="font-headline text-primary text-lg font-bold">Setup Guide</h2>
            <p className="text-xs text-on-surface-variant tracking-widest uppercase mt-1 opacity-70">
              {fullName || user?.full_name || 'Prismatic Neuralist'}
            </p>
          </div>
          <nav className="space-y-1">
            {NAV_STEPS.map(({ label, Icon: NavIcon }, i) => {
              const navStep = i + 1;
              const isActive = navStep === step;
              const isDone   = navStep < step;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm ${
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 to-secondary/20 border-r-2 border-primary text-on-surface font-medium'
                      : isDone
                      ? 'text-primary/60'
                      : 'text-on-surface-variant'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <NavIcon className="w-5 h-5" />}
                  <span>{label}</span>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 md:ml-64 px-6 md:px-12 py-10 pb-28 md:pb-10">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence mode="wait">

              {/* ── Step 1: Profile ───────────────────────────────────────── */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                  <div className="mb-10">
                    <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tight leading-none mb-4">
                      Tell us about<br />
                      <span className="text-primary">yourself</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-6">
                      <div className="h-[3px] w-48 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-gradient-to-r from-primary to-secondary" />
                      </div>
                      <span className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Step 1 of 3</span>
                    </div>
                  </div>

                  <div className="max-w-lg">
                    <div className="glass-card rounded-[2rem] p-8 md:p-12 relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                      <div className="glow-corner absolute top-0 right-0 w-32 h-32 pointer-events-none" />
                      <div className="space-y-10 relative z-10">
                        <div>
                          <label className="text-xs font-semibold text-on-surface-variant mb-2 block uppercase tracking-widest">Full Name</label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Enter your legal name"
                            className="w-full bg-transparent border-0 border-b-2 border-surface-container-high focus:border-primary text-on-surface text-lg py-3 px-0 outline-none transition-colors placeholder:text-outline-variant"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-on-surface-variant mb-2 block uppercase tracking-widest">Username</label>
                          <div className="relative">
                            <span className="absolute left-0 top-3 text-primary font-bold">@</span>
                            <input
                              type="text"
                              value={username}
                              onChange={e => setUsername(e.target.value)}
                              placeholder="unique_handle"
                              className="w-full bg-transparent border-0 border-b-2 border-surface-container-high focus:border-primary text-on-surface text-lg py-3 pl-6 pr-0 outline-none transition-colors placeholder:text-outline-variant"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-on-surface-variant mb-2 block uppercase tracking-widest">Academic Level</label>
                          <CustomSelect
                            options={EDUCATION_LEVELS}
                            value={educationLevel}
                            onChange={setEduLevel}
                            placeholder="Select Grade"
                            variant="underline"
                          />
                        </div>
                        <button
                          onClick={() => setStep(2)}
                          disabled={!fullName.trim() || !educationLevel}
                          className="w-full h-16 rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary font-headline font-bold text-lg flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(161,250,255,0.3)] hover:shadow-[0_0_35px_rgba(161,250,255,0.5)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Continue <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-8 flex items-start gap-4 p-6 bg-surface-container-low/50 rounded-2xl border border-outline-variant/10">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        Our <span className="text-tertiary">neural core</span> uses your academic level to tailor your Zupiq experience, ensuring insights are perfectly calibrated for your journey.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Academic ──────────────────────────────────────── */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                  <div className="mb-10">
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <span className="text-secondary text-sm font-bold tracking-widest uppercase">Step 02 of 03</span>
                        <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight mt-2">
                          What are you studying?
                        </h1>
                      </div>
                      <span className="hidden md:block text-on-surface-variant text-sm">Academic Focus</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-gradient-to-r from-primary to-secondary rounded-full" />
                    </div>
                  </div>

                  <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search for subjects"
                      className="w-full bg-surface-container-low border-b-2 border-outline-variant focus:border-primary transition-colors py-4 pl-12 pr-6 text-on-surface placeholder:text-on-surface-variant outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(({ id, name, desc, Icon: SubIcon, gradient, color }) => {
                      const sel = selectedSubjects.includes(id);
                      return (
                        <motion.div
                          key={id}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => toggleSubject(id)}
                          className={`glass-card p-8 rounded-[2rem] border-2 relative overflow-hidden cursor-pointer transition-all duration-300 ${
                            sel ? 'border-primary/60 shadow-[0_0_30px_rgba(161,250,255,0.15)]' : 'border-transparent hover:border-outline-variant'
                          }`}
                        >
                          {sel && (
                            <div className="absolute top-4 right-4">
                              <CheckCircle2 className="w-5 h-5 text-primary fill-primary" />
                            </div>
                          )}
                          <div className={`mb-6 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                            gradient
                              ? 'bg-gradient-to-br from-primary to-secondary text-on-primary'
                              : `bg-surface-container-highest ${color}`
                          }`}>
                            <SubIcon className="w-7 h-7" />
                          </div>
                          <h3 className="text-xl font-headline font-bold text-on-surface mb-2">{name}</h3>
                          <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
                        </motion.div>
                      );
                    })}

                    {/* Add Other */}
                    <div className="p-8 rounded-[2rem] border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-surface-container-low transition-colors">
                      <div className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant mb-4 group-hover:border-primary group-hover:text-primary transition-colors">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-on-surface-variant font-medium text-sm">Add Other Subject</span>
                    </div>
                  </div>

                  <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <button
                      onClick={() => setStep(1)}
                      className="w-full sm:w-auto px-10 py-4 rounded-full text-on-surface font-medium border border-outline-variant hover:bg-surface-container transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={selectedSubjects.length === 0}
                      className="w-full sm:w-auto px-12 py-4 rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary font-bold shadow-[0_10px_20px_rgba(161,250,255,0.3)] hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      Continue <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Preferences ───────────────────────────────────── */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                  <header className="mb-12">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-primary font-headline text-sm tracking-widest uppercase">Step 3 of 3</span>
                      <div className="h-1.5 w-48 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full w-full bg-gradient-to-r from-primary to-secondary" />
                      </div>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-headline font-bold tracking-tight leading-none mb-4">
                      Finalize your{' '}
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-tertiary">
                        experience
                      </span>
                    </h1>
                    <p className="text-on-surface-variant text-lg max-w-xl">
                      Tailor how your neural assistant interacts with you. These settings can be adjusted at any time in your dashboard.
                    </p>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Controls */}
                    <div className="lg:col-span-8 space-y-6">
                      {/* Language */}
                      <div className="glass-card p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                        <label className="text-xs font-semibold text-on-surface-variant mb-4 flex items-center gap-2 uppercase tracking-widest">
                          <Globe className="w-4 h-4 text-primary" /> Primary Language
                        </label>
                        <div className="mt-2">
                          <CustomSelect
                            options={LANGUAGES}
                            value={language}
                            onChange={setLanguage}
                            variant="card"
                          />
                        </div>
                      </div>

                      {/* Toggles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-8 rounded-[2rem] flex flex-col justify-between h-48">
                          <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <AudioLines className="w-6 h-6 text-primary" />
                            </div>
                            <Toggle checked={aiVoice} onChange={() => setAiVoice(!aiVoice)} accent="primary" />
                          </div>
                          <div>
                            <h3 className="font-headline text-xl font-bold">AI Assistant Voice</h3>
                            <p className="text-sm text-on-surface-variant mt-1">Natural speech synthesis enabled</p>
                          </div>
                        </div>
                        <div className="glass-card p-8 rounded-[2rem] flex flex-col justify-between h-48">
                          <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                              <Bell className="w-6 h-6 text-secondary" />
                            </div>
                            <Toggle checked={reminders} onChange={() => setReminders(!reminders)} accent="secondary" />
                          </div>
                          <div>
                            <h3 className="font-headline text-xl font-bold">Daily Reminders</h3>
                            <p className="text-sm text-on-surface-variant mt-1">Push notifications at 09:00 AM</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right column */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-surface-container-low p-8 rounded-[2rem] relative overflow-hidden">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-secondary/10 blur-3xl rounded-full" />
                        <h4 className="font-headline text-lg font-bold mb-4">Quick Tip</h4>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          Students who enable <span className="text-primary font-semibold">Daily Reminders</span> are 45% more likely to achieve their learning targets within the first month.
                        </p>
                        <div className="mt-8 flex gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <div className="w-2 h-2 rounded-full bg-secondary" />
                          <div className="w-2 h-2 rounded-full bg-tertiary" />
                        </div>
                      </div>

                      {error && (
                        <p className="text-error text-sm bg-error/10 p-4 rounded-2xl">{error}</p>
                      )}

                      <button
                        onClick={handleFinish}
                        disabled={saving}
                        className="w-full py-6 rounded-full font-headline font-bold text-on-primary text-xl bg-gradient-to-r from-primary via-secondary to-secondary shadow-[0_15px_30px_rgba(161,250,255,0.3)] hover:scale-[1.02] active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {saving
                          ? <Loader2 className="w-6 h-6 animate-spin" />
                          : <><span>Finish Setup</span><Rocket className="w-6 h-6" /></>
                        }
                      </button>

                      <button
                        onClick={() => setStep(2)}
                        className="w-full py-4 rounded-full text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        <ArrowLeft className="w-4 h-4" /> Review Previous Steps
                      </button>
                    </div>
                  </div>

                  {/* Decorative orb */}
                  <div className="mt-20 flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 shadow-[0_0_40px_rgba(0,244,254,0.4)] flex items-center justify-center relative">
                      <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping" />
                      <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-end pb-6 px-4 bg-surface-container-highest/60 backdrop-blur-xl md:hidden rounded-t-[32px] shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
        {NAV_STEPS.map(({ label, Icon: NavIcon }, i) => {
          const isActive = (i + 1) === step;
          return (
            <div
              key={label}
              className={`flex flex-col items-center justify-center transition-transform active:scale-90 ${
                isActive
                  ? 'bg-gradient-to-tr from-primary to-secondary text-on-primary rounded-full w-12 h-12 mb-4 shadow-[0_0_15px_rgba(161,250,255,0.5)]'
                  : 'text-on-surface-variant pb-4'
              }`}
            >
              <NavIcon className="w-5 h-5" />
              {!isActive && <span className="text-[10px] uppercase tracking-widest mt-1">{label}</span>}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
