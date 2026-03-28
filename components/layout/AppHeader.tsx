import { ReactNode, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  Brain,
  CreditCard,
  Download,
  GitFork,
  History,
  Layers,
  LogOut,
  Settings,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { useLiveTokenUsage } from '../../hooks/useLiveTokenUsage';
import { getBillingSubscription } from '../../lib/billing';

interface AppHeaderProps {
  user: any;
  left?: ReactNode;
  actions?: ReactNode;
  onSettingsClick?: () => void;
  onSignOut?: () => void;
  onNavigateStudy?: () => void;
  onNavigateHistory?: () => void;
  onNavigateFlashcards?: () => void;
  onNavigateQuiz?: () => void;
  onNavigateAchievements?: () => void;
  activeMobileMenu?: 'study' | 'history' | 'flashcards' | 'quiz' | 'achievements' | 'settings' | null;
  showInstallAppButton?: boolean;
  onInstallAppClick?: () => void;
}

export function AppHeader({
  user,
  left,
  actions,
  onSettingsClick,
  onSignOut,
  onNavigateStudy,
  onNavigateHistory,
  onNavigateFlashcards,
  onNavigateQuiz,
  onNavigateAchievements,
  activeMobileMenu = null,
  showInstallAppButton = false,
  onInstallAppClick,
}: AppHeaderProps) {
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'U';
  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const [imgError, setImgError] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProPlan, setIsProPlan] = useState(false);
  const { usage: tokenUsage } = useLiveTokenUsage(Boolean(user));

  const navigateToQuiz = () => {
    if (onNavigateQuiz) {
      onNavigateQuiz();
      return;
    }
    if (window.location.pathname !== '/quiz') {
      window.history.pushState({ page: 'quiz' }, '', '/quiz');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'quiz' } }));
    }
    setIsProfileMenuOpen(false);
  };

  const navigateToAchievements = () => {
    if (onNavigateAchievements) {
      onNavigateAchievements();
      return;
    }
    if (window.location.pathname !== '/achievements') {
      window.history.pushState({ page: 'achievements' }, '', '/achievements');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'achievements' } }));
    }
    setIsProfileMenuOpen(false);
  };

  const mobileMenuItems = useMemo(
    () => [
      { id: 'study' as const, label: 'Study Space', Icon: GitFork, action: onNavigateStudy },
      { id: 'history' as const, label: 'Learning History', Icon: History, action: onNavigateHistory },
      { id: 'flashcards' as const, label: 'Flashcards', Icon: Layers, action: onNavigateFlashcards },
      { id: 'quiz' as const, label: 'Quiz', Icon: Brain, action: navigateToQuiz },
      { id: 'achievements' as const, label: 'Achievements', Icon: Trophy, action: navigateToAchievements },
      { id: 'settings' as const, label: 'Settings', Icon: Settings, action: onSettingsClick },
    ],
    [navigateToAchievements, navigateToQuiz, onNavigateFlashcards, onNavigateHistory, onNavigateStudy, onSettingsClick]
  );

  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setIsProfileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    const userId = user?.id ?? user?.sub ?? user?.user_id ?? null;
    if (!userId) {
      setIsProPlan(false);
      return;
    }

    let cancelled = false;

    void getBillingSubscription()
      .then((response) => {
        if (cancelled) return;
        setIsProPlan(response.access.effectivePlanKey === 'pro');
      })
      .catch(() => {
        if (cancelled) return;
        setIsProPlan(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.sub, user?.user_id]);

  const runAndClose = (action?: () => void) => {
    if (!action) return;
    setIsProfileMenuOpen(false);
    action();
  };

  const handleUpgradeToPro = () => {
    if (window.location.pathname !== '/plan') {
      window.history.pushState({ page: 'plan' }, '', '/plan');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'plan' } }));
    }
  };

  const handleOpenBillingSubscription = () => {
    if (window.location.pathname !== '/billingsubscription') {
      window.history.pushState({ page: 'billingsubscription' }, '', '/billingsubscription');
      window.dispatchEvent(new PopStateEvent('popstate', { state: { page: 'billingsubscription' } }));
    }
  };

  const openProfileMenu = () => {
    if (window.innerWidth >= 640) return;
    setIsProfileMenuOpen(true);
  };

  const tokenUsageText = useMemo(() => {
    if (!tokenUsage) return null;
    if (tokenUsage.limit === null) return `Tokens used: ${tokenUsage.used}`;
    return `Tokens: ${tokenUsage.used}/${tokenUsage.limit}`;
  }, [tokenUsage]);

  const tokenUsageRemainingText = useMemo(() => {
    if (!tokenUsage) return null;
    if (tokenUsage.limit === null || tokenUsage.remaining === null) return 'Unlimited daily allocation';
    return `${Math.max(0, tokenUsage.remaining)} left today`;
  }, [tokenUsage]);

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface-container-highest/60 backdrop-blur-xl flex justify-between items-center px-6 h-14 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-headline font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tighter uppercase">
            Zupiq
          </span>
          {left}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {tokenUsageText && (
            <div className="hidden sm:flex flex-col items-end rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-1">
              <span className="text-[11px] font-semibold text-on-surface">{tokenUsageText}</span>
              <span className="text-[10px] text-on-surface-variant">{tokenUsageRemainingText}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-on-surface-variant">
            <button className="p-2 rounded-full hover:bg-surface-container-highest transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button
              onClick={onSettingsClick}
              className="p-2 rounded-full hover:bg-surface-container-highest transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={openProfileMenu}
              className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden ml-1 flex-shrink-0"
              aria-label="Open profile menu"
            >
              {user?.avatar_url && !imgError ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-xs font-bold text-on-surface">
                  {initials}
                </div>
              )}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isProfileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-[90] sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-background/75 backdrop-blur-2xl"
              onClick={() => setIsProfileMenuOpen(false)}
              aria-label="Close profile menu"
            />

            <motion.div
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 28, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative z-10 h-full w-full overflow-y-auto bg-surface-container-low/95 px-6 pb-8 pt-6"
            >
              <div className="mb-10 flex items-center justify-between">
                <div className="font-headline text-xl font-bold tracking-tight text-primary">Zupiq Prism</div>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-highest/60 text-on-surface-variant hover:text-on-surface"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-10 flex items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-primary to-secondary p-0.5 shadow-[0_0_24px_rgba(161,250,255,0.2)]">
                    <div className="h-full w-full overflow-hidden rounded-full border-2 border-background">
                      {user?.avatar_url && !imgError ? (
                        <img
                          src={user.avatar_url}
                          alt={displayName}
                          className="h-full w-full object-cover"
                          onError={() => setImgError(true)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-secondary/30 text-sm font-bold text-on-surface">
                          {initials}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-tertiary text-on-tertiary">
                    <Sparkles className="h-3 w-3" />
                  </div>
                </div>

                <div>
                  <h2 className="font-headline text-2xl font-bold text-on-surface">{displayName}</h2>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Mobile Control Menu</p>
                </div>
              </div>

              {tokenUsageText && (
                <div className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-primary">Deep Dive Tokens</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">{tokenUsageText}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{tokenUsageRemainingText}</p>
                </div>
              )}

              <nav className="flex flex-col gap-2">
                {mobileMenuItems
                  .filter((item) => Boolean(item.action))
                  .map(({ id, label, Icon, action }) => {
                    const isActive = activeMobileMenu === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => runAndClose(action)}
                        className={[
                          "flex items-center gap-3 rounded-full px-5 py-4 text-left transition-all duration-200",
                          isActive
                            ? "border-l-4 border-primary bg-gradient-to-r from-primary/20 to-secondary/10 text-primary"
                            : "text-on-surface-variant hover:bg-surface-container-highest/70 hover:text-on-surface",
                        ].join(' ')}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-headline text-lg font-medium">{label}</span>
                      </button>
                    );
                  })}
              </nav>

              <div className="mt-8 border-t border-outline-variant/20 pt-6">
                {!isProPlan && (
                  <button
                    type="button"
                    onClick={() => runAndClose(handleUpgradeToPro)}
                    className="mb-3 flex w-full items-center gap-3 rounded-full px-5 py-3 text-left bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 text-primary transition-colors hover:from-primary/30 hover:to-secondary/30"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span className="font-headline text-lg font-medium">Upgrade to Pro</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => runAndClose(handleOpenBillingSubscription)}
                  className="mb-3 flex w-full items-center gap-3 rounded-full px-5 py-3 text-left text-on-surface-variant transition-colors hover:bg-surface-container-highest/70 hover:text-on-surface"
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="font-headline text-lg font-medium">Billing & Subscription</span>
                </button>
                {showInstallAppButton && onInstallAppClick && (
                  <button
                    type="button"
                    onClick={() => runAndClose(onInstallAppClick)}
                    className="mb-3 flex w-full items-center gap-3 rounded-full px-5 py-3 text-left text-on-surface-variant transition-colors hover:bg-surface-container-highest/70 hover:text-on-surface"
                  >
                    <Download className="h-5 w-5" />
                    <span className="font-headline text-lg font-medium">Install App</span>
                  </button>
                )}
                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => runAndClose(onSignOut)}
                    className="flex w-full items-center gap-3 rounded-full px-5 py-3 text-left text-error transition-colors hover:bg-error/10"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-headline text-lg font-medium">Sign Out</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
