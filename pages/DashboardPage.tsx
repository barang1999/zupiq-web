import React, { useEffect } from "react";
import { motion } from "motion/react";
import { Brain, Layers, Users, BookOpen, TrendingUp, Clock, Zap } from "lucide-react";
import { PageLayout, PageContainer } from "../components/layout/PageLayout";
import { Card, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { useAuth } from "../hooks/useAuth";
import { useAppStore } from "../store/app.store";
import { usePersonalization } from "../hooks/usePersonalization";
import { useFlashcards } from "../hooks/useFlashcards";
import { formatEducationLevel } from "../utils/formatters";
import { SUBJECTS } from "../constants/subjects";

export default function DashboardPage() {
  const { user } = useAuth();
  const { navigateTo } = useAppStore();
  const { suggestedSubjects } = usePersonalization();
  const { decks, fetchDecks } = useFlashcards();

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const quickActions = [
    {
      title: "Ask AI Tutor",
      description: "Get instant help with any topic",
      icon: Brain,
      color: "text-primary",
      bg: "bg-primary/10",
      action: () => navigateTo("ai-tutor"),
    },
    {
      title: "Study Flashcards",
      description: `${decks.length} deck${decks.length !== 1 ? "s" : ""} available`,
      icon: Layers,
      color: "text-secondary",
      bg: "bg-secondary/10",
      action: () => navigateTo("flashcards"),
    },
    {
      title: "Join a Study Group",
      description: "Learn with others",
      icon: Users,
      color: "text-tertiary",
      bg: "bg-tertiary/10",
      action: () => navigateTo("groups"),
    },
    {
      title: "Browse Subjects",
      description: "Explore topics and lessons",
      icon: BookOpen,
      color: "text-on-surface",
      bg: "bg-surface-container-high",
      action: () => navigateTo("subjects"),
    },
  ];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <PageLayout>
      <PageContainer>
        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 glass-card rounded-3xl relative overflow-hidden glow-corner"
        >
          <div className="relative z-10">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h1 className="font-headline text-3xl font-bold text-on-surface mb-1">
                  {greeting()}, {user?.full_name?.split(" ")[0]}!
                </h1>
                <p className="text-on-surface-variant">
                  Ready to continue your learning journey?
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="primary">{formatEducationLevel(user?.education_level ?? "")}</Badge>
                  {user?.grade && <Badge variant="default">Grade {user.grade}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  Daily goal: {(user?.preferences as any)?.daily_goal_minutes ?? 30} min
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick actions */}
        <section className="mb-8">
          <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Quick Start</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card
                    variant="glass"
                    hoverable
                    onClick={action.action}
                    className="h-full"
                  >
                    <div className={`w-11 h-11 rounded-2xl ${action.bg} flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 ${action.color}`} />
                    </div>
                    <h3 className="font-bold text-on-surface mb-1">{action.title}</h3>
                    <p className="text-sm text-on-surface-variant">{action.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Suggested subjects */}
          <div className="lg:col-span-2">
            <Card variant="glass">
              <CardHeader
                title="Suggested for You"
                subtitle="Based on your education level and preferences"
                icon={<TrendingUp className="w-5 h-5 text-primary" />}
                action={
                  <Button variant="ghost" size="sm" onClick={() => navigateTo("subjects")}>
                    All subjects
                  </Button>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SUBJECTS.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => navigateTo("ai-tutor")}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-high transition-colors text-left"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: `${subject.color}20` }}
                    >
                      <span style={{ color: subject.color }}>
                        {subject.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-on-surface">{subject.name}</p>
                      <p className="text-xs text-on-surface-variant">
                        {subject.subtopics.length} topics
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent flashcard decks */}
          <div>
            <Card variant="glass">
              <CardHeader
                title="Recent Decks"
                icon={<Layers className="w-5 h-5 text-secondary" />}
                action={
                  <Button variant="ghost" size="sm" onClick={() => navigateTo("flashcards")}>
                    View all
                  </Button>
                }
              />
              {decks.length === 0 ? (
                <div className="text-center py-6">
                  <Zap className="w-8 h-8 text-secondary/50 mx-auto mb-2" />
                  <p className="text-sm text-on-surface-variant">No decks yet.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigateTo("flashcards")}
                  >
                    Create a deck
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {decks.slice(0, 4).map((deck) => (
                    <button
                      key={deck.id}
                      onClick={() => navigateTo("flashcards")}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-container-high transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                        <Layers className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-on-surface truncate">{deck.title}</p>
                        <p className="text-xs text-on-surface-variant">{deck.card_count} cards</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
