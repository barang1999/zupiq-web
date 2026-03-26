import React, { useState } from "react";
import { Save, Eye, Ear, BookOpen, Dumbbell } from "lucide-react";
import { Button } from "../ui/Button";
import type { UserPreferences, LearningStyle, AIExplanationStyle } from "../../types/user.types";
import { SUBJECTS } from "../../constants/subjects";

interface LearningStyleOption {
  value: LearningStyle;
  label: string;
  description: string;
  icon: React.ElementType;
}

const LEARNING_STYLES: LearningStyleOption[] = [
  {
    value: "visual",
    label: "Visual",
    description: "Diagrams, charts, and visual examples",
    icon: Eye,
  },
  {
    value: "auditory",
    label: "Auditory",
    description: "Narrative explanations and verbal walkthroughs",
    icon: Ear,
  },
  {
    value: "reading",
    label: "Reading / Writing",
    description: "Detailed text-based explanations",
    icon: BookOpen,
  },
  {
    value: "kinesthetic",
    label: "Hands-on",
    description: "Examples and real-world applications",
    icon: Dumbbell,
  },
];

const AI_STYLES: { value: AIExplanationStyle; label: string; description: string }[] = [
  { value: "simple", label: "Simple", description: "Plain language, easy to understand" },
  { value: "detailed", label: "Detailed", description: "Thorough explanations with context" },
  { value: "socratic", label: "Socratic", description: "Guide me with questions" },
];

interface PreferencesPanelProps {
  preferences: UserPreferences;
  onSave: (prefs: Partial<UserPreferences>) => Promise<void>;
  isLoading: boolean;
}

export function PreferencesPanel({ preferences, onSave, isLoading }: PreferencesPanelProps) {
  const [learningStyle, setLearningStyle] = useState<LearningStyle>(
    preferences.learning_style ?? "visual"
  );
  const [aiStyle, setAIStyle] = useState<AIExplanationStyle>(
    preferences.ai_explanation_style ?? "detailed"
  );
  const [dailyGoal, setDailyGoal] = useState(preferences.daily_goal_minutes ?? 30);
  const [preferredSubjects, setPreferredSubjects] = useState<string[]>(
    preferences.preferred_subjects ?? []
  );

  const toggleSubject = (subject: string) => {
    setPreferredSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    );
  };

  const handleSave = async () => {
    await onSave({
      learning_style: learningStyle,
      ai_explanation_style: aiStyle,
      daily_goal_minutes: dailyGoal,
      preferred_subjects: preferredSubjects,
    });
  };

  return (
    <div className="space-y-6">
      {/* Learning style */}
      <div>
        <h4 className="font-medium text-on-surface mb-3">Learning Style</h4>
        <div className="grid grid-cols-2 gap-2">
          {LEARNING_STYLES.map((style) => {
            const Icon = style.icon;
            const isSelected = learningStyle === style.value;
            return (
              <button
                key={style.value}
                onClick={() => setLearningStyle(style.value)}
                className={[
                  "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                  isSelected
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-white/5 text-on-surface-variant hover:bg-surface-container-high",
                ].join(" ")}
              >
                <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">{style.label}</div>
                  <div className="text-xs opacity-70 mt-0.5">{style.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI explanation style */}
      <div>
        <h4 className="font-medium text-on-surface mb-3">AI Explanation Style</h4>
        <div className="flex gap-2">
          {AI_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => setAIStyle(style.value)}
              title={style.description}
              className={[
                "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all",
                aiStyle === style.value
                  ? "bg-secondary/10 border-secondary/30 text-secondary"
                  : "border-white/5 text-on-surface-variant hover:bg-surface-container-high",
              ].join(" ")}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daily goal */}
      <div>
        <h4 className="font-medium text-on-surface mb-3">
          Daily Learning Goal: <span className="text-primary">{dailyGoal} min</span>
        </h4>
        <input
          type="range"
          min="5"
          max="120"
          step="5"
          value={dailyGoal}
          onChange={(e) => setDailyGoal(parseInt(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-on-surface-variant mt-1">
          <span>5 min</span>
          <span>120 min</span>
        </div>
      </div>

      {/* Preferred subjects */}
      <div>
        <h4 className="font-medium text-on-surface mb-3">Preferred Subjects</h4>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((subject) => {
            const isSelected = preferredSubjects.includes(subject.name);
            return (
              <button
                key={subject.id}
                onClick={() => toggleSubject(subject.name)}
                className={[
                  "px-3 py-1.5 rounded-lg text-sm border transition-all",
                  isSelected
                    ? "bg-tertiary/10 border-tertiary/30 text-tertiary"
                    : "border-white/5 text-on-surface-variant hover:bg-surface-container-high",
                ].join(" ")}
              >
                {subject.name}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        variant="primary"
        onClick={handleSave}
        isLoading={isLoading}
        leftIcon={<Save className="w-4 h-4" />}
        fullWidth
      >
        Save Preferences
      </Button>
    </div>
  );
}
