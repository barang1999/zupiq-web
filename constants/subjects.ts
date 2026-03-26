export interface SubjectConfig {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  subtopics: SubtopicConfig[];
}

export interface SubtopicConfig {
  id: string;
  name: string;
  slug: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export const SUBJECTS: SubjectConfig[] = [
  {
    id: "math",
    name: "Mathematics",
    slug: "mathematics",
    icon: "Calculator",
    color: "#a1faff",
    description: "From basic arithmetic to advanced calculus and beyond.",
    subtopics: [
      { id: "algebra", name: "Algebra", slug: "algebra", difficulty: "beginner" },
      { id: "geometry", name: "Geometry", slug: "geometry", difficulty: "beginner" },
      { id: "trigonometry", name: "Trigonometry", slug: "trigonometry", difficulty: "intermediate" },
      { id: "calculus", name: "Calculus", slug: "calculus", difficulty: "advanced" },
      { id: "statistics", name: "Statistics & Probability", slug: "statistics", difficulty: "intermediate" },
      { id: "linear-algebra", name: "Linear Algebra", slug: "linear-algebra", difficulty: "advanced" },
      { id: "discrete-math", name: "Discrete Mathematics", slug: "discrete-math", difficulty: "advanced" },
    ],
  },
  {
    id: "physics",
    name: "Physics",
    slug: "physics",
    icon: "Atom",
    color: "#ff51fa",
    description: "Understand the laws that govern the universe.",
    subtopics: [
      { id: "mechanics", name: "Classical Mechanics", slug: "mechanics", difficulty: "intermediate" },
      { id: "thermodynamics", name: "Thermodynamics", slug: "thermodynamics", difficulty: "intermediate" },
      { id: "electromagnetism", name: "Electromagnetism", slug: "electromagnetism", difficulty: "advanced" },
      { id: "optics", name: "Optics & Waves", slug: "optics", difficulty: "intermediate" },
      { id: "quantum", name: "Quantum Mechanics", slug: "quantum-mechanics", difficulty: "advanced" },
      { id: "relativity", name: "Special Relativity", slug: "special-relativity", difficulty: "advanced" },
      { id: "nuclear", name: "Nuclear Physics", slug: "nuclear-physics", difficulty: "advanced" },
    ],
  },
  {
    id: "chemistry",
    name: "Chemistry",
    slug: "chemistry",
    icon: "FlaskConical",
    color: "#f3ffca",
    description: "Explore matter, reactions, and molecular structures.",
    subtopics: [
      { id: "general-chem", name: "General Chemistry", slug: "general-chemistry", difficulty: "beginner" },
      { id: "organic", name: "Organic Chemistry", slug: "organic-chemistry", difficulty: "advanced" },
      { id: "inorganic", name: "Inorganic Chemistry", slug: "inorganic-chemistry", difficulty: "intermediate" },
      { id: "physical-chem", name: "Physical Chemistry", slug: "physical-chemistry", difficulty: "advanced" },
      { id: "biochem", name: "Biochemistry", slug: "biochemistry", difficulty: "advanced" },
      { id: "analytical", name: "Analytical Chemistry", slug: "analytical-chemistry", difficulty: "intermediate" },
      { id: "electrochemistry", name: "Electrochemistry", slug: "electrochemistry", difficulty: "intermediate" },
    ],
  },
];

export const SUBJECT_SLUGS = SUBJECTS.map((s) => s.slug);

export function getSubjectBySlug(slug: string): SubjectConfig | undefined {
  return SUBJECTS.find((s) => s.slug === slug || s.id === slug);
}

export function getSubjectColor(subjectId: string): string {
  return SUBJECTS.find((s) => s.id === subjectId)?.color ?? "#a1faff";
}
