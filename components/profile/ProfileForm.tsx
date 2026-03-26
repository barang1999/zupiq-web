import React, { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { SUPPORTED_LANGUAGES } from "../../constants/languages";
import type { UserProfile, UpdateProfileDTO, EducationLevel } from "../../types/user.types";

const EDUCATION_LEVELS: { value: EducationLevel; label: string }[] = [
  { value: "elementary", label: "Elementary School" },
  { value: "middle_school", label: "Middle School" },
  { value: "high_school", label: "High School" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "graduate", label: "Graduate" },
  { value: "professional", label: "Professional" },
];

interface ProfileFormProps {
  user: UserProfile;
  onSave: (dto: UpdateProfileDTO) => Promise<void>;
  isLoading: boolean;
}

export function ProfileForm({ user, onSave, isLoading }: ProfileFormProps) {
  const [fullName, setFullName] = useState(user.full_name);
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(user.education_level);
  const [grade, setGrade] = useState(user.grade ?? "");
  const [language, setLanguage] = useState(user.language);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const changed =
      fullName !== user.full_name ||
      educationLevel !== user.education_level ||
      grade !== (user.grade ?? "") ||
      language !== user.language;
    setIsDirty(changed);
  }, [fullName, educationLevel, grade, language, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      full_name: fullName,
      education_level: educationLevel,
      grade: grade || undefined,
      language,
    });
    setIsDirty(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Your full name"
        required
      />

      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
          Education Level
        </label>
        <select
          value={educationLevel}
          onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
          className="w-full bg-surface-container-highest border border-white/5 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
        >
          {EDUCATION_LEVELS.map((level) => (
            <option key={level.value} value={level.value} className="bg-surface-container-highest">
              {level.label}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="Grade / Year (optional)"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        placeholder="e.g. Grade 10, Year 2, etc."
      />

      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
          Preferred Language
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as typeof language)}
          className="w-full bg-surface-container-highest border border-white/5 rounded-xl py-3 px-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-surface-container-highest">
              {lang.flag} {lang.nativeLabel} ({lang.label})
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={!isDirty}
          leftIcon={<Save className="w-4 h-4" />}
          fullWidth
        >
          Save Changes
        </Button>
      </div>
    </form>
  );
}
