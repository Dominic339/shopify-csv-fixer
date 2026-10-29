// src/lib/plans.ts
// Single source of truth for plan names and export limits.
// Safe to import from both client components and API routes.

export type Plan = "free" | "basic" | "advanced";

export type PlanLimit = {
  /** Exports allowed per calendar month. 0 when unlimited. */
  limit: number;
  unlimited: boolean;
};

export const FREE_EXPORTS_PER_MONTH = 3;
export const BASIC_EXPORTS_PER_MONTH = 100;

/** Exports of files this small never count against any limit. */
export const FREE_ROWS_PER_EXPORT = 100;

/** A one-time pass gives unlimited exports for this long. */
export const PASS_HOURS = 24;
/** Display price of the pass; the charged amount comes from STRIPE_PRICE_PASS. */
export const PASS_PRICE_LABEL = "$2.99";

/** Whether exporting `rows` data rows uses up one of the plan's exports. */
export function exportCountsTowardLimit(rows: number): boolean {
  return rows > FREE_ROWS_PER_EXPORT;
}

const PLAN_LIMITS: Record<Plan, PlanLimit> = {
  free: { limit: FREE_EXPORTS_PER_MONTH, unlimited: false },
  basic: { limit: BASIC_EXPORTS_PER_MONTH, unlimited: false },
  advanced: { limit: 0, unlimited: true },
};

export function normalizePlan(raw: unknown): Plan {
  const p = String(raw ?? "free").toLowerCase();
  return p === "advanced" ? "advanced" : p === "basic" ? "basic" : "free";
}

/** A subscription only grants its plan while Stripe reports it as active. */
export function getEffectivePlan(rawPlan: unknown, rawStatus: unknown): Plan {
  const status = String(rawStatus ?? "").toLowerCase();
  return status === "active" ? normalizePlan(rawPlan) : "free";
}

export function getPlanLimit(plan: unknown): PlanLimit {
  return PLAN_LIMITS[normalizePlan(plan)];
}
