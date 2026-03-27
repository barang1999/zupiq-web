import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  GitFork,
  HelpCircle,
  History,
  Layers,
  Loader2,
  LogOut,
  Sparkles,
  Users,
} from 'lucide-react';
import { AppHeader } from '../components/layout/AppHeader';
import { supabase } from '../lib/supabase';
import { firebaseSignOut } from '../lib/firebase';
import {
  cancelSubscription,
  getBillingCatalog,
  getBillingSubscription,
  subscribeToPlan,
  type EffectiveAccessState,
  type PlanCatalogItem,
  type PlanKey,
  type UsageSnapshot,
} from '../lib/billing';

interface Props {
  user: any;
  onNavigateStudy?: () => void;
  onNavigateHistory?: () => void;
  onNavigateFlashcards?: () => void;
  onNavigateSettings?: () => void;
  showInstallAppButton?: boolean;
  onInstallApp?: () => void;
  onRequireAuth?: () => void;
}

interface PlanMarketingCopy {
  cta: string;
  description: string;
  features: string[];
  highlight?: boolean;
}

const PLAN_MARKETING: Record<PlanKey, PlanMarketingCopy> = {
  free: {
    cta: 'Start Learning',
    description: 'Fundamental AI access for new learners exploring Zupiq.',
    features: ['Basic Breakdowns', '3 Deep Dive chats per day', 'Standard Response Queue'],
  },
  core: {
    cta: 'Upgrade to Builder',
    description: 'Best for regular student workflows and daily study sessions.',
    features: [
      'Unlimited Deep Dive chats',
      'Knowledge Maps enabled',
      'AI Tutor access',
      'Faster generation speed',
    ],
    highlight: true,
  },
  pro: {
    cta: 'Upgrade to Architect',
    description: 'For heavy daily use with priority processing and full exports.',
    features: [
      'Everything in Builder',
      'Knowledge map export',
      'Priority processing',
      'Full premium model tier',
    ],
  },
};

export default function PlanPage({
  user,
  onNavigateStudy,
  onNavigateHistory,
  onNavigateFlashcards,
  onNavigateSettings,
  showInstallAppButton,
  onInstallApp,
  onRequireAuth,
}: Props) {
  const isAuthenticated = Boolean(user?.id || user?.email);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);
  const [catalog, setCatalog] = useState<PlanCatalogItem[]>([]);
  const [accessState, setAccessState] = useState<EffectiveAccessState | null>(null);
  const [usageState, setUsageState] = useState<UsageSnapshot | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [actionPlanKey, setActionPlanKey] = useState<PlanKey | null>(null);
  const isExpanded = sidebarOpen || sidebarHovered;

  const loadBilling = async () => {
    setPricingLoading(true);
    try {
      const catalogRes = await getBillingCatalog();
      setCatalog(catalogRes.plans);
      if (isAuthenticated) {
        const subscriptionRes = await getBillingSubscription();
        setAccessState(subscriptionRes.access);
        setUsageState(subscriptionRes.usage);
      } else {
        setAccessState(null);
        setUsageState(null);
      }
      setPricingError(null);
    } catch (err: any) {
      setPricingError(err?.message ?? 'Failed to load subscription data');
    } finally {
      setPricingLoading(false);
    }
  };

  useEffect(() => {
    void loadBilling();
  }, [isAuthenticated]);

  const supportsAnnualBilling = useMemo(
    () => catalog.some((tier) => typeof tier.pricing.annual === 'number'),
    [catalog]
  );

  const formatPrice = (price: number): string => {
    return Number.isInteger(price) ? price.toFixed(0) : price.toFixed(2);
  };

  const pricing = useMemo(
    () =>
      catalog
        .slice()
        .sort((a, b) => a.rank - b.rank)
        .map((tier) => ({
        ...tier,
        marketing: PLAN_MARKETING[tier.planKey as PlanKey] ?? PLAN_MARKETING.free,
        price: annualBilling && typeof tier.pricing.annual === 'number'
          ? tier.pricing.annual
          : tier.pricing.monthly,
      })),
    [annualBilling, catalog]
  );

  const handlePlanSelection = async (planKey: PlanKey) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (!accessState) return;
    if (accessState.effectivePlanKey === planKey) return;

    setActionPlanKey(planKey);
    setPricingError(null);

    try {
      if (planKey === 'free') {
        const result = await cancelSubscription('immediate');
        setAccessState(result.access);
        setUsageState(result.usage);
      } else {
        const result = await subscribeToPlan({
          planKey,
          provider: 'stripe',
          billingInterval: annualBilling ? 'annual' : 'monthly',
        });

        if (result.mode === 'checkout_required' && result.checkout?.checkoutUrl) {
          window.location.href = result.checkout.checkoutUrl;
          return;
        }

        if (result.access) setAccessState(result.access);
        if (result.usage) setUsageState(result.usage);
      }
    } catch (err: any) {
      setPricingError(err?.message ?? 'Failed to update subscription');
    } finally {
      setActionPlanKey(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const NAV_ITEMS = [
    { id: 'study', label: 'Study Space', Icon: GitFork, action: () => onNavigateStudy?.() },
    { id: 'history', label: 'Learning History', Icon: History, action: () => onNavigateHistory?.() },
    { id: 'flashcards', label: 'Flashcards', Icon: Layers, action: () => onNavigateFlashcards?.() },
    { id: 'plans', label: 'Neural Plans', Icon: Sparkles, action: () => {} },
    { id: 'collab', label: 'Collaborate', Icon: Users, action: () => {} },
  ];

  const faqs = [
    {
      q: 'Can I upgrade mid-cycle?',
      a: 'Yes. Upgrades are prorated and your new tier is activated immediately.',
    },
    {
      q: 'Is my data private?',
      a: 'All plan tiers use encrypted storage and secured processing boundaries.',
    },
    {
      q: 'Can I cancel anytime?',
      a: 'You can cancel at any time. Access remains through the paid period end date.',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-container/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary-container/5 blur-[120px] rounded-full pointer-events-none" />

      <AppHeader
        user={user}
        onSettingsClick={onNavigateSettings}
        onSignOut={isAuthenticated ? handleSignOut : undefined}
        onNavigateStudy={onNavigateStudy}
        onNavigateHistory={onNavigateHistory}
        onNavigateFlashcards={onNavigateFlashcards}
        activeMobileMenu={null}
        showInstallAppButton={showInstallAppButton}
        onInstallAppClick={onInstallApp}
      />

      <motion.aside
        animate={{ width: isExpanded ? 256 : 64 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className="fixed left-0 h-full z-40 bg-surface-container-low hidden sm:flex flex-col pt-20 pb-6 text-sm font-medium overflow-hidden"
        style={{ width: isExpanded ? 256 : 64 }}
      >
        <div className={`mb-8 overflow-hidden transition-all duration-200 ${isExpanded ? 'px-6' : 'px-0 flex justify-center'}`}>
          {isExpanded ? (
            <div>
              <h2 className="font-headline font-bold text-lg text-secondary leading-tight whitespace-nowrap">Neural Tiers</h2>
              <p className="text-on-surface-variant text-xs uppercase tracking-widest opacity-70 mt-1 whitespace-nowrap">Pricing Matrix</p>
            </div>
          ) : (
            <Sparkles className="w-5 h-5 text-secondary" />
          )}
        </div>

        <nav className="flex-1 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ id, label, Icon, action }) => {
            const isActive = id === 'plans';
            return (
              <button
                key={id}
                onClick={action}
                title={!isExpanded ? label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 transition-all duration-200 text-left ${
                  isActive
                    ? isExpanded
                      ? 'rounded-r-full bg-gradient-to-r from-primary/20 to-transparent text-primary border-l-4 border-primary'
                      : 'rounded-xl bg-primary/15 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface rounded-xl'
                } ${!isExpanded ? 'justify-center' : ''}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {isExpanded && <span className="overflow-hidden whitespace-nowrap">{label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4 px-2">
          {isExpanded && (
            <button
              onClick={() => onNavigateStudy?.()}
              className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-primary to-secondary text-on-primary text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity whitespace-nowrap overflow-hidden"
            >
              Back To Study
            </button>
          )}
          <div className={`pt-4 border-t border-outline-variant/20 flex flex-col gap-2 ${!isExpanded ? 'items-center' : ''}`}>
            <a href="#" className={`flex items-center gap-3 text-on-surface-variant hover:text-on-surface transition-colors ${!isExpanded ? 'justify-center p-2 rounded-xl hover:bg-surface-container' : 'px-1'}`}>
              <HelpCircle className="w-4 h-4 shrink-0" />
              {isExpanded && <span className="text-xs whitespace-nowrap">Support</span>}
            </a>
            {isAuthenticated && (
              <button
                onClick={handleSignOut}
                className={`flex items-center gap-3 text-on-surface-variant hover:text-error transition-colors ${!isExpanded ? 'justify-center p-2 rounded-xl hover:bg-surface-container' : 'px-1'}`}
              >
                <LogOut className="w-4 h-4 shrink-0" />
                {isExpanded && <span className="text-xs whitespace-nowrap">Sign Out</span>}
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      <motion.button
        animate={{ left: isExpanded ? 244 : 52 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        onClick={() => setSidebarOpen((open) => !open)}
        title={sidebarOpen ? 'Unpin sidebar' : 'Pin sidebar open'}
        className="fixed top-[72px] z-50 w-6 h-6 rounded-full bg-surface-container-highest border border-outline-variant/40 hidden sm:flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors shadow-md"
      >
        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.25 }}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </motion.div>
      </motion.button>

      <motion.main
        animate={{ paddingLeft: isExpanded ? 256 : 64 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="pt-24 pb-28 px-6 min-h-screen relative z-10"
      >
        <div className="max-w-7xl mx-auto">
          <section className="text-center mb-14 relative">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[780px] h-[420px] bg-secondary-container/10 blur-[120px] rounded-full pointer-events-none" />
            <h1 className="font-headline text-5xl sm:text-7xl font-bold tracking-tighter mb-5 relative z-10">
              Select Your <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Neural Tier</span>
            </h1>
            <p className="text-on-surface-variant text-base sm:text-xl max-w-3xl mx-auto relative z-10">
              Elevate your cognitive architecture with intelligence layers designed for precision, speed, and deep discovery.
            </p>

            {supportsAnnualBilling ? (
              <div className="mt-10 flex items-center justify-center gap-4 relative z-10">
                <span className={`text-sm ${annualBilling ? 'text-on-surface-variant' : 'text-on-surface'}`}>Monthly</span>
                <button
                  onClick={() => setAnnualBilling((value) => !value)}
                  className="w-16 h-8 rounded-full bg-surface-container-highest p-1 border border-primary/20"
                  aria-label="Toggle billing cycle"
                >
                  <div
                    className={`h-6 w-6 rounded-full bg-primary transition-transform ${annualBilling ? 'translate-x-8' : 'translate-x-0'}`}
                  />
                </button>
                <span className={`text-sm ${annualBilling ? 'text-on-surface' : 'text-on-surface-variant'}`}>Annual</span>
              </div>
            ) : (
              <p className="mt-8 text-sm text-on-surface-variant relative z-10">Monthly pricing is currently active.</p>
            )}

            {isAuthenticated && accessState && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface-container-highest/70 border border-outline-variant/20 px-4 py-2 text-xs relative z-10">
                <span className="text-on-surface-variant">Current plan:</span>
                <span className="font-bold text-primary">{accessState.effectivePlan.displayName}</span>
                <span className="text-on-surface-variant">({accessState.subscription.status})</span>
                {usageState?.limit !== null && (
                  <span className="text-on-surface-variant">Deep Dive: {usageState?.used ?? 0}/{usageState?.limit}</span>
                )}
              </div>
            )}

            {pricingError && (
              <p className="mt-4 text-sm text-error relative z-10">{pricingError}</p>
            )}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {pricingLoading && (
              <div className="col-span-full flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            {!pricingLoading && pricing.map((tier) => {
              const marketing = PLAN_MARKETING[tier.planKey as PlanKey] ?? PLAN_MARKETING.free;
              const isCurrent = accessState?.effectivePlanKey === tier.planKey;
              const isActioning = actionPlanKey === tier.planKey;
              const isDowngradeToFree = tier.planKey === 'free' && accessState?.effectivePlanKey !== 'free';
              const ctaLabel = !isAuthenticated
                ? (tier.planKey === 'free' ? 'Get Started Free' : `Choose ${tier.displayName}`)
                : isCurrent
                ? (accessState?.subscription.cancelAtPeriodEnd ? 'Current (Cancel Scheduled)' : 'Current Plan')
                : isDowngradeToFree
                  ? 'Downgrade to Scholar'
                  : marketing.cta;

              return (
              <article
                key={tier.planKey}
                className={`rounded-3xl p-8 border backdrop-blur-xl transition-all ${
                  marketing.highlight
                    ? 'bg-surface-container-highest/65 border-primary shadow-[0_0_50px_rgba(161,250,255,0.15)] md:-translate-y-3'
                    : 'bg-surface-container/45 border-outline-variant/20'
                }`}
              >
                {marketing.highlight && (
                  <div className="mb-4 inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-primary to-secondary text-on-primary">
                    Recommended
                  </div>
                )}
                <h3 className="font-headline text-2xl font-bold mb-2">{tier.displayName}</h3>
                <div className="flex items-end gap-1 mb-4">
                  <span className="text-4xl font-bold">${formatPrice(tier.price)}</span>
                  <span className="text-on-surface-variant text-sm">/mo</span>
                </div>
                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">{marketing.description}</p>
                <ul className="space-y-3 mb-7">
                  {marketing.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePlanSelection(tier.planKey as PlanKey)}
                  disabled={(isAuthenticated && isCurrent) || isActioning}
                  className={`w-full py-3.5 rounded-full font-bold transition-transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                    marketing.highlight
                      ? 'bg-gradient-to-r from-primary to-secondary text-on-primary'
                      : 'border border-outline-variant/40 bg-surface-container-highest text-on-surface'
                  }`}
                >
                  {isActioning ? 'Applying...' : ctaLabel}
                </button>
              </article>
              );
            })}
          </section>

          <section className="mb-16 overflow-hidden rounded-3xl bg-surface-container-low border border-outline-variant/15">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="bg-surface-container">
                    <th className="px-6 py-5 text-on-surface-variant font-medium text-sm">Metric</th>
                    <th className="px-6 py-5 font-headline font-bold">Scholar</th>
                    <th className="px-6 py-5 font-headline font-bold text-primary">Builder</th>
                    <th className="px-6 py-5 font-headline font-bold text-secondary">Architect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-sm">
                  <tr>
                    <td className="px-6 py-4 font-medium">Daily Deep Dive</td>
                    <td className="px-6 py-4">3 / Day</td>
                    <td className="px-6 py-4 font-semibold">Unlimited</td>
                    <td className="px-6 py-4 font-semibold">Unlimited</td>
                  </tr>
                  <tr className="bg-surface-container/30">
                    <td className="px-6 py-4 font-medium">Neural Map Exports</td>
                    <td className="px-6 py-4">No</td>
                    <td className="px-6 py-4">No</td>
                    <td className="px-6 py-4 font-semibold">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium">AI Logic Processing</td>
                    <td className="px-6 py-4">Standard</td>
                    <td className="px-6 py-4">Faster</td>
                    <td className="px-6 py-4 font-semibold">Priority</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="max-w-3xl mx-auto mb-16">
            <h2 className="font-headline text-3xl font-bold text-center mb-8">Inquiry Hub</h2>
            <div className="space-y-3">
              {faqs.map((item, index) => {
                const open = openFaqIndex === index;
                return (
                  <div key={item.q} className="bg-surface-container rounded-2xl p-5">
                    <button
                      className="w-full flex items-center justify-between text-left"
                      onClick={() => setOpenFaqIndex((current) => (current === index ? -1 : index))}
                    >
                      <span className="font-semibold">{item.q}</span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180 text-primary' : 'text-on-surface-variant'}`} />
                    </button>
                    {open && <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">{item.a}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="text-center rounded-[2.4rem] p-10 bg-surface-container-high border border-outline-variant/15 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 pointer-events-none" />
            <div className="relative z-10">
              <h2 className="font-headline text-4xl font-bold mb-4">Ready to expand your Cognitive Horizon?</h2>
              <p className="text-on-surface-variant text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of learners building the future of intelligence with Zupiq.
              </p>
              <button className="px-10 py-4 rounded-full bg-primary text-on-primary font-bold shadow-[0_0_24px_rgba(161,250,255,0.35)]">
                Start Your Journey
              </button>
            </div>
          </section>
        </div>
      </motion.main>
    </div>
  );
}
