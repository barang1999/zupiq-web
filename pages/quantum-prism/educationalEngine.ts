import type { Language } from "../../types/shared";
import enLocale from "./locales/en.json";
import kmLocale from "./locales/km.json";

export type SubjectType = "math" | "physics" | "logic" | "bio";
export type GameMode = "learn" | "practice" | "challenge";
export type GameLanguage = Language;

export interface Step {
  id: string;
  prompt: string;
  options?: string[];
  correct: string;
  hint?: string;
}

export interface Problem {
  id: string;
  subject: SubjectType;
  difficulty: number;
  question: string;
  steps: Step[];
  correctAnswer: string;
  explanation: string;
}

export interface Mastery {
  subject: SubjectType;
  accuracy: number;
  attempts: number;
  streak: number;
  level: number;
  recent: boolean[];
}

export type MasteryState = Record<SubjectType, Mastery>;

interface ProblemTemplate {
  subject: SubjectType;
  question: string;
  steps: Array<Omit<Step, "id">>;
  explanation: string;
}

interface GameLocaleBundle {
  subjects: Record<SubjectType, string>;
  text: Record<string, string>;
}

const SUPPORTED_GAME_LANGUAGES: readonly GameLanguage[] = [
  "en",
  "fr",
  "es",
  "ar",
  "zh",
  "hi",
  "pt",
  "de",
  "ja",
  "ko",
  "km",
] as const;

const DEFAULT_LOCALE_BUNDLE = enLocale as GameLocaleBundle;

const LOCALE_BUNDLES: Partial<Record<GameLanguage, GameLocaleBundle>> = {
  en: DEFAULT_LOCALE_BUNDLE,
  km: kmLocale as GameLocaleBundle,
};

const PROBLEM_BANK: ProblemTemplate[] = [
  {
    subject: "math",
    question: "Simplify and evaluate: 3x + 2 when x = 4.",
    steps: [
      {
        prompt: "Substitute x = 4 into 3x + 2. What expression do you get?",
        options: ["3(4) + 2", "3 + 4 + 2", "34 + 2", "3(2) + 4"],
        correct: "3(4) + 2",
        hint: "Replace x with 4 before doing arithmetic.",
      },
      {
        prompt: "Now evaluate 3(4) + 2.",
        options: ["12", "14", "16", "10"],
        correct: "14",
        hint: "Multiply first, then add.",
      },
    ],
    explanation: "Substitute first, then use order of operations: 3*4 + 2 = 14.",
  },
  {
    subject: "math",
    question: "Solve: 2x - 6 = 10.",
    steps: [
      {
        prompt: "Add 6 to both sides. What do you get?",
        options: ["2x = 16", "2x = 4", "x = 16", "x = 8"],
        correct: "2x = 16",
        hint: "Keep both sides balanced.",
      },
      {
        prompt: "Divide both sides by 2.",
        options: ["x = 8", "x = 6", "x = 12", "x = 4"],
        correct: "x = 8",
        hint: "2x / 2 = x.",
      },
    ],
    explanation: "Inverse operations isolate x: add 6, then divide by 2.",
  },
  {
    subject: "physics",
    question: "A car accelerates from rest at 2 m/s^2 for 5 s. Find final velocity.",
    steps: [
      {
        prompt: "Which formula fits constant acceleration?",
        options: ["v = u + at", "F = ma", "P = W/t", "E = mc^2"],
        correct: "v = u + at",
        hint: "Final velocity from initial velocity and acceleration uses v = u + at.",
      },
      {
        prompt: "Compute v when u=0, a=2, t=5.",
        options: ["10 m/s", "7 m/s", "5 m/s", "2.5 m/s"],
        correct: "10 m/s",
        hint: "v = 0 + 2*5.",
      },
    ],
    explanation: "At constant acceleration, v = u + at = 0 + 2*5 = 10 m/s.",
  },
  {
    subject: "physics",
    question: "An object of mass 3 kg experiences force 12 N. Find acceleration.",
    steps: [
      {
        prompt: "Choose the relevant law.",
        options: ["F = ma", "V = IR", "p = mv", "Q = mcΔT"],
        correct: "F = ma",
        hint: "Relates force, mass, and acceleration directly.",
      },
      {
        prompt: "Compute a = F/m.",
        options: ["4 m/s^2", "9 m/s^2", "36 m/s^2", "3 m/s^2"],
        correct: "4 m/s^2",
        hint: "12 / 3 = 4.",
      },
    ],
    explanation: "Rearrange F = ma to a = F/m, then divide 12 by 3.",
  },
  {
    subject: "logic",
    question: "If all A are B and all B are C, what can we conclude?",
    steps: [
      {
        prompt: "Pick the valid deduction.",
        options: ["All A are C", "All C are A", "Some B are not C", "No conclusion"],
        correct: "All A are C",
        hint: "Think transitive relation.",
      },
      {
        prompt: "What pattern is this?",
        options: ["Syllogism", "Ad hominem", "False dilemma", "Anecdotal"],
        correct: "Syllogism",
        hint: "Classic two-premise deductive structure.",
      },
    ],
    explanation: "This is a valid syllogism using transitivity.",
  },
  {
    subject: "logic",
    question: "Statement: 'Either we ban phones or students fail'. Identify the fallacy.",
    steps: [
      {
        prompt: "What kind of reasoning error is this?",
        options: ["False dilemma", "Strawman", "Circular reasoning", "Hasty generalization"],
        correct: "False dilemma",
        hint: "It wrongly limits options to two extremes.",
      },
      {
        prompt: "Why is it flawed?",
        options: [
          "It ignores other possible causes and solutions",
          "It attacks a person instead of argument",
          "It repeats the claim as proof",
          "It uses too much data"
        ],
        correct: "It ignores other possible causes and solutions",
        hint: "The issue is missing alternatives.",
      },
    ],
    explanation: "False dilemma presents only two options while other possibilities exist.",
  },
  {
    subject: "bio",
    question: "What is the role of mitochondria in cells?",
    steps: [
      {
        prompt: "Select the best function.",
        options: ["ATP production", "Protein synthesis", "DNA storage", "Water transport"],
        correct: "ATP production",
        hint: "Often called the cell's powerhouse.",
      },
      {
        prompt: "Which process is most associated with mitochondria?",
        options: ["Cellular respiration", "Transcription", "Photosynthesis", "Mitosis"],
        correct: "Cellular respiration",
        hint: "Think energy release from nutrients.",
      },
    ],
    explanation: "Mitochondria generate ATP through cellular respiration.",
  },
  {
    subject: "bio",
    question: "DNA to RNA to Protein describes which concept?",
    steps: [
      {
        prompt: "Name this flow of information.",
        options: ["Central dogma", "Natural selection", "Homeostasis", "Diffusion"],
        correct: "Central dogma",
        hint: "A foundational molecular biology principle.",
      },
      {
        prompt: "Which step converts RNA to protein?",
        options: ["Translation", "Replication", "Transcription", "Mutation"],
        correct: "Translation",
        hint: "Occurs on ribosomes.",
      },
    ],
    explanation: "The central dogma is DNA -> RNA -> Protein via transcription and translation.",
  },
];

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getLocaleBundle(language: GameLanguage): GameLocaleBundle {
  return LOCALE_BUNDLES[language] ?? DEFAULT_LOCALE_BUNDLE;
}

function localizeText(text: string, language: GameLanguage): string {
  const localized = getLocaleBundle(language).text[text];
  if (localized) return localized;
  return DEFAULT_LOCALE_BUNDLE.text[text] ?? text;
}

export function resolveGameLanguage(raw?: string | null): GameLanguage {
  if (!raw) return "en";
  const normalized = raw.toLowerCase();
  return (SUPPORTED_GAME_LANGUAGES as readonly string[]).includes(normalized)
    ? (normalized as GameLanguage)
    : "en";
}

export function formatSubject(subject: SubjectType, language: GameLanguage = "en"): string {
  return getLocaleBundle(language).subjects[subject] ?? DEFAULT_LOCALE_BUNDLE.subjects[subject];
}

export function createInitialMasteryState(): MasteryState {
  const create = (subject: SubjectType): Mastery => ({
    subject,
    accuracy: 0,
    attempts: 0,
    streak: 0,
    level: 1,
    recent: [],
  });

  return {
    math: create("math"),
    physics: create("physics"),
    logic: create("logic"),
    bio: create("bio"),
  };
}

export function getModeDifficultyBonus(mode: GameMode): number {
  if (mode === "learn") return -1;
  if (mode === "challenge") return 1;
  return 0;
}

export function getWrongPenalty(mode: GameMode): number {
  if (mode === "learn") return 0;
  if (mode === "challenge") return 2;
  return 1;
}

export function generateProblem(subject: SubjectType, difficulty: number, language: GameLanguage = "en"): Problem {
  const candidates = PROBLEM_BANK.filter((item) => item.subject === subject);
  const index = Math.floor(Math.random() * candidates.length);
  const template = candidates[index] ?? PROBLEM_BANK[0];
  const level = Math.max(1, Math.min(10, difficulty));
  const steps: Step[] = template.steps.map((step, i) => ({
    prompt: localizeText(step.prompt, language),
    options: step.options?.map((option) => localizeText(option, language)),
    correct: localizeText(step.correct, language),
    hint: step.hint ? localizeText(step.hint, language) : undefined,
    id: `${template.subject}-step-${i + 1}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  }));

  const lastStep = steps[steps.length - 1];
  return {
    id: `${template.subject}-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    subject,
    difficulty: level,
    question: localizeText(template.question, language),
    steps,
    correctAnswer: lastStep ? lastStep.correct : "",
    explanation: localizeText(template.explanation, language),
  };
}

export function evaluateStepAnswer(step: Step, answer: string): { correct: boolean; hint?: string } {
  const correct = normalizeAnswer(answer) === normalizeAnswer(step.correct);
  if (correct) return { correct: true };
  return { correct: false, hint: step.hint ?? "Re-read the prompt and try the key relation first." };
}

export function applyMasteryAttempt(
  state: MasteryState,
  subject: SubjectType,
  correct: boolean,
): MasteryState {
  const prev = state[subject];
  const nextAttempts = prev.attempts + 1;
  const nextAccuracy = prev.accuracy + (correct ? 1 : 0);
  const nextStreak = correct ? prev.streak + 1 : 0;
  const levelFromAccuracy = Math.floor((nextAccuracy / Math.max(1, nextAttempts)) * 10);
  const levelFromVolume = Math.floor(nextAccuracy / 4);
  const nextLevel = Math.max(1, 1 + levelFromAccuracy + levelFromVolume);
  const recent = [...prev.recent, correct].slice(-12);

  return {
    ...state,
    [subject]: {
      ...prev,
      attempts: nextAttempts,
      accuracy: nextAccuracy,
      streak: nextStreak,
      level: nextLevel,
      recent,
    },
  };
}

export function getMasteryPercent(mastery: Mastery): number {
  if (mastery.attempts === 0) return 0;
  return Math.round((mastery.accuracy / mastery.attempts) * 100);
}

export function getMasteryTrend(mastery: Mastery): "up" | "down" | "flat" {
  if (mastery.recent.length < 4) return "flat";
  const half = Math.floor(mastery.recent.length / 2);
  const first = mastery.recent.slice(0, half);
  const second = mastery.recent.slice(half);
  const firstScore = first.filter(Boolean).length / first.length;
  const secondScore = second.filter(Boolean).length / second.length;
  if (secondScore - firstScore > 0.1) return "up";
  if (firstScore - secondScore > 0.1) return "down";
  return "flat";
}

export function getWeakSubjects(state: MasteryState): SubjectType[] {
  return (Object.keys(state) as SubjectType[])
    .sort((a, b) => {
      const pa = getMasteryPercent(state[a]);
      const pb = getMasteryPercent(state[b]);
      return pa - pb;
    })
    .slice(0, 2);
}

export function getSubjectCycleByMode(mode: GameMode): SubjectType[] {
  if (mode === "learn") return ["math", "logic", "physics", "bio"];
  if (mode === "challenge") return ["logic", "physics", "math", "bio"];
  return ["math", "physics", "logic", "bio"];
}
