import React from "react";
import { Calculator, Atom, FlaskConical, BookOpen } from "lucide-react";
import type { SubjectType } from "../../types/ai.types";
import { motion } from "motion/react";

const SUBJECT_OPTIONS: {
  id: SubjectType;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}[] = [
  {
    id: "math",
    label: "Mathematics",
    icon: Calculator,
    color: "text-primary",
    bgColor: "bg-primary/10 border-primary/20",
  },
  {
    id: "physics",
    label: "Physics",
    icon: Atom,
    color: "text-secondary",
    bgColor: "bg-secondary/10 border-secondary/20",
  },
  {
    id: "chemistry",
    label: "Chemistry",
    icon: FlaskConical,
    color: "text-tertiary",
    bgColor: "bg-tertiary/10 border-tertiary/20",
  },
  {
    id: "general",
    label: "General",
    icon: BookOpen,
    color: "text-on-surface",
    bgColor: "bg-surface-container-high border-outline-variant/30",
  },
];

interface SubjectSelectorProps {
  selected: SubjectType | null;
  onChange: (subject: SubjectType | null) => void;
  compact?: boolean;
}

export function SubjectSelector({
  selected,
  onChange,
  compact = false,
}: SubjectSelectorProps) {
  return (
    <div className={`flex gap-2 ${compact ? "flex-wrap" : "flex-wrap md:flex-nowrap"}`}>
      {SUBJECT_OPTIONS.map((subject) => {
        const Icon = subject.icon;
        const isSelected = selected === subject.id;

        return (
          <motion.button
            key={subject.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(isSelected ? null : subject.id)}
            className={[
              "flex items-center gap-2 border rounded-xl transition-all",
              compact ? "px-3 py-1.5 text-sm" : "px-4 py-2.5",
              isSelected
                ? `${subject.bgColor} ${subject.color} font-medium`
                : "border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high",
            ].join(" ")}
          >
            <Icon className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} flex-shrink-0`} />
            <span>{subject.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
