import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Crown,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  XCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { firebaseSignOut } from "../lib/firebase";
import { PublicHeader } from "../components/layout/PublicHeader";
import {
  cancelSubscription,
  getBillingCatalog,
  getBillingSubscription,
  subscribeToPlan,
  type EffectiveAccessState,
  type PlanCatalogItem,
  type PlanKey,
  type SubscriptionStatus,
  type UsageSnapshot,
} from "../lib/billing";

interface Props {
  user: any;
  onNavigateStudy?: () => void;
  onNavigatePlan?: () => void;
  onNavigateHowItWorks?: () => void;
  onRequireAuth?: () => void;
}

interface PlanIntent {
  summary: string;
  features: string[];
  highlight?: boolean;
}

interface BillingEvent {
  id: string;
  event: string;
  date: string;
  amount: number;
  currency: string;
  status: "success" | "scheduled" | "warning" | "neutral";
}

const PLAN_INTENTS: Record<PlanKey, PlanIntent> = {
  free: {
    summary: "Essential AI features for getting started.",
    features: ["Basic breakdowns", "Daily token allowance", "Community support"],
  },
  core: {
    summary: "Best for consistent daily learning and tutor sessions.",
    features: ["Higher token allowance", "Knowledge maps", "AI tutor access"],
    highlight: true,
  },
  pro: {
    summary: "For advanced workflows and highest model priority.",
    features: ["Maximum daily tokens", "Priority processing", "Advanced exports"],
  },
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  free: "Free",
  trialing: "Trialing",
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
  expired: "Expired",
  paused: "Paused",
  incomplete: "Incomplete",
};

const STATUS_BADGE: Record<SubscriptionStatus, string> = {
  free: "bg-surface-container-high text-on-surface-variant",
  trialing: "bg-tertiary/15 text-tertiary",
  active: "bg-primary/15 text-primary",
  past_due: "bg-error/20 text-error",
  canceled: "bg-surface-container-high text-on-surface-variant",
  expired: "bg-surface-container-high text-on-surface-variant",
  paused: "bg-secondary/20 text-secondary",
  incomplete: "bg-error/20 text-error",
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toFixed(2)}`;
  }
}

function formatDate(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusToEventState(status: SubscriptionStatus): BillingEvent["status"] {
  if (status === "active" || status === "trialing") return "success";
  if (status === "past_due" || status === "incomplete") return "warning";
  return "neutral";
}

export default function BillingSubscriptionPage({
  user,
  onNavigateStudy,
  onNavigatePlan,
  onNavigateHowItWorks,
  onRequireAuth,
}: Props) {
  const isAuthenticated = Boolean(user?.id || user?.email);

  const [annualBilling, setAnnualBilling] = useState(false);
  const [catalog, setCatalog] = useState<PlanCatalogItem[]>([]);
  const [accessState, setAccessState] = useState<EffectiveAccessState | null>(null);
  const [usageState, setUsageState] = useState<UsageSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionPlanKey, setActionPlanKey] = useState<PlanKey | null>(null);
  const [cancelMode, setCancelMode] = useState<"immediate" | "period_end" | null>(null);

  const loadBilling = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const catalogResponse = await getBillingCatalog();
      setCatalog(catalogResponse.plans);

      if (isAuthenticated) {
        const subscriptionResponse = await getBillingSubscription();
        setAccessState(subscriptionResponse.access);
        setUsageState(subscriptionResponse.usage);
      } else {
        setAccessState(null);
        setUsageState(null);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load billing data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadBilling(false);
  }, [isAuthenticated]);

  const sortedCatalog = useMemo(
    () => catalog.slice().sort((a, b) => a.rank - b.rank),
    [catalog]
  );

  const supportsAnnualBilling = useMemo(
    () => catalog.some((plan) => typeof plan.pricing.annual === "number"),
    [catalog]
  );

  const pricing = useMemo(
    () =>
      sortedCatalog.map((plan) => ({
        ...plan,
        amount:
          annualBilling && typeof plan.pricing.annual === "number"
            ? plan.pricing.annual
            : plan.pricing.monthly,
      })),
    [annualBilling, sortedCatalog]
  );

  const billingEvents = useMemo(() => {
    const subscription = accessState?.subscription;
    if (!subscription) return [] as BillingEvent[];

    const events: BillingEvent[] = [];

    if (subscription.updatedAt) {
      events.push({
        id: "subscription-updated",
        event: "Subscription updated",
        date: subscription.updatedAt,
        amount: subscription.amount,
        currency: subscription.currency,
        status: statusToEventState(subscription.status),
      });
    }

    if (subscription.currentPeriodStart) {
      events.push({
        id: "current-cycle-start",
        event: "Cycle started",
        date: subscription.currentPeriodStart,
        amount: subscription.amount,
        currency: subscription.currency,
        status: "success",
      });
    }

    if (subscription.currentPeriodEnd) {
      events.push({
        id: "next-cycle-marker",
        event: subscription.cancelAtPeriodEnd ? "Cancellation date" : "Next renewal",
        date: subscription.currentPeriodEnd,
        amount: subscription.amount,
        currency: subscription.currency,
        status: subscription.cancelAtPeriodEnd ? "scheduled" : "neutral",
      });
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [accessState]);

  const handlePlanSelection = async (planKey: PlanKey) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (!accessState) return;

    const isCurrentPlan = accessState.effectivePlanKey === planKey;
    if (isCurrentPlan && !accessState.subscription.cancelAtPeriodEnd) return;

    setActionPlanKey(planKey);
    setError(null);

    try {
      if (planKey === "free") {
        const result = await cancelSubscription("immediate");
        setAccessState(result.access);
        setUsageState(result.usage);
        return;
      }

      const result = await subscribeToPlan({
        planKey,
        provider: "stripe",
        billingInterval: annualBilling ? "annual" : "monthly",
      });

      if (result.mode === "checkout_required" && result.checkout?.checkoutUrl) {
        window.location.href = result.checkout.checkoutUrl;
        return;
      }

      if (result.access) setAccessState(result.access);
      if (result.usage) setUsageState(result.usage);
    } catch (err: any) {
      setError(err?.message ?? "Failed to update subscription");
    } finally {
      setActionPlanKey(null);
    }
  };

  const handleCancel = async (mode: "immediate" | "period_end") => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (!accessState || accessState.effectivePlanKey === "free") return;

    setCancelMode(mode);
    setError(null);

    try {
      const result = await cancelSubscription(mode);
      setAccessState(result.access);
      setUsageState(result.usage);
    } catch (err: any) {
      setError(err?.message ?? "Failed to cancel subscription");
    } finally {
      setCancelMode(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await firebaseSignOut();
  };

  const currentSubscription = accessState?.subscription;
  const currentPlan = accessState?.effectivePlan;
  const hasUsageLimit = typeof usageState?.limit === "number";
  const currentUsageRatio = useMemo(() => {
    if (!usageState || usageState.limit === null || usageState.limit <= 0) return null;
    return Math.min(100, Math.max(0, (usageState.used / usageState.limit) * 100));
  }, [usageState]);

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-8%] h-[45%] w-[45%] rounded-full bg-primary-container/8 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-12%] right-[-10%] h-[45%] w-[45%] rounded-full bg-secondary-container/10 blur-[130px] pointer-events-none" />

      <PublicHeader
        user={user}
        onAuthClick={() => onRequireAuth?.()}
        onSignOut={isAuthenticated ? handleSignOut : undefined}
        onNavigateHome={onNavigateStudy}
        onNavigatePlan={onNavigatePlan}
        onNavigateHowItWorks={onNavigateHowItWorks}
        activePage="plan"
      />

      <main className="relative z-10 px-4 sm:px-6 pt-28 pb-24">
        <div className="mx-auto max-w-7xl">
          <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tertiary">Billing Control</p>
              <h1 className="mt-2 font-headline text-4xl sm:text-5xl font-bold tracking-tight">Subscription &amp; Billing</h1>
              <p className="mt-3 max-w-2xl text-on-surface-variant text-sm sm:text-base">
                Review plan status, billing cycle, and token usage in one place.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => void loadBilling(true)}
                disabled={refreshing || loading}
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-highest/55 px-5 py-2.5 text-sm font-medium hover:bg-surface-container-highest/80 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
              <button
                onClick={() => onNavigatePlan?.()}
                className="rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-bold text-on-primary hover:opacity-90"
              >
                Compare Plans
              </button>
            </div>
          </header>

          {error && (
            <div className="mb-8 rounded-2xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {!isAuthenticated && (
                <section className="mb-10 rounded-[2rem] bg-surface-container p-8 sm:p-10">
                  <div className="max-w-2xl">
                    <h2 className="font-headline text-3xl font-bold">Sign in to manage billing</h2>
                    <p className="mt-3 text-on-surface-variant">
                      Billing actions require an authenticated account so plan changes can be linked to your user profile.
                    </p>
                    <button
                      onClick={() => onRequireAuth?.()}
                      className="mt-6 rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-3 font-bold text-on-primary"
                    >
                      Continue to Sign In
                    </button>
                  </div>
                </section>
              )}

              {accessState && currentSubscription && currentPlan && (
                <section className="grid grid-cols-1 gap-6 md:grid-cols-12 mb-10">
                  <motion.article
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-7 rounded-[1.6rem] p-[1px] bg-gradient-to-br from-primary/70 via-secondary/40 to-tertiary/30"
                  >
                    <div className="h-full rounded-[1.5rem] bg-surface-container-highest/70 p-6 sm:p-8 backdrop-blur-xl glow-corner">
                      <div className="mb-7 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tertiary">Active Protocol</p>
                          <h2 className="mt-2 font-headline text-3xl sm:text-4xl font-bold">{currentPlan.displayName}</h2>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-[0_0_24px_rgba(161,250,255,0.35)]">
                          <Crown className="h-7 w-7" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Current Charge</p>
                          <p className="mt-2 text-2xl font-headline font-bold">
                            {formatMoney(currentSubscription.amount, currentSubscription.currency)}
                            <span className="ml-1 text-sm text-on-surface-variant">/{currentSubscription.billingInterval === "annual" ? "yr" : "mo"}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-on-surface-variant">Next Billing Date</p>
                          <p className="mt-2 text-2xl font-headline font-bold">{formatDate(currentSubscription.currentPeriodEnd)}</p>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[currentSubscription.status]}`}>
                          {STATUS_LABELS[currentSubscription.status]}
                        </span>
                        <span className="rounded-full bg-surface-container-high px-3 py-1 text-xs text-on-surface-variant">
                          Provider: {currentSubscription.provider === "none" ? "None" : currentSubscription.provider}
                        </span>
                        {currentSubscription.cancelAtPeriodEnd && (
                          <span className="rounded-full bg-error/15 px-3 py-1 text-xs text-error">Cancel scheduled</span>
                        )}
                      </div>

                      <div className="mt-7 rounded-2xl bg-surface-container-low p-4">
                        <div className="mb-2 flex items-center justify-between text-xs text-on-surface-variant">
                          <span>Daily Deep Dive usage</span>
                          <span>
                            {usageState?.used ?? 0}
                            {hasUsageLimit ? ` / ${usageState?.limit}` : " tokens"}
                          </span>
                        </div>
                        {currentUsageRatio !== null ? (
                          <div className="h-2 rounded-full bg-surface-container-high">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-primary to-secondary"
                              style={{ width: `${currentUsageRatio}%` }}
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-on-surface-variant">Unlimited daily allocation.</p>
                        )}
                      </div>

                      <div className="mt-8 flex flex-wrap gap-3">
                        <button
                          onClick={() => document.getElementById("billing-plan-switcher")?.scrollIntoView({ behavior: "smooth" })}
                          className="rounded-full bg-gradient-to-r from-primary to-secondary px-6 py-2.5 text-sm font-bold text-on-primary"
                        >
                          Change Plan
                        </button>
                        {currentSubscription.planKey !== "free" && (
                          <>
                            <button
                              onClick={() => void handleCancel("period_end")}
                              disabled={cancelMode !== null || currentSubscription.cancelAtPeriodEnd}
                              className="rounded-full bg-surface-container-high px-6 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-highest disabled:opacity-60"
                            >
                              {cancelMode === "period_end" ? "Scheduling..." : currentSubscription.cancelAtPeriodEnd ? "Cancellation Scheduled" : "Cancel at Period End"}
                            </button>
                            <button
                              onClick={() => void handleCancel("immediate")}
                              disabled={cancelMode !== null}
                              className="rounded-full bg-error/15 px-6 py-2.5 text-sm font-medium text-error hover:bg-error/25 disabled:opacity-60"
                            >
                              {cancelMode === "immediate" ? "Canceling..." : "Cancel Now"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.article>

                  <div className="md:col-span-5 flex flex-col gap-6">
                    <article className="rounded-3xl bg-surface-container p-6 sm:p-7">
                      <div className="mb-5 flex items-center justify-between">
                        <h3 className="font-headline text-xl font-bold">Payment Method</h3>
                        <CreditCard className="h-5 w-5 text-on-surface-variant" />
                      </div>
                      <div className="rounded-2xl bg-surface-container-low p-4">
                        <p className="text-sm font-medium text-on-surface">
                          {currentSubscription.provider === "stripe" ? "Managed by Stripe Checkout" : "No direct card management enabled"}
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {currentSubscription.providerCustomerId
                            ? `Customer: ${currentSubscription.providerCustomerId}`
                            : "Card and invoice details are managed by your active billing provider."}
                        </p>
                      </div>
                      <div className="mt-5 space-y-2 text-xs text-on-surface-variant">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span>Encrypted billing metadata and secure provider handoff</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-secondary" />
                          <span>To update payment details, start a plan checkout flow</span>
                        </div>
                      </div>
                    </article>

                    <article className="rounded-3xl bg-surface-container-low p-6">
                      <p className="text-xs uppercase tracking-[0.18em] text-on-surface-variant">Account Billing Profile</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <p>
                          <span className="text-on-surface-variant">Subscription ID:</span>{" "}
                          <span className="font-medium">{currentSubscription.subscriptionId ?? "N/A"}</span>
                        </p>
                        <p>
                          <span className="text-on-surface-variant">Current status:</span>{" "}
                          <span className="font-medium">{STATUS_LABELS[currentSubscription.status]}</span>
                        </p>
                        <p>
                          <span className="text-on-surface-variant">Last update:</span>{" "}
                          <span className="font-medium">{formatDate(currentSubscription.updatedAt)}</span>
                        </p>
                      </div>
                    </article>
                  </div>
                </section>
              )}

              <section id="billing-plan-switcher" className="mb-10">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-headline text-2xl sm:text-3xl font-bold">Change Subscription Plan</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">Switch plans instantly. Stripe checkout opens when required.</p>
                  </div>

                  {supportsAnnualBilling && (
                    <div className="inline-flex items-center gap-3 rounded-full bg-surface-container-high px-3 py-2 text-sm">
                      <span className={annualBilling ? "text-on-surface-variant" : "text-on-surface"}>Monthly</span>
                      <button
                        onClick={() => setAnnualBilling((v) => !v)}
                        className="h-7 w-14 rounded-full bg-surface-container-highest p-1"
                        aria-label="Toggle billing cycle"
                      >
                        <div className={`h-5 w-5 rounded-full bg-primary transition-transform ${annualBilling ? "translate-x-7" : "translate-x-0"}`} />
                      </button>
                      <span className={annualBilling ? "text-on-surface" : "text-on-surface-variant"}>Annual</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  {pricing.map((tier) => {
                    const marketing = PLAN_INTENTS[tier.planKey as PlanKey] ?? PLAN_INTENTS.free;
                    const isCurrent = accessState?.effectivePlanKey === tier.planKey;
                    const isActioning = actionPlanKey === tier.planKey;
                    const showReEnable = Boolean(isCurrent && accessState?.subscription.cancelAtPeriodEnd);

                    return (
                      <article
                        key={tier.planKey}
                        className={`rounded-3xl p-6 border transition-colors ${
                          marketing.highlight
                            ? "border-primary/40 bg-surface-container-highest/60"
                            : "border-outline-variant/20 bg-surface-container/45"
                        }`}
                      >
                        {marketing.highlight && (
                          <div className="mb-3 inline-flex rounded-full bg-gradient-to-r from-primary to-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-on-primary">
                            Recommended
                          </div>
                        )}
                        <h3 className="font-headline text-2xl font-bold">{tier.displayName}</h3>
                        <p className="mt-3 text-3xl font-headline font-bold">
                          {formatMoney(tier.amount, tier.pricing.currency)}
                          <span className="ml-1 text-sm text-on-surface-variant">/mo</span>
                        </p>
                        <p className="mt-3 text-sm text-on-surface-variant">{marketing.summary}</p>
                        <ul className="mt-4 space-y-2">
                          {marketing.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => void handlePlanSelection(tier.planKey as PlanKey)}
                          disabled={(isCurrent && !showReEnable) || isActioning}
                          className={`mt-6 w-full rounded-full py-3 text-sm font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-60 ${
                            marketing.highlight
                              ? "bg-gradient-to-r from-primary to-secondary text-on-primary"
                              : "bg-surface-container-high text-on-surface"
                          }`}
                        >
                          {isActioning
                            ? "Applying..."
                            : !isAuthenticated
                              ? "Sign in to continue"
                              : isCurrent
                                ? showReEnable
                                  ? "Re-activate Plan"
                                  : "Current Plan"
                                : tier.planKey === "free"
                                  ? "Downgrade to Free"
                                  : `Switch to ${tier.displayName}`}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-headline text-2xl sm:text-3xl font-bold">Billing Activity</h2>
                  {billingEvents.length === 0 && (
                    <span className="text-xs text-on-surface-variant">No billing events yet</span>
                  )}
                </div>

                {billingEvents.length > 0 ? (
                  <div className="overflow-x-auto rounded-[1.7rem] bg-surface-container border border-outline-variant/15">
                    <table className="w-full min-w-[620px] text-left">
                      <thead>
                        <tr className="bg-surface-container-high/55 text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Event</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingEvents.map((event) => (
                          <tr key={event.id} className="border-t border-outline-variant/10">
                            <td className="px-6 py-4 text-sm">{formatDate(event.date)}</td>
                            <td className="px-6 py-4 text-sm text-on-surface-variant">{event.event}</td>
                            <td className="px-6 py-4 text-sm font-medium">{formatMoney(event.amount, event.currency)}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  event.status === "success"
                                    ? "bg-primary/15 text-primary"
                                    : event.status === "scheduled"
                                      ? "bg-secondary/20 text-secondary"
                                      : event.status === "warning"
                                        ? "bg-error/20 text-error"
                                        : "bg-surface-container-high text-on-surface-variant"
                                }`}
                              >
                                {event.status === "success"
                                  ? "Success"
                                  : event.status === "scheduled"
                                    ? "Scheduled"
                                    : event.status === "warning"
                                      ? "Attention"
                                      : "Info"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-surface-container p-5 text-sm text-on-surface-variant">
                    Billing records appear after your first subscription update.
                  </div>
                )}

                {accessState && accessState.subscription.provider !== "stripe" && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant">
                    <AlertTriangle className="h-4 w-4 text-tertiary" />
                    <span>Detailed invoice PDFs are not available for this billing provider yet.</span>
                  </div>
                )}

                {accessState?.subscription.status === "past_due" && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
                    <XCircle className="h-4 w-4" />
                    <span>Your subscription is past due. Choose a plan to restart billing.</span>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
