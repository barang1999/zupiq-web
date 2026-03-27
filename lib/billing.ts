import { api } from "./api";

export type PlanKey = "free" | "core" | "pro";
export type SubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "paused"
  | "incomplete";

export interface PlanCatalogItem {
  planKey: PlanKey;
  displayName: string;
  rank: number;
  active: boolean;
  public: boolean;
  pricing: {
    monthly: number;
    annual?: number | null;
    currency: string;
  };
  entitlements: Record<string, unknown>;
}

export interface NormalizedSubscription {
  subscriptionId: string | null;
  userId: string;
  workspaceId: string | null;
  planKey: PlanKey;
  status: SubscriptionStatus;
  provider: "none" | "stripe" | "revenuecat" | "manual";
  billingInterval: "monthly" | "annual" | null;
  amount: number;
  currency: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  grantedBy: string;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EffectiveAccessState {
  subscription: NormalizedSubscription;
  effectivePlanKey: PlanKey;
  effectivePlan: PlanCatalogItem;
  entitlements: Record<string, unknown>;
}

export interface UsageSnapshot {
  featureKey: string;
  used: number;
  limit: number | null;
  remaining: number | null;
}

export interface BillingCatalogResponse {
  plans: PlanCatalogItem[];
  providerMappings: Array<{
    planKey: PlanKey;
    provider: "stripe" | "revenuecat";
    environment: "development" | "production";
    productId: string | null;
    priceIdMonthly: string | null;
    priceIdAnnual: string | null;
    active: boolean;
  }>;
}

export interface BillingSubscriptionResponse {
  access: EffectiveAccessState;
  usage: UsageSnapshot;
}

export async function getBillingCatalog(): Promise<BillingCatalogResponse> {
  return api.get<BillingCatalogResponse>("/api/billing/catalog");
}

export async function getBillingSubscription(): Promise<BillingSubscriptionResponse> {
  return api.get<BillingSubscriptionResponse>("/api/billing/subscription");
}

export async function subscribeToPlan(payload: {
  planKey: PlanKey;
  provider?: "manual" | "stripe";
  billingInterval?: "monthly" | "annual";
}): Promise<{
  mode: "activated" | "checkout_required";
  access?: EffectiveAccessState;
  usage?: UsageSnapshot;
  checkout?: {
    provider: "stripe";
    checkoutUrl: string;
    priceId: string;
  };
}> {
  return api.post("/api/billing/subscribe", payload);
}

export async function cancelSubscription(mode: "immediate" | "period_end"): Promise<{
  mode: "immediate" | "period_end";
  access: EffectiveAccessState;
  usage: UsageSnapshot;
}> {
  return api.post("/api/billing/cancel", { mode });
}
