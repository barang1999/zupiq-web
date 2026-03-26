import React, { useState } from "react";
import { Brain, Lightbulb, Calculator, Sigma } from "lucide-react";
import { PageLayout, PageContainer } from "../components/layout/PageLayout";
import { ChatWindow } from "../components/ai/ChatWindow";
import { SubjectSelector } from "../components/ai/SubjectSelector";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { useAppStore } from "../store/app.store";
import type { SubjectType } from "../types/ai.types";
import { SUBJECTS } from "../constants/subjects";

export default function AITutorPage() {
  const [activeSubject, setActiveSubject] = useState<SubjectType | null>(null);
  const { currentSubject } = useAppStore();

  const initialSubject = activeSubject ?? currentSubject ?? null;

  return (
    <PageLayout>
      <PageContainer title="AI Tutor" subtitle="Ask questions, solve problems, and explore topics with Gemini AI" maxWidth="full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Left panel — subject info + tips */}
          <div className="lg:col-span-1 space-y-4 overflow-y-auto">
            <Card variant="glass">
              <h3 className="font-headline font-bold text-on-surface mb-3">Subject</h3>
              <SubjectSelector
                selected={activeSubject}
                onChange={setActiveSubject}
                compact={false}
              />
            </Card>

            <Card variant="glass">
              <h3 className="font-headline font-bold text-on-surface mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-tertiary" />
                Tips
              </h3>
              <ul className="space-y-2 text-sm text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Be specific with your question for better answers
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-secondary mt-0.5">•</span>
                  Upload an image of a problem or diagram
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-tertiary mt-0.5">•</span>
                  Ask for a hint first, then the full solution
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  Request step-by-step explanations for complex problems
                </li>
              </ul>
            </Card>

            {activeSubject && (
              <Card variant="glass">
                <h3 className="font-headline font-bold text-on-surface mb-3">
                  {SUBJECTS.find((s) => s.id === activeSubject)?.name ?? activeSubject} Topics
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECTS.find((s) => s.id === activeSubject)?.subtopics.slice(0, 6).map((t) => (
                    <Badge key={t.id} variant="default" size="sm">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Main chat area */}
          <div className="lg:col-span-3 h-full">
            <ChatWindow initialSubject={initialSubject} />
          </div>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
