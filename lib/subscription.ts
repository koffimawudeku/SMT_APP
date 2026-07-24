import type { SupabaseClient } from "@supabase/supabase-js";

export const PLAN_PRICES = {
  monthly: 2950,
  annual: 35400,
} as const;

export type SubscriptionInfo = {
  plan: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  isActive: boolean;
  daysRemaining: number;
};

export async function getSubscriptionStatus(
  supabase: SupabaseClient,
  organizationId: string | null
): Promise<SubscriptionInfo> {
  if (!organizationId) {
    return {
      plan: null,
      status: null,
      currentPeriodEnd: null,
      isActive: false,
      daysRemaining: 0,
    };
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("organization_id", organizationId)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      plan: null,
      status: null,
      currentPeriodEnd: null,
      isActive: false,
      daysRemaining: 0,
    };
  }

  const periodEnd = data.current_period_end
    ? new Date(data.current_period_end)
    : null;
  const now = new Date();
  const isWithinPeriod = periodEnd ? periodEnd.getTime() > now.getTime() : false;
  const isActive =
    (data.status === "trialing" || data.status === "active") && isWithinPeriod;

  const daysRemaining = periodEnd
    ? Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    plan: data.plan,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    isActive,
    daysRemaining,
  };
}
