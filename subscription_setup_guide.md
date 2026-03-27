Zupiq Subscription Structure Spec

Purpose

This document defines a professional, scalable subscription architecture for Zupiq so an AI agent or developer can implement billing, access control, pricing, upgrades, downgrades, and future expansion with minimal ambiguity.

⸻

1. Product Positioning

Zupiq is currently positioned primarily for:
	•	Students
	•	Individual learners
	•	Solo knowledge builders

Zupiq is not yet primarily positioned for large teams or enterprise, so pricing, entitlements, and plan naming should reflect that.

The current target pricing model is:
	•	Free: $0
	•	Core paid: $5
	•	Advanced paid: $9.99

This pricing should remain simple, understandable, and psychologically accessible to students.

⸻

2. Guiding Principles

2.1 Simplicity first

The subscription system should be easy for users to understand and easy for engineers or AI agents to maintain.

2.2 Entitlement-driven architecture

Access should be controlled by entitlements/features, not hardcoded by plan name throughout the codebase.

2.3 Provider-agnostic billing

Billing logic should support multiple providers in the future, such as:
	•	Stripe
	•	RevenueCat
	•	App Store / Google Play
	•	Promotional/manual grants

2.4 Scalable plan evolution

The architecture should support future additions without breaking old subscriptions, such as:
	•	annual billing
	•	student discount campaigns
	•	educator plans
	•	team plans
	•	institution plans
	•	promo access
	•	grandfathered pricing

2.5 Safe source of truth

The system should have one normalized subscription record per workspace/user access context that defines the effective plan and entitlements.

⸻

3. Recommended Plan Structure

3.1 Public plan tiers

Free
	•	planKey: free
	•	displayName: Scholar
	•	priceMonthly: 0
	•	targetUser: new users, casual learners, exploration

Core
	•	planKey: core
	•	displayName: Builder
	•	priceMonthly: 5
	•	targetUser: students and regular individual users
	•	This should be the recommended / most popular plan.

Pro
	•	planKey: pro
	•	displayName: Architect
	•	priceMonthly: 9.99
	•	targetUser: heavier users who rely on Zupiq daily

⸻

4. Recommended Entitlement Model

Each plan should resolve to a set of entitlements.

4.1 Core entitlement keys

Use stable machine-friendly keys like:
	•	basic_breakdowns
	•	deep_dive_access
	•	daily_deep_dive_limit
	•	knowledge_maps
	•	knowledge_map_export
	•	ai_tutor
	•	priority_processing
	•	larger_project_capacity
	•	faster_generation
	•	premium_models

4.2 Suggested entitlement matrix

Free (free)
	•	basic_breakdowns: true
	•	deep_dive_access: true
	•	daily_deep_dive_limit: 3
	•	knowledge_maps: false or limited preview
	•	knowledge_map_export: false
	•	ai_tutor: false or limited
	•	priority_processing: false
	•	larger_project_capacity: false
	•	faster_generation: false
	•	premium_models: false

Core (core)
	•	basic_breakdowns: true
	•	deep_dive_access: true
	•	daily_deep_dive_limit: null or unlimited
	•	knowledge_maps: true
	•	knowledge_map_export: false
	•	ai_tutor: true
	•	priority_processing: false
	•	larger_project_capacity: moderate
	•	faster_generation: true
	•	premium_models: limited or standard premium tier

Pro (pro)
	•	basic_breakdowns: true
	•	deep_dive_access: true
	•	daily_deep_dive_limit: null or unlimited
	•	knowledge_maps: true
	•	knowledge_map_export: true
	•	ai_tutor: true
	•	priority_processing: true
	•	larger_project_capacity: high
	•	faster_generation: true
	•	premium_models: true

⸻

5. Data Model Recommendation

The system should separate:
	1.	Catalog definition
	2.	Provider product mapping
	3.	User subscription state
	4.	Effective entitlements

5.1 Plan catalog object

This is the internal product catalog.

{
  "planKey": "core",
  "displayName": "Builder",
  "rank": 20,
  "active": true,
  "public": true,
  "pricing": {
    "monthly": 5,
    "currency": "USD"
  },
  "entitlements": {
    "basic_breakdowns": true,
    "deep_dive_access": true,
    "daily_deep_dive_limit": null,
    "knowledge_maps": true,
    "knowledge_map_export": false,
    "ai_tutor": true,
    "priority_processing": false,
    "larger_project_capacity": "medium",
    "faster_generation": true,
    "premium_models": "standard"
  }
}

5.2 Provider mapping object

A plan may map to different provider product IDs.

{
  "planKey": "core",
  "provider": "stripe",
  "environment": "production",
  "productId": "prod_xxx",
  "priceIdMonthly": "price_xxx",
  "priceIdAnnual": null,
  "active": true
}

5.3 Subscription record

This should be normalized and independent from raw provider payloads.

{
  "subscriptionId": "sub_internal_001",
  "userId": "user_123",
  "workspaceId": null,
  "planKey": "core",
  "status": "active",
  "provider": "stripe",
  "providerCustomerId": "cus_xxx",
  "providerSubscriptionId": "sub_xxx",
  "billingInterval": "monthly",
  "currency": "USD",
  "amount": 5,
  "cancelAtPeriodEnd": false,
  "currentPeriodStart": "<iso_date>",
  "currentPeriodEnd": "<iso_date>",
  "trialStart": null,
  "trialEnd": null,
  "grantedBy": "billing",
  "metadata": {}
}


⸻

6. Access Control Recommendation

The app should never scatter checks like:
	•	if (plan === 'pro')
	•	if (price > 0)
	•	if (subscription.provider === 'stripe')

Instead, use a centralized access function.

6.1 Example access interface

canAccess(user, 'knowledge_maps')
getUsageLimit(user, 'daily_deep_dive_limit')
getEffectivePlan(user)

6.2 Rules
	•	All UI gating should use effective entitlements.
	•	All backend authorization should use effective entitlements.
	•	Provider-specific logic should stay in billing modules only.

⸻

7. Recommended Subscription Status Model

Use a normalized status set:
	•	free
	•	trialing
	•	active
	•	past_due
	•	canceled
	•	expired
	•	paused
	•	incomplete

Notes
	•	Free users should still have a normalized subscription/access state.
	•	Avoid null-state ambiguity.
	•	A user should always resolve to one effective access state.

⸻

8. Upgrade and Downgrade Rules

8.1 Upgrade

Upgrades should:
	•	apply access as soon as payment is confirmed
	•	preserve provider audit data
	•	update effective entitlements immediately

8.2 Downgrade

Downgrades should support two modes:
	•	Immediate downgrade
	•	Downgrade at period end

Recommended early behavior:
	•	Paid cancellation = keep access until current period end
	•	Then automatically resolve to free

8.3 Failed payment

If payment fails:
	•	keep provider status in sync
	•	optionally allow grace period
	•	eventually resolve to past_due then expired/free according to business rules

⸻

9. Usage Tracking

Some entitlements may be boolean, some numeric, some tiered.

Types of limits
	•	Boolean access: knowledge_maps = true
	•	Numeric quota: daily_deep_dive_limit = 3
	•	Tier label: premium_models = standard | full

Recommendation

Maintain a separate usage-tracking system from the subscription definition.

Example usage counters:
	•	daily deep dives used
	•	maps created
	•	exports generated
	•	active projects count

This avoids polluting the subscription record with transient usage data.

⸻

10. AI Agent Implementation Rules

Any AI agent responsible for setup or maintenance should follow these rules:

10.1 Never hardcode plan display text into authorization logic

Use planKey and entitlements.

10.2 Never treat missing subscription as an error state

Missing paid subscription should gracefully resolve to free access.

10.3 Always normalize provider webhooks/events

Store raw provider event separately if needed, but update one normalized subscription object.

10.4 Keep billing catalog separate from UI copy

Marketing copy changes often. Entitlement logic should not depend on headline wording.

10.5 Support future annual billing even if not enabled now

Design the schema so annual price IDs can be added later without migration pain.

⸻

11. Suggested Folder / Module Structure

/billing
  catalog.ts              # internal plan catalog
  entitlements.ts         # access resolution helpers
  providers/
    stripe.ts             # checkout, webhook normalization
    revenuecat.ts         # app store subscription normalization
  subscription-service.ts # main sync/update logic
  usage-service.ts        # counters and quota enforcement
  types.ts                # billing domain types


⸻

12. Recommended TypeScript Types

export type PlanKey = 'free' | 'core' | 'pro'

export type SubscriptionStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'paused'
  | 'incomplete'

export interface PlanCatalogItem {
  planKey: PlanKey
  displayName: string
  rank: number
  active: boolean
  public: boolean
  pricing: {
    monthly: number
    annual?: number | null
    currency: string
  }
  entitlements: Record<string, unknown>
}

export interface NormalizedSubscription {
  userId: string
  workspaceId?: string | null
  planKey: PlanKey
  status: SubscriptionStatus
  provider: 'none' | 'stripe' | 'revenuecat' | 'manual'
  billingInterval: 'monthly' | 'annual' | null
  amount: number
  currency: string
  cancelAtPeriodEnd: boolean
  currentPeriodStart?: string | null
  currentPeriodEnd?: string | null
  providerCustomerId?: string | null
  providerSubscriptionId?: string | null
  metadata?: Record<string, unknown>
}


⸻

13. Recommended Initial Catalog

export const PLAN_CATALOG = {
  free: {
    planKey: 'free',
    displayName: 'Scholar',
    rank: 10,
    active: true,
    public: true,
    pricing: { monthly: 0, currency: 'USD' },
    entitlements: {
      basic_breakdowns: true,
      deep_dive_access: true,
      daily_deep_dive_limit: 3,
      knowledge_maps: false,
      knowledge_map_export: false,
      ai_tutor: false,
      priority_processing: false,
      larger_project_capacity: 'small',
      faster_generation: false,
      premium_models: false,
    },
  },
  core: {
    planKey: 'core',
    displayName: 'Builder',
    rank: 20,
    active: true,
    public: true,
    pricing: { monthly: 5, currency: 'USD' },
    entitlements: {
      basic_breakdowns: true,
      deep_dive_access: true,
      daily_deep_dive_limit: null,
      knowledge_maps: true,
      knowledge_map_export: false,
      ai_tutor: true,
      priority_processing: false,
      larger_project_capacity: 'medium',
      faster_generation: true,
      premium_models: 'standard',
    },
  },
  pro: {
    planKey: 'pro',
    displayName: 'Architect',
    rank: 30,
    active: true,
    public: true,
    pricing: { monthly: 9.99, currency: 'USD' },
    entitlements: {
      basic_breakdowns: true,
      deep_dive_access: true,
      daily_deep_dive_limit: null,
      knowledge_maps: true,
      knowledge_map_export: true,
      ai_tutor: true,
      priority_processing: true,
      larger_project_capacity: 'large',
      faster_generation: true,
      premium_models: 'full',
    },
  },
} as const


⸻

14. Future Expansion Paths

The architecture should allow adding these later without major refactor:
	•	annual billing interval
	•	team plan
	•	edu or campus plan
	•	coupons and promo codes
	•	grandfathered pricing
	•	regional pricing
	•	free trials
	•	add-ons
	•	seat-based billing

Important

Do not overbuild these now in the UI, but keep the data model flexible enough for them.

⸻

15. Non-Goals for Current Phase

At the current Zupiq stage, avoid unnecessary complexity such as:
	•	enterprise contract workflows
	•	seat management
	•	custom invoicing
	•	account hierarchy for departments
	•	overly complex annual discount logic
	•	too many public plans

The current objective is:
	•	clear pricing
	•	strong student conversion
	•	easy implementation
	•	clean future upgrade path

⸻

16. Final Recommendation Summary

Zupiq should use a 3-tier subscription model with:
	•	free → Scholar → $0
	•	core → Builder → $5
	•	pro → Architect → $9.99

Implementation should be:
	•	entitlement-driven
	•	provider-agnostic
	•	normalized around one effective subscription state
	•	easy to scale later into annual, team, and institutional plans

This is the professional balance between:
	•	simplicity now
	•	scalability later
	•	clear student-first positioning

⸻

17. Optional Next Step

After this spec, the next implementation document should define:
	1.	database schema
	2.	API contract
	3.	webhook normalization flow
	4.	frontend paywall gating logic
	5.	upgrade/downgrade state machine

That should be written as a separate engineering spec.