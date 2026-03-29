import React, { useState, useEffect, useRef, useCallback } from 'react';
// Re-mapping to Lucide icons
import { 
  Network, 
  Compass, 
  FlaskConical, 
  Sword, 
  Settings as SettingsIcon, 
  Zap, 
  CreditCard, 
  Sigma, 
  DraftingCompass, 
  BrainCircuit, 
  Microscope, 
  Lock as LockIcon, 
  Sparkles, 
  Pause as PauseIcon, 
  Play, 
  FastForward as FastForwardIcon, 
  RotateCcw, 
  Wind,
  Activity,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  CircleAlert,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundService } from '../../services/quantumPrismSoundService';
import { api, tokenStorage } from '../../lib/api';
import {
  type GameMode,
  type GameLanguage,
  type Problem,
  type SubjectType,
  type MasteryState,
  createInitialMasteryState,
  generateProblem,
  evaluateStepAnswer,
  applyMasteryAttempt,
  getMasteryPercent,
  getMasteryTrend,
  getWeakSubjects,
  getModeDifficultyBonus,
  getWrongPenalty,
  formatSubject,
  getSubjectCycleByMode,
  resolveGameLanguage,
} from './educationalEngine';

// --- Types ---
interface Tower {
  id: string;
  subject: SubjectType;
  name: string;
  cost: number;
  description: string;
  icon: React.ReactNode;
  color: string;
  locked?: boolean;
  level?: number;
  masteryRequired: number;
  range: number;
  fireRate: number;
  damage: number;
}

interface PlacedTower {
  id: string;
  type: string;
  x: number;
  y: number;
  icon: React.ReactNode;
  color: string;
  subject: SubjectType;
  lastFireTime: number;
}

type EnemyThreatType = 'logic_error' | 'noise' | 'bias' | 'complex';

interface Enemy {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  type: EnemyThreatType;
  label: string;
  pathIndex: number;
  segmentProgress: number;
  speed: number;
  reward: number;
  weakness: SubjectType;
  problem: Problem;
  currentStepIndex: number;
  stepAttempts: Record<string, number>;
}

interface AIGameProblemPayload {
  subject?: SubjectType;
  difficulty?: number;
  mode?: GameMode;
  question?: string;
  steps?: Array<{
    prompt?: string;
    options?: string[];
    correct?: string;
    hint?: string;
  }>;
  explanation?: string;
}

// --- Constants ---
const PATH_POINTS = [
  { x: -50, y: 400 },
  { x: 200, y: 400 },
  { x: 400, y: 200 },
  { x: 700, y: 200 },
  { x: 900, y: 600 },
  { x: 1250, y: 600 }
];

const TOWER_TEMPLATES: Tower[] = [
  {
    id: 'calculus',
    subject: 'math',
    name: 'Calculus',
    cost: 450,
    description: 'Sustained integration damage to group enemies.',
    icon: <Sigma className="w-6 h-6" />,
    color: 'text-primary',
    masteryRequired: 1,
    range: 200,
    fireRate: 800,
    damage: 5,
  },
  {
    id: 'physics',
    subject: 'physics',
    name: 'Physics',
    cost: 600,
    description: 'Kinetic impact. Greatly slows down fast gaps.',
    icon: <DraftingCompass className="w-6 h-6" />,
    color: 'text-secondary',
    masteryRequired: 2,
    range: 150,
    fireRate: 1500,
    damage: 15,
  },
  {
    id: 'logic',
    subject: 'logic',
    name: 'Formal Logic',
    cost: 320,
    description: 'Precision strike. High damage to solo targets.',
    icon: <BrainCircuit className="w-6 h-6" />,
    color: 'text-tertiary',
    masteryRequired: 1,
    range: 250,
    fireRate: 500,
    damage: 8,
  },
  {
    id: 'biocode',
    subject: 'bio',
    name: 'Bio-Code',
    cost: 920,
    description: 'Adaptive pulse beam with high precision uptime.',
    icon: <Microscope className="w-6 h-6" />,
    color: 'text-on-surface-variant',
    locked: true,
    level: 22,
    masteryRequired: 4,
    range: 300,
    fireRate: 400,
    damage: 20,
  },
];

interface Beam {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

interface WaveDefinition {
  enemyCount: number;
  spawnIntervalMs: number;
  enemyHealth: number;
  enemySpeed: number;
  reward: number;
  enemyType: EnemyThreatType;
}

type GamePhase = 'running' | 'won' | 'lost';
type ProblemFeedbackTone = 'neutral' | 'success' | 'error';

interface QuantumPrismPageProps {
  onNavigateStudy?: () => void;
}

const TOTAL_WAVES = 50;
const BASE_INTEGRITY_START = 20;
const INTER_WAVE_DELAY_MS = 2200;

const ENEMY_TYPE_LABEL: Record<EnemyThreatType, string> = {
  logic_error: 'Logic Error',
  noise: 'Noise Spike',
  bias: 'Bias Phantom',
  complex: 'Complex Knot',
};

const SUBJECT_THEME: Record<SubjectType, string> = {
  math: 'text-primary',
  physics: 'text-secondary',
  logic: 'text-tertiary',
  bio: 'text-emerald-300',
};

const SUBJECT_THREAT: Record<SubjectType, EnemyThreatType> = {
  math: 'complex',
  physics: 'noise',
  logic: 'logic_error',
  bio: 'bias',
};

function makeProblemUid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

function dedupeOptions(options: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];
  options.forEach((option) => {
    const key = option.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(option.trim());
  });
  return deduped;
}

function buildProblemFromAIPayload(
  payload: AIGameProblemPayload | null | undefined,
  fallbackSubject: SubjectType,
  fallbackDifficulty: number,
): Problem | null {
  if (!payload) return null;
  const question = typeof payload.question === 'string' ? payload.question.trim() : '';
  if (!question) return null;

  const subject: SubjectType = payload.subject && ['math', 'physics', 'logic', 'bio'].includes(payload.subject)
    ? payload.subject
    : fallbackSubject;
  const difficultyRaw = typeof payload.difficulty === 'number' ? payload.difficulty : fallbackDifficulty;
  const difficulty = Math.max(1, Math.min(10, Math.floor(difficultyRaw)));
  const explanation = typeof payload.explanation === 'string' && payload.explanation.trim().length > 0
    ? payload.explanation.trim()
    : 'Solve step by step and verify each relation.';

  const steps = Array.isArray(payload.steps)
    ? payload.steps
      .slice(0, 4)
      .map((step, index) => {
        const prompt = typeof step?.prompt === 'string' ? step.prompt.trim() : '';
        const correctRaw = typeof step?.correct === 'string' ? step.correct.trim() : '';
        if (!prompt || !correctRaw) return null;

        const optionsRaw = Array.isArray(step.options)
          ? step.options.map((option) => `${option ?? ''}`.trim()).filter(Boolean)
          : [];
        let options = dedupeOptions(optionsRaw);
        if (!options.some((option) => option.trim().toLowerCase() === correctRaw.toLowerCase())) {
          options = [correctRaw, ...options];
        }
        options = dedupeOptions(options).slice(0, 4);
        if (options.length < 2) return null;

        const correct = options.find((option) => option.trim().toLowerCase() === correctRaw.toLowerCase()) ?? options[0];
        const hint = typeof step?.hint === 'string' && step.hint.trim().length > 0
          ? step.hint.trim()
          : 'Re-check the key relation first.';

        return {
          id: makeProblemUid(`${subject}-step-${index + 1}`),
          prompt,
          options,
          correct,
          hint,
        };
      })
      .filter((step): step is Problem['steps'][number] => Boolean(step))
    : [];

  if (steps.length === 0) return null;

  return {
    id: makeProblemUid(`${subject}-problem`),
    subject,
    difficulty,
    question,
    steps,
    correctAnswer: steps[steps.length - 1]?.correct ?? '',
    explanation,
  };
}

function readStoredLanguagePreference(): string | null {
  try {
    const user = tokenStorage.getUser();
    if (user && typeof user.language === 'string' && user.language.trim().length > 0) {
      return user.language.trim();
    }
    const persisted = localStorage.getItem('zupiq_language');
    if (typeof persisted === 'string' && persisted.trim().length > 0) {
      return persisted.trim();
    }
  } catch {
    // Ignore storage access failures and fallback to default language.
  }
  return null;
}

const createInitialTowers = (): PlacedTower[] => ([
  { id: 'initial-1', type: 'calculus', x: 450, y: 100, icon: <Sigma className="w-8 h-8" />, color: 'text-primary', subject: 'math', lastFireTime: 0 },
  { id: 'initial-2', type: 'logic', x: 750, y: 400, icon: <BrainCircuit className="w-8 h-8" />, color: 'text-tertiary', subject: 'logic', lastFireTime: 0 },
]);

const createWaveDefinition = (wave: number): WaveDefinition => {
  const safeWave = Math.max(1, wave);
  const enemyTypes: EnemyThreatType[] = ['logic_error', 'noise', 'bias', 'complex'];
  return {
    enemyCount: Math.min(6 + Math.floor(safeWave * 1.2), 28),
    spawnIntervalMs: Math.max(420, 1400 - safeWave * 14),
    enemyHealth: Math.floor(10 + safeWave * 2.5 + Math.pow(safeWave, 1.16)),
    enemySpeed: Math.min(0.0026 + safeWave * 0.000075, 0.01),
    reward: Math.floor(18 + safeWave * 1.9),
    enemyType: enemyTypes[(safeWave - 1) % enemyTypes.length],
  };
};

// --- Components ---

const TopNav = ({
  energy,
  isMuted,
  onToggleMute,
  wave,
  totalWaves,
  waveProgressRatio,
  baseIntegrity,
  phase,
  onNavigateStudy,
}: {
  energy: number;
  isMuted: boolean;
  onToggleMute: () => void;
  wave: number;
  totalWaves: number;
  waveProgressRatio: number;
  baseIntegrity: number;
  phase: GamePhase;
  onNavigateStudy?: () => void;
}) => (
  <header className="fixed top-0 w-full z-50 bg-slate-950/60 backdrop-blur-xl shadow-[0_0_20px_rgba(0,245,255,0.1)] flex justify-between items-center px-6 py-3">
    <div className="flex items-center gap-4">
      <span
        onClick={onNavigateStudy}
        className={`text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 font-headline ${
          onNavigateStudy ? 'cursor-pointer' : ''
        }`}
      >
        Zupiq
      </span>
      <div className="h-6 w-[1px] bg-white/10 hidden md:block"></div>
      <div className="hidden md:flex gap-6 items-center">
        <span className="text-primary font-bold font-headline tracking-tight text-sm uppercase cursor-pointer">Nexus</span>
        <span
          onClick={onNavigateStudy}
          className={`text-slate-400 hover:bg-primary/10 hover:text-primary transition-all font-headline tracking-tight text-sm uppercase px-2 py-1 rounded-lg ${
            onNavigateStudy ? 'cursor-pointer' : ''
          }`}
        >
          Campaign
        </span>
        <span className="text-slate-400 hover:bg-primary/10 hover:text-primary transition-all font-headline tracking-tight text-sm uppercase cursor-pointer px-2 py-1 rounded-lg">Laboratories</span>
      </div>
    </div>

    <div className="flex items-center gap-8">
      <div className="flex flex-col items-end">
        <span className="text-[10px] uppercase tracking-widest text-slate-400 font-headline">Wave Status</span>
        <div className="flex items-center gap-2">
          <span className="text-secondary font-bold font-headline text-lg">
            {phase === 'won' ? 'Cleared' : phase === 'lost' ? 'Breach' : `${wave} / ${totalWaves}`}
          </span>
          <div className="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, Math.min(100, waveProgressRatio * 100))}%` }}
              className="bg-gradient-to-r from-primary to-secondary h-full" 
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2 rounded-full border border-white/5">
        <Zap className="w-4 h-4 text-primary fill-primary" />
        <div className="flex flex-col leading-none">
          <span className="text-xs text-slate-400 font-label">Neural Energy</span>
          <span className="text-primary font-bold font-headline">{energy.toLocaleString()} XP</span>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-3 bg-surface-container-high px-4 py-2 rounded-full border border-white/5">
        <Activity className="w-4 h-4 text-error" />
        <div className="flex flex-col leading-none">
          <span className="text-xs text-slate-400 font-label">Core Integrity</span>
          <span className="text-error font-bold font-headline">{Math.max(0, baseIntegrity)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <button 
          onClick={() => {
            onToggleMute();
            soundService.play('UI_CLICK');
          }}
          onMouseEnter={() => soundService.play('UI_HOVER')}
          className="p-2 rounded-full hover:bg-primary/10 text-slate-400 transition-all active:scale-90"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button 
          onMouseEnter={() => soundService.play('UI_HOVER')}
          onClick={() => soundService.play('UI_CLICK')}
          className="p-2 rounded-full hover:bg-primary/10 text-slate-400 transition-all active:scale-90"
        >
          <CreditCard className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-primary/20 flex items-center justify-center overflow-hidden">
          <img 
            alt="Commander Profile" 
            className="w-full h-full object-cover" 
            src="https://picsum.photos/seed/commander/100/100"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  </header>
);

const Sidebar = ({
  onUpgrade,
  onNavigateStudy,
}: {
  onUpgrade: () => void;
  onNavigateStudy?: () => void;
}) => (
  <aside className="h-screen w-64 fixed left-0 top-0 z-40 bg-slate-950/60 backdrop-blur-2xl shadow-[10px_0_30px_rgba(0,0,0,0.5)] flex flex-col p-4 pt-24 hidden lg:flex">
    <div className="space-y-2 flex-grow">
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-r-2 border-primary flex items-center gap-4 px-4 py-3 cursor-pointer group transition-all duration-300">
        <Network className="w-5 h-5" />
        <span className="font-headline uppercase tracking-widest text-xs">Nexus</span>
      </div>
      {[
        { icon: <Compass className="w-5 h-5" />, label: 'Campaign', action: onNavigateStudy },
        { icon: <FlaskConical className="w-5 h-5" />, label: 'Laboratories' },
        { icon: <Sword className="w-5 h-5" />, label: 'Arsenal' },
        { icon: <SettingsIcon className="w-5 h-5" />, label: 'Settings' },
      ].map((item) => (
        <div 
          key={item.label} 
          onMouseEnter={() => soundService.play('UI_HOVER')}
          onClick={() => {
            item.action?.();
            soundService.play('UI_CLICK');
          }}
          className="text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 flex items-center gap-4 px-4 py-3 cursor-pointer group transition-all duration-300"
        >
          {item.icon}
          <span className="font-headline uppercase tracking-widest text-xs">{item.label}</span>
        </div>
      ))}
    </div>

    <div className="mt-auto pt-6 border-t border-white/5">
      <div className="p-4 rounded-xl bg-surface-container border border-primary/10 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-tertiary font-headline uppercase tracking-tighter">Current Rank</span>
          <span className="text-[10px] text-slate-400">Top 2%</span>
        </div>
        <p className="text-on-surface font-headline font-bold text-sm">Quantum Tier</p>
        <div className="mt-2 h-1 bg-surface-container-lowest rounded-full">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '66%' }}
            className="h-full bg-tertiary rounded-full shadow-[0_0_8px_rgba(202,253,0,0.5)]" 
          />
        </div>
      </div>
      <button 
        onMouseEnter={() => soundService.play('UI_HOVER')}
        onClick={() => {
          onUpgrade();
          soundService.play('ENERGY_GAIN');
        }}
        className="w-full py-3 bg-gradient-to-r from-primary to-secondary rounded-full text-slate-900 font-headline font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform duration-200"
      >
        Upgrade Prism
      </button>
    </div>
  </aside>
);

const NeuralMap = ({ 
  towers, 
  enemies, 
  beams,
  onEnemyClick, 
  onMapClick 
}: { 
  towers: PlacedTower[], 
  enemies: Enemy[], 
  beams: Beam[],
  onEnemyClick: (id: string) => void,
  onMapClick: (x: number, y: number) => void
}) => (
  <div 
    className="absolute inset-0 overflow-hidden cursor-crosshair [background-image:linear-gradient(to_right,rgba(0,244,254,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,244,254,0.05)_1px,transparent_1px)] [background-size:40px_40px]"
    onClick={(e) => {
      // Basic coordinate mapping for demo
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onMapClick(x, y);
    }}
  >
    {/* Background Blobs */}
    <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-secondary/10 blur-[120px] rounded-full"></div>
    <div className="absolute bottom-[-10%] left-[5%] w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full"></div>

    {/* Path Layer */}
    <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 1200 800">
      <path 
        d="M -50 400 L 200 400 L 400 200 L 700 200 L 900 600 L 1250 600" 
        fill="none" 
        stroke="url(#pathGradient)" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth="80"
      />
      <defs>
        <linearGradient id="pathGradient" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" style={{ stopColor: 'rgba(25, 37, 64, 0.5)' }} />
          <stop offset="50%" style={{ stopColor: 'rgba(161, 250, 255, 0.1)' }} />
          <stop offset="100%" style={{ stopColor: 'rgba(25, 37, 64, 0.5)' }} />
        </linearGradient>
      </defs>
      
      {/* Beams */}
      {beams.map(beam => (
        <line 
          key={beam.id}
          x1={beam.startX}
          y1={beam.startY}
          x2={beam.endX}
          y2={beam.endY}
          stroke={beam.color}
          strokeWidth="2"
          strokeDasharray="4 2"
          className="animate-pulse"
        />
      ))}
    </svg>

    {/* Enemies */}
    <AnimatePresence>
      {enemies.map((enemy) => (
        <motion.div 
          key={enemy.id}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            e.stopPropagation();
            onEnemyClick(enemy.id);
            soundService.play('UI_CLICK');
          }}
          style={{ left: enemy.x, top: enemy.y }}
          className="absolute flex items-center justify-center cursor-pointer group"
        >
          <div className="w-12 h-12 bg-error/20 border border-error rounded-lg rotate-45 flex items-center justify-center [box-shadow:0_0_20px_rgba(255,81,250,0.2)] group-hover:bg-error/40 transition-colors">
            <Activity className="w-6 h-6 text-error rotate-[-45deg]" />
          </div>
          <div className="absolute -top-10 left-0 w-24 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-error transition-all duration-200" 
                style={{ width: `${(enemy.health / enemy.maxHealth) * 100}%` }}
              />
            </div>
            <span className="bg-surface-container-highest/80 px-2 py-0.5 rounded text-[10px] text-error font-headline uppercase whitespace-nowrap">
              {enemy.label}
            </span>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>

    {/* Towers */}
    <AnimatePresence>
      {towers.map((tower) => (
        <motion.div 
          key={tower.id}
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          style={{ left: tower.x - 32, top: tower.y - 48 }}
          className="absolute"
        >
          <div className="relative group cursor-pointer">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              onMouseEnter={() => soundService.play('UI_HOVER')}
              className={`w-16 h-24 bg-white/10 backdrop-blur-md border border-white/40 rounded-xl flex items-center justify-center ${tower.color === 'text-primary' ? '[box-shadow:0_0_20px_rgba(161,250,255,0.2)]' : ''}`}
            >
              <div className="flex flex-col items-center">
                <div className={tower.color}>{tower.icon}</div>
                <div className={`w-8 h-1 bg-white/20 rounded-full mt-1`}></div>
              </div>
            </motion.div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/5 rounded-full bg-white/5 pointer-events-none"></div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>

    {/* Overlay Status */}
    <div className="fixed top-24 left-72 pointer-events-none">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#a1faff]"></div>
          <span className="text-[10px] font-headline uppercase tracking-tighter text-primary">Neural Stream Active</span>
        </div>
        <div className="flex items-center gap-2 opacity-50">
          <div className="w-2 h-2 rounded-full bg-slate-400"></div>
          <span className="text-[10px] font-headline uppercase tracking-tighter text-slate-400">Syncing Quantum Core...</span>
        </div>
      </div>
    </div>
  </div>
);

const ArsenalPanel = ({ 
  selectedTowerId, 
  onSelectTower, 
  energy,
  wave,
  phase,
  mode,
  onModeChange,
  mastery,
  weakSubjects,
}: { 
  selectedTowerId: string | null, 
  onSelectTower: (id: string) => void,
  energy: number,
  wave: number,
  phase: GamePhase,
  mode: GameMode,
  onModeChange: (mode: GameMode) => void,
  mastery: MasteryState,
  weakSubjects: SubjectType[],
}) => (
  <div className="absolute right-8 top-8 bottom-24 w-80 bg-[#192540]/60 backdrop-blur-xl rounded-3xl border border-white/10 p-6 flex flex-col z-10">
    <div className="mb-8">
      <h2 className="font-headline text-2xl font-bold tracking-tight text-white mb-1">Concept Arsenal</h2>
      <p className="text-slate-400 text-xs font-label">Answer correctly to fire towers.</p>
    </div>

    <div className="mb-5 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-surface-container/60 p-1">
      {([
        { id: 'learn' as GameMode, label: 'Learn' },
        { id: 'practice' as GameMode, label: 'Practice' },
        { id: 'challenge' as GameMode, label: 'Challenge' },
      ]).map((item) => (
        <button
          key={item.id}
          onClick={() => onModeChange(item.id)}
          className={`rounded-xl px-2 py-2 text-[10px] uppercase tracking-widest font-headline transition-colors ${
            mode === item.id
              ? 'bg-primary/20 text-primary'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>

    <div className="space-y-4 flex-grow overflow-y-auto pr-2 scrollbar-thin">
      {TOWER_TEMPLATES.map((tower) => {
        const unlockWave = tower.level ?? 0;
        const isLocked = Boolean(tower.locked) && wave < unlockWave;
        const canAfford = energy >= tower.cost;
        const masteryReady = mastery[tower.subject].level >= tower.masteryRequired;
        const canDeploy = phase === 'running' && !isLocked && canAfford && masteryReady;

        return (
        <motion.div 
          key={tower.id}
          whileHover={{ x: 4 }}
          onClick={() => {
            if (canDeploy) {
              onSelectTower(tower.id);
              soundService.play('UI_CLICK');
            }
          }}
          onMouseEnter={() => !isLocked && soundService.play('UI_HOVER')}
          className={`p-4 rounded-2xl bg-surface-container hover:bg-surface-container-high border transition-all active:scale-95 ${
            selectedTowerId === tower.id ? 'border-primary bg-primary/5' : 'border-white/5'
          } ${!canDeploy ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex gap-4 items-center">
            <div className={`w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/10 transition-colors ${tower.color}`}>
              {tower.icon}
            </div>
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <h3 className="font-headline font-bold text-white">{tower.name}</h3>
                {isLocked ? (
                  <LockIcon className="w-3 h-3 text-slate-400" />
                ) : (
                  <span className={`${tower.color} font-headline text-xs`}>{tower.cost}</span>
                )}
              </div>
              <p className="text-slate-400 text-[10px] leading-tight mt-1">
                {isLocked
                  ? `Unlocks at Wave ${unlockWave}`
                  : !masteryReady
                    ? `Requires ${formatSubject(tower.subject)} Level ${tower.masteryRequired}`
                    : tower.description}
              </p>
            </div>
          </div>
        </motion.div>
        );
      })}
    </div>

    <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase font-headline tracking-widest text-primary">Mastery Board</p>
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      {(Object.keys(mastery) as SubjectType[]).map((subject) => {
        const stat = mastery[subject];
        const percent = getMasteryPercent(stat);
        const trend = getMasteryTrend(stat);
        return (
          <div key={subject} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className={`font-headline uppercase tracking-wider ${SUBJECT_THEME[subject]}`}>
                {formatSubject(subject)}
              </span>
              <span className="text-on-surface-variant">{percent}% · L{stat.level}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${percent}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
              <span>Attempts {stat.attempts}</span>
              <span className="flex items-center gap-1">
                {trend === 'up'
                  ? <TrendingUp className="w-3 h-3 text-emerald-300" />
                  : trend === 'down'
                    ? <TrendingDown className="w-3 h-3 text-error" />
                    : <Minus className="w-3 h-3" />}
                {trend}
              </span>
            </div>
          </div>
        );
      })}
      <div className="pt-1 text-[10px] text-on-surface-variant">
        Weak areas:
        <span className="ml-1 text-tertiary font-medium">
          {weakSubjects.map((subject) => formatSubject(subject)).join(', ')}
        </span>
      </div>
      <div className="text-[10px] text-on-surface-variant leading-relaxed">
        No reward without solving. Enemy click opens a question step.
      </div>
    </div>
  </div>
);

const ProblemModal = ({
  enemy,
  mode,
  answerDraft,
  selectedOption,
  feedback,
  busy,
  onClose,
  onAnswerDraftChange,
  onSelectOption,
  onSubmit,
}: {
  enemy: Enemy | null;
  mode: GameMode;
  answerDraft: string;
  selectedOption: string;
  feedback: { tone: ProblemFeedbackTone; message: string } | null;
  busy: boolean;
  onClose: () => void;
  onAnswerDraftChange: (value: string) => void;
  onSelectOption: (value: string) => void;
  onSubmit: () => void;
}) => {
  if (!enemy) return null;
  const step = enemy.problem.steps[enemy.currentStepIndex];
  const stepTotal = enemy.problem.steps.length;
  const stepNumber = enemy.currentStepIndex + 1;
  const answer = step.options?.length ? selectedOption : answerDraft;
  const canSubmit = answer.trim().length > 0 && !busy;
  const toneClass = feedback?.tone === 'success'
    ? 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30'
    : feedback?.tone === 'error'
      ? 'text-red-200 bg-error/10 border-error/30'
      : 'text-on-surface-variant bg-surface-container border-white/10';
  const clampTwoLines = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  } as const;
  const clampOneLine = {
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  } as const;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[85] pointer-events-none flex justify-center p-3 sm:p-4">
      <div className="pointer-events-auto w-[min(96vw,820px)] rounded-2xl border border-white/10 bg-surface-container-high/95 shadow-2xl">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-primary/15 text-primary px-2 py-1 text-[10px] font-semibold uppercase tracking-widest">Problem</span>
            <span className="text-xs text-on-surface-variant">{enemy.label}</span>
            <span className="text-xs text-on-surface-variant">{formatSubject(enemy.problem.subject)}</span>
            <span className="text-xs text-on-surface-variant">S{stepNumber}/{stepTotal}</span>
            <span className="text-xs text-on-surface-variant">{mode.toUpperCase()}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <p
            title={enemy.problem.question}
            style={clampTwoLines}
            className="text-sm leading-snug text-on-surface"
          >
            {enemy.problem.question}
          </p>
          <p
            title={step.prompt}
            style={clampOneLine}
            className="text-xs text-on-surface-variant"
          >
            Step {stepNumber}: {step.prompt}
          </p>

          {step.options?.length ? (
            <div className="flex flex-wrap gap-2">
              {step.options.map((option) => (
                <button
                  key={option}
                  onClick={() => onSelectOption(option)}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    selectedOption === option
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-white/10 bg-surface-container text-on-surface hover:border-white/20'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={answerDraft}
                onChange={(e) => onAnswerDraftChange(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 rounded-lg border border-white/15 bg-surface-container px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={onSubmit}
                disabled={!canSubmit}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-slate-900 font-headline font-bold text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? '...' : 'Submit'}
              </button>
            </div>
          )}

          {feedback && (
            <div className={`rounded-lg border px-3 py-2 text-xs flex items-start gap-2 ${toneClass}`}>
              {feedback.tone === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />}
              <p>{feedback.message}</p>
            </div>
          )}

          {!!step.options?.length && (
            <div className="flex justify-end">
              <button
                onClick={onSubmit}
                disabled={!canSubmit}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-slate-900 font-headline font-bold text-[10px] uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? 'Evaluating...' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ControlBar = ({ 
  onReset, 
  isPaused, 
  onTogglePause,
  onPrimaryAction,
  onCycleSpeed,
  gameSpeed,
  phase,
}: { 
  onReset: () => void, 
  isPaused: boolean, 
  onTogglePause: () => void,
  onPrimaryAction: () => void,
  onCycleSpeed: () => void,
  gameSpeed: 1 | 2 | 3,
  phase: GamePhase,
}) => (
  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 lg:translate-x-[-32%] bg-[#192540]/60 backdrop-blur-xl px-8 py-4 rounded-full border border-white/10 flex items-center gap-12 z-10 shadow-2xl">
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-headline uppercase tracking-widest text-slate-400">Session Control</span>
    </div>
    <div className="flex items-center gap-6">
      <button 
        onMouseEnter={() => soundService.play('UI_HOVER')}
        onClick={() => {
          if (phase !== 'running') return;
          onTogglePause();
          soundService.play('UI_CLICK');
        }}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 ${isPaused ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-primary hover:bg-primary/10'}`}
      >
        {isPaused ? <Play className="w-6 h-6 fill-current" /> : <PauseIcon className="w-6 h-6" />}
      </button>
      <button 
        onMouseEnter={() => soundService.play('UI_HOVER')}
        onClick={() => {
          onPrimaryAction();
          soundService.play('UI_CLICK');
        }}
        className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-tr from-primary to-secondary text-slate-900 shadow-[0_0_30px_rgba(161,250,255,0.4)] hover:scale-110 active:scale-95 transition-all"
      >
        {phase === 'running' ? (
          <Play className="w-8 h-8 fill-current" />
        ) : (
          <RotateCcw className="w-8 h-8" />
        )}
      </button>
      <button 
        onMouseEnter={() => soundService.play('UI_HOVER')}
        onClick={() => {
          onCycleSpeed();
          soundService.play('UI_CLICK');
        }}
        className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-secondary hover:bg-secondary/10 transition-all active:scale-90"
      >
        <div className="relative">
          <FastForwardIcon className="w-6 h-6" />
          <span className="absolute -bottom-3 -right-2 text-[9px] font-bold text-secondary">{gameSpeed}x</span>
        </div>
      </button>
    </div>
    <div className="h-8 w-[1px] bg-white/10"></div>
    <button 
      onMouseEnter={() => soundService.play('UI_HOVER')}
      onClick={() => {
        onReset();
        soundService.play('UI_CLICK');
      }}
      className="flex items-center gap-2 text-xs font-headline uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
    >
      <RotateCcw className="w-4 h-4" />
      Reset
    </button>
  </div>
);

const FloatingOrb = () => (
  <motion.div 
    animate={{ 
      boxShadow: [
        '0 0 20px rgba(0, 244, 254, 0.4)',
        '0 0 40px rgba(255, 81, 250, 0.4)',
        '0 0 20px rgba(0, 244, 254, 0.4)'
      ]
    }}
    transition={{ duration: 4, repeat: Infinity }}
    onMouseEnter={() => soundService.play('UI_HOVER')}
    onClick={() => soundService.play('UI_CLICK')}
    className="fixed bottom-12 right-12 w-16 h-16 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 flex items-center justify-center z-50 cursor-pointer group"
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
    >
      <Wind className="w-8 h-8 text-primary" />
    </motion.div>
    <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20"></div>
  </motion.div>
);

export default function QuantumPrismPage({ onNavigateStudy }: QuantumPrismPageProps) {
  const [energy, setEnergy] = useState(2450);
  const [isMuted, setIsMuted] = useState(soundService.getMuteStatus());
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [mode, setMode] = useState<GameMode>('practice');
  const [mastery, setMastery] = useState<MasteryState>(() => createInitialMasteryState());
  const [placedTowers, setPlacedTowers] = useState<PlacedTower[]>(() => createInitialTowers());
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [beams, setBeams] = useState<Beam[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<GamePhase>('running');
  const [baseIntegrity, setBaseIntegrity] = useState(BASE_INTEGRITY_START);
  const [gameSpeed, setGameSpeed] = useState<1 | 2 | 3>(1);
  const [wave, setWave] = useState(1);
  const [waveSpawned, setWaveSpawned] = useState(0);
  const [waveTarget, setWaveTarget] = useState(() => createWaveDefinition(1).enemyCount);
  const [timeToNextWaveMs, setTimeToNextWaveMs] = useState(0);
  const [activeEnemyId, setActiveEnemyId] = useState<string | null>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [problemBusy, setProblemBusy] = useState(false);
  const [problemFeedback, setProblemFeedback] = useState<{ tone: ProblemFeedbackTone; message: string } | null>(null);

  const waveRef = useRef(1);
  const waveConfigRef = useRef<WaveDefinition>(createWaveDefinition(1));
  const spawnTimerRef = useRef(waveConfigRef.current.spawnIntervalMs);
  const spawnedInWaveRef = useRef(0);
  const interWaveTimerRef = useRef(0);
  const worldTimeRef = useRef(0);
  const placedTowersRef = useRef<PlacedTower[]>(createInitialTowers());
  const enemiesRef = useRef<Enemy[]>([]);
  const modeRef = useRef<GameMode>(mode);
  const masteryRef = useRef<MasteryState>(mastery);
  const weakSubjectsRef = useRef<SubjectType[]>(getWeakSubjects(mastery));
  const modalAutoPausedRef = useRef(false);
  const languageRef = useRef<GameLanguage>(resolveGameLanguage(readStoredLanguagePreference()));
  const aiProblemCacheRef = useRef<Record<string, Problem[]>>({});
  const aiProblemInFlightRef = useRef<Record<string, Promise<void>>>({});

  useEffect(() => {
    placedTowersRef.current = placedTowers;
  }, [placedTowers]);

  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    masteryRef.current = mastery;
    weakSubjectsRef.current = getWeakSubjects(mastery);
  }, [mastery]);

  useEffect(() => {
    languageRef.current = resolveGameLanguage(readStoredLanguagePreference());
  }, []);

  const ensureAiProblemCache = useCallback((subject: SubjectType, difficulty: number, mode: GameMode) => {
    const key = `${subject}:${difficulty}:${mode}`;
    const existing = aiProblemCacheRef.current[key] ?? [];
    if (existing.length >= 2) return;
    if (aiProblemInFlightRef.current[key]) return;

    const inFlight = (async () => {
      try {
        const response = await api.post<{ problem: AIGameProblemPayload }>('/api/ai/game-problem', {
          subject,
          difficulty,
          mode,
        });
        const parsed = buildProblemFromAIPayload(response?.problem, subject, difficulty);
        if (!parsed) return;
        const bucket = aiProblemCacheRef.current[key] ?? [];
        aiProblemCacheRef.current[key] = [...bucket, parsed].slice(-4);
      } catch {
        // Keep local fallback problems when AI generation fails or is rate-limited.
      } finally {
        delete aiProblemInFlightRef.current[key];
      }
    })();

    aiProblemInFlightRef.current[key] = inFlight;
  }, []);

  const getSpawnProblem = useCallback((subject: SubjectType, difficulty: number): Problem => {
    const mode = modeRef.current;
    const key = `${subject}:${difficulty}:${mode}`;
    const bucket = aiProblemCacheRef.current[key] ?? [];
    if (bucket.length > 0) {
      const next = bucket.shift();
      aiProblemCacheRef.current[key] = bucket;
      ensureAiProblemCache(subject, difficulty, mode);
      if (next) {
        const cloned = buildProblemFromAIPayload(
          {
            subject: next.subject,
            difficulty: next.difficulty,
            mode,
            question: next.question,
            steps: next.steps.map((step) => ({
              prompt: step.prompt,
              options: step.options,
              correct: step.correct,
              hint: step.hint,
            })),
            explanation: next.explanation,
          },
          subject,
          difficulty
        );
        if (cloned) return cloned;
      }
    }

    ensureAiProblemCache(subject, difficulty, mode);
    return generateProblem(subject, difficulty, languageRef.current);
  }, [ensureAiProblemCache]);

  const createEnemyFromWave = useCallback((waveNumber: number, spawnIndex: number, config: WaveDefinition): Enemy => {
    const subjectCycle = getSubjectCycleByMode(modeRef.current);
    const weakPool = weakSubjectsRef.current;
    const shouldUseWeakFocus = modeRef.current !== 'learn' && weakPool.length > 0 && Math.random() < 0.45;
    const subject = shouldUseWeakFocus
      ? weakPool[spawnIndex % weakPool.length]
      : subjectCycle[(waveNumber + spawnIndex) % subjectCycle.length];
    const difficulty = Math.max(
      1,
      Math.min(10, Math.floor(waveNumber / 4) + 3 + getModeDifficultyBonus(modeRef.current))
    );
    const problem = getSpawnProblem(subject, difficulty);
    const type = waveNumber % 4 === 0 ? config.enemyType : SUBJECT_THREAT[subject];
    const health = Math.floor(config.enemyHealth * (1 + difficulty * 0.05));

    return {
      id: `enemy-${waveNumber}-${Date.now()}-${spawnIndex}`,
      x: PATH_POINTS[0].x,
      y: PATH_POINTS[0].y,
      health,
      maxHealth: health,
      type,
      label: ENEMY_TYPE_LABEL[type],
      pathIndex: 0,
      segmentProgress: 0,
      speed: config.enemySpeed * (0.9 + Math.random() * 0.2),
      reward: Math.floor(config.reward + difficulty * 2),
      weakness: subject,
      problem,
      currentStepIndex: 0,
      stepAttempts: {},
    };
  }, [getSpawnProblem]);

  const startWave = useCallback((nextWave: number) => {
    const boundedWave = Math.max(1, Math.min(TOTAL_WAVES, nextWave));
    const nextConfig = createWaveDefinition(boundedWave);
    waveRef.current = boundedWave;
    waveConfigRef.current = nextConfig;
    spawnTimerRef.current = nextConfig.spawnIntervalMs;
    spawnedInWaveRef.current = 0;
    interWaveTimerRef.current = 0;

    setWave(boundedWave);
    setWaveSpawned(0);
    setWaveTarget(nextConfig.enemyCount);
    setTimeToNextWaveMs(0);
  }, []);

  useEffect(() => {
    startWave(1);
  }, [startWave]);

  // Game Loop
  useEffect(() => {
    if (phase !== 'running' || isPaused) return;

    let lastTime = performance.now();
    let frameId = 0;

    const loop = (time: number) => {
      const deltaTime = (time - lastTime) * gameSpeed;
      lastTime = time;
      worldTimeRef.current += deltaTime;
      const waveConfig = waveConfigRef.current;

      let escapedEnemyCount = 0;
      let updatedEnemies = enemiesRef.current
        .map((enemy) => {
          const nextIndex = enemy.pathIndex + 1;
          if (nextIndex >= PATH_POINTS.length) {
            escapedEnemyCount += 1;
            return null;
          }

          const start = PATH_POINTS[enemy.pathIndex];
          const end = PATH_POINTS[nextIndex];
          const newProgress = enemy.segmentProgress + enemy.speed * (deltaTime / 16.666);

          if (newProgress >= 1) {
            if (nextIndex >= PATH_POINTS.length - 1) {
              escapedEnemyCount += 1;
              return null;
            }
            return {
              ...enemy,
              pathIndex: nextIndex,
              segmentProgress: 0,
              x: end.x,
              y: end.y,
            };
          }

          return {
            ...enemy,
            segmentProgress: newProgress,
            x: start.x + (end.x - start.x) * newProgress,
            y: start.y + (end.y - start.y) * newProgress,
          };
        })
        .filter((enemy): enemy is Enemy => Boolean(enemy) && enemy.health > 0);

      if (escapedEnemyCount > 0) {
        setBaseIntegrity((prev) => {
          const nextIntegrity = Math.max(0, prev - escapedEnemyCount);
          if (nextIntegrity <= 0) {
            setPhase('lost');
            setIsPaused(true);
            setSelectedTowerId(null);
            setActiveEnemyId(null);
          }
          return nextIntegrity;
        });
      }

      if (spawnedInWaveRef.current < waveConfig.enemyCount) {
        spawnTimerRef.current += deltaTime;
        while (
          spawnTimerRef.current >= waveConfig.spawnIntervalMs
          && spawnedInWaveRef.current < waveConfig.enemyCount
        ) {
          spawnTimerRef.current -= waveConfig.spawnIntervalMs;
          spawnedInWaveRef.current += 1;
          setWaveSpawned(spawnedInWaveRef.current);

          updatedEnemies.push(createEnemyFromWave(waveRef.current, spawnedInWaveRef.current, waveConfig));
        }
      }

      const waveSpawnComplete = spawnedInWaveRef.current >= waveConfig.enemyCount;
      if (waveSpawnComplete && updatedEnemies.length === 0) {
        if (waveRef.current >= TOTAL_WAVES) {
          setPhase('won');
          setIsPaused(true);
          setSelectedTowerId(null);
          setActiveEnemyId(null);
        } else {
          interWaveTimerRef.current += deltaTime;
          const remaining = Math.max(0, INTER_WAVE_DELAY_MS - interWaveTimerRef.current);
          setTimeToNextWaveMs(remaining);
          if (interWaveTimerRef.current >= INTER_WAVE_DELAY_MS) {
            startWave(waveRef.current + 1);
          }
        }
      } else {
        if (interWaveTimerRef.current !== 0) interWaveTimerRef.current = 0;
        setTimeToNextWaveMs(0);
      }

      enemiesRef.current = updatedEnemies;
      setEnemies(updatedEnemies);

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [createEnemyFromWave, gameSpeed, isPaused, phase, startWave]);

  const handleToggleMute = () => {
    setIsMuted(soundService.toggleMute());
  };

  const handleUpgrade = () => {
    if (phase !== 'running') return;
    setEnergy(prev => prev + 1000);
  };

  const handleEnemyClick = (id: string) => {
    if (phase !== 'running') return;
    if (modeRef.current === 'learn' && !isPaused) {
      modalAutoPausedRef.current = true;
      setIsPaused(true);
    }
    setActiveEnemyId(id);
    setAnswerDraft('');
    setSelectedOption('');
    setProblemFeedback(null);
    setProblemBusy(false);
  };

  const handleMapClick = (x: number, y: number) => {
    if (phase !== 'running') return;
    if (selectedTowerId) {
      const template = TOWER_TEMPLATES.find(t => t.id === selectedTowerId);
      const unlockWave = template?.level ?? 0;
      const isLocked = Boolean(template?.locked) && wave < unlockWave;
      const masteryReady = template ? mastery[template.subject].level >= template.masteryRequired : false;
      if (template && !isLocked && masteryReady && energy >= template.cost) {
        const newTower: PlacedTower = {
          id: `tower-${Date.now()}`,
          type: template.id,
          x,
          y,
          icon: React.cloneElement(
            template.icon as React.ReactElement<{ className?: string }>,
            { className: 'w-8 h-8' }
          ),
          color: template.color,
          subject: template.subject,
          lastFireTime: worldTimeRef.current
        };
        setPlacedTowers(prev => {
          const next = [...prev, newTower];
          placedTowersRef.current = next;
          return next;
        });
        setEnergy(prev => prev - template.cost);
        setSelectedTowerId(null);
        soundService.play('TOWER_DEPLOY');
      }
    }
  };

  const handleReset = () => {
    worldTimeRef.current = 0;
    const resetTowers = createInitialTowers();
    placedTowersRef.current = resetTowers;
    setPlacedTowers(resetTowers);
    enemiesRef.current = [];
    setEnemies([]);
    setBeams([]);
    setEnergy(2450);
    setBaseIntegrity(BASE_INTEGRITY_START);
    setPhase('running');
    setGameSpeed(1);
    setIsPaused(false);
    startWave(1);
    setSelectedTowerId(null);
    setActiveEnemyId(null);
    setAnswerDraft('');
    setSelectedOption('');
    setProblemFeedback(null);
    setProblemBusy(false);
  };

  const handlePrimaryAction = () => {
    if (phase !== 'running') {
      handleReset();
      return;
    }

    if (timeToNextWaveMs > 0 && wave < TOTAL_WAVES) {
      startWave(wave + 1);
      soundService.play('ENERGY_GAIN');
      return;
    }

    setIsPaused(prev => !prev);
  };

  const handleCycleSpeed = () => {
    setGameSpeed(prev => (prev === 1 ? 2 : prev === 2 ? 3 : 1));
  };

  const closeProblemModal = () => {
    if (modalAutoPausedRef.current) {
      modalAutoPausedRef.current = false;
      if (phase === 'running') {
        setIsPaused(false);
      }
    }
    setActiveEnemyId(null);
    setAnswerDraft('');
    setSelectedOption('');
    setProblemFeedback(null);
    setProblemBusy(false);
  };

  const handleProblemSubmit = () => {
    if (!activeEnemyId || phase !== 'running') return;

    const enemy = enemiesRef.current.find((item) => item.id === activeEnemyId);
    if (!enemy) {
      closeProblemModal();
      return;
    }
    const step = enemy.problem.steps[enemy.currentStepIndex];
    if (!step) {
      closeProblemModal();
      return;
    }

    const answer = step.options?.length ? selectedOption : answerDraft;
    if (!answer.trim()) return;

    setProblemBusy(true);
    const evaluation = evaluateStepAnswer(step, answer);
    setMastery((prev) => applyMasteryAttempt(prev, enemy.problem.subject, evaluation.correct));

    if (!evaluation.correct) {
      const wrongPenalty = getWrongPenalty(modeRef.current);
      if (wrongPenalty > 0) {
        setBaseIntegrity((prev) => {
          const next = Math.max(0, prev - wrongPenalty);
          if (next <= 0) {
            setPhase('lost');
            setIsPaused(true);
            setActiveEnemyId(null);
          }
          return next;
        });
      }

      const nextEnemies = enemiesRef.current.map((item) => {
        if (item.id !== enemy.id) return item;
        const attempts = (item.stepAttempts[step.id] ?? 0) + 1;
        const exhausted = attempts >= 2;
        return {
          ...item,
          currentStepIndex: exhausted
            ? (item.currentStepIndex + 1) % item.problem.steps.length
            : item.currentStepIndex,
          stepAttempts: { ...item.stepAttempts, [step.id]: attempts },
        };
      });

      enemiesRef.current = nextEnemies;
      setEnemies(nextEnemies);
      const wrongMessage = modeRef.current === 'challenge'
        ? 'Incorrect. Recalculate from first principles.'
        : (evaluation.hint ?? 'Incorrect. Think through the concept again.');
      setProblemFeedback({
        tone: 'error',
        message: wrongMessage + ((enemy.stepAttempts[step.id] ?? 0) + 1 >= 2 ? ' Step rotated to prevent guessing loops.' : ''),
      });
      setAnswerDraft('');
      setSelectedOption('');
      setProblemBusy(false);
      return;
    }

    const masterySnapshot = masteryRef.current;
    const candidateTowers = placedTowersRef.current
      .map((tower) => {
        const template = TOWER_TEMPLATES.find((item) => item.id === tower.type);
        return template ? { tower, template } : null;
      })
      .filter((item): item is { tower: PlacedTower; template: Tower } => Boolean(item))
      .filter(({ tower, template }) => {
        if (tower.subject !== enemy.weakness) return false;
        if (masterySnapshot[tower.subject].level < template.masteryRequired) return false;
        const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
        return dist <= template.range;
      })
      .sort((a, b) => b.template.damage - a.template.damage);

    const nextStepIndex = (enemy.currentStepIndex + 1) % enemy.problem.steps.length;

    if (candidateTowers.length === 0) {
      const noTowerEnemies = enemiesRef.current.map((item) =>
        item.id === enemy.id
          ? { ...item, currentStepIndex: nextStepIndex, stepAttempts: { ...item.stepAttempts, [step.id]: 0 } }
          : item
      );
      enemiesRef.current = noTowerEnemies;
      setEnemies(noTowerEnemies);
      setProblemFeedback({
        tone: 'neutral',
        message: `Correct. Place an in-range ${formatSubject(enemy.weakness)} tower to convert reasoning into damage.`,
      });
      setAnswerDraft('');
      setSelectedOption('');
      setProblemBusy(false);
      return;
    }

    const chosen = candidateTowers[0];
    const subjectMastery = masterySnapshot[chosen.tower.subject];
    const masteryBoost = Math.floor(getMasteryPercent(subjectMastery) / 20);
    const streakBoost = Math.floor(subjectMastery.streak / 3);
    const damage = Math.max(1, chosen.template.damage + masteryBoost + streakBoost);

    const beam: Beam = {
      id: `beam-${chosen.tower.id}-${Date.now()}`,
      startX: chosen.tower.x,
      startY: chosen.tower.y - 40,
      endX: enemy.x,
      endY: enemy.y,
      color: chosen.tower.color === 'text-primary' ? '#00f4fe' : chosen.tower.color === 'text-secondary' ? '#a1faff' : '#cafd00',
    };
    setBeams((prev) => [...prev, beam]);
    setTimeout(() => {
      setBeams((prev) => prev.filter((item) => item.id !== beam.id));
    }, 130);

    const refreshedTowers = placedTowersRef.current.map((tower) =>
      tower.id === chosen.tower.id ? { ...tower, lastFireTime: worldTimeRef.current } : tower
    );
    placedTowersRef.current = refreshedTowers;
    setPlacedTowers(refreshedTowers);

    let defeated = false;
    const damagedEnemies: Enemy[] = [];
    enemiesRef.current.forEach((item) => {
      if (item.id !== enemy.id) {
        damagedEnemies.push(item);
        return;
      }
      const nextHealth = Math.max(0, item.health - damage);
      if (nextHealth <= 0) {
        defeated = true;
        return;
      }
      damagedEnemies.push({
        ...item,
        health: nextHealth,
        currentStepIndex: nextStepIndex,
        stepAttempts: { ...item.stepAttempts, [step.id]: 0 },
      });
    });

    enemiesRef.current = damagedEnemies;
    setEnemies(damagedEnemies);

    if (defeated) {
      const reward = enemy.reward + Math.floor(getMasteryPercent(subjectMastery) / 8);
      setEnergy((prev) => prev + reward);
      setProblemFeedback({
        tone: 'success',
        message: `Correct. ${enemy.label} solved and neutralized. +${reward} XP`,
      });
      soundService.play('ENEMY_DESTROY');
      setTimeout(() => {
        setActiveEnemyId((current) => (current === enemy.id ? null : current));
      }, 420);
    } else {
      setProblemFeedback({
        tone: 'success',
        message: `Correct. ${chosen.template.name} fired for ${damage} damage.`,
      });
      soundService.play('TOWER_FIRE');
    }

    setAnswerDraft('');
    setSelectedOption('');
    setProblemBusy(false);
  };

  useEffect(() => {
    if (!activeEnemyId) return;
    const stillAlive = enemies.some((enemy) => enemy.id === activeEnemyId);
    if (stillAlive) return;
    closeProblemModal();
  }, [activeEnemyId, enemies]);

  const overallProgress = (
    ((wave - 1) + (waveTarget > 0 ? waveSpawned / waveTarget : 0)) / TOTAL_WAVES
  );
  const isInterWaveCountdown = phase === 'running' && timeToNextWaveMs > 0 && wave < TOTAL_WAVES;
  const nextWave = Math.min(TOTAL_WAVES, wave + 1);
  const nextWaveCountdownSecs = Math.max(0, Math.ceil(timeToNextWaveMs / 1000));
  const weakSubjects = getWeakSubjects(mastery);
  const activeEnemy = activeEnemyId ? enemies.find((enemy) => enemy.id === activeEnemyId) ?? null : null;

  return (
    <div
      className="relative h-screen w-screen overflow-hidden"
      style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}
    >
      <TopNav
        energy={energy}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        wave={wave}
        totalWaves={TOTAL_WAVES}
        waveProgressRatio={overallProgress}
        baseIntegrity={baseIntegrity}
        phase={phase}
        onNavigateStudy={onNavigateStudy}
      />
      <Sidebar onUpgrade={handleUpgrade} onNavigateStudy={onNavigateStudy} />
      
      <main className="ml-0 lg:ml-64 pt-16 h-full relative">
        <NeuralMap 
          towers={placedTowers} 
          enemies={enemies} 
          beams={beams}
          onEnemyClick={handleEnemyClick}
          onMapClick={handleMapClick}
        />
        <ArsenalPanel 
          selectedTowerId={selectedTowerId} 
          onSelectTower={setSelectedTowerId} 
          energy={energy}
          wave={wave}
          phase={phase}
          mode={mode}
          onModeChange={setMode}
          mastery={mastery}
          weakSubjects={weakSubjects}
        />
        <ControlBar
          onReset={handleReset}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(prev => !prev)}
          onPrimaryAction={handlePrimaryAction}
          onCycleSpeed={handleCycleSpeed}
          gameSpeed={gameSpeed}
          phase={phase}
        />
        <FloatingOrb />
      </main>

      <ProblemModal
        enemy={activeEnemy}
        mode={mode}
        answerDraft={answerDraft}
        selectedOption={selectedOption}
        feedback={problemFeedback}
        busy={problemBusy}
        onClose={closeProblemModal}
        onAnswerDraftChange={setAnswerDraft}
        onSelectOption={setSelectedOption}
        onSubmit={handleProblemSubmit}
      />

      {isInterWaveCountdown && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-surface-container-highest/80 backdrop-blur-xl border border-primary/20 px-6 py-3 rounded-2xl flex items-center gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">Inter-wave Sync</p>
            <p className="text-sm font-headline text-primary">Wave {nextWave} in {nextWaveCountdownSecs}s</p>
          </div>
          <button
            onClick={() => startWave(nextWave)}
            className="px-4 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-headline uppercase tracking-widest hover:bg-primary/30 transition-colors"
          >
            Start Now
          </button>
        </div>
      )}

      {phase !== 'running' && (
        <div className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center">
          <div className="w-[min(92vw,460px)] rounded-3xl border border-white/10 bg-surface-container-high/90 p-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-3">Campaign Result</p>
            <h2 className="font-headline text-3xl font-bold mb-3">
              {phase === 'won' ? 'Nexus Stabilized' : 'Nexus Breached'}
            </h2>
            <p className="text-on-surface-variant text-sm mb-6">
              {phase === 'won'
                ? `All ${TOTAL_WAVES} waves completed. Final integrity: ${Math.max(0, baseIntegrity)}.`
                : `The core collapsed at Wave ${wave}. Rebuild and deploy again.`}
            </p>
            <button
              onClick={handleReset}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-slate-900 font-headline font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform"
            >
              Restart Campaign
            </button>
          </div>
        </div>
      )}

      {/* Selection Overlay */}
      {selectedTowerId && !activeEnemyId && (
        <div className="fixed inset-0 pointer-events-none z-20 border-4 border-primary/20 animate-pulse">
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-primary/20 backdrop-blur-md px-6 py-2 rounded-full border border-primary/40">
            <p className="text-primary font-headline font-bold text-sm uppercase tracking-widest">Select position on map to deploy</p>
          </div>
        </div>
      )}
    </div>
  );
}
