"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

export async function extendTrial(organizationId: string, days: number) {
  await requireAdmin(); // relance une vérification côté serveur, jamais confiance au client

  const admin = createAdminClient();
  const newPeriodEnd = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await admin
    .from("subscriptions")
    .update({ status: "trialing", current_period_end: newPeriodEnd })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    return { error: "Erreur lors de la prolongation." };
  }

  revalidatePath("/admin");
  return { success: true };
}

export async function activateSubscriptionManually(
  organizationId: string,
  plan: "monthly" | "annual"
) {
  await requireAdmin();

  const admin = createAdminClient();
  const durationDays = plan === "annual" ? 365 : 30;
  const currentPeriodEnd = new Date(
    Date.now() + durationDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await admin.from("subscriptions").insert({
    organization_id: organizationId,
    plan,
    status: "active",
    payment_provider: "manuel",
    current_period_end: currentPeriodEnd,
  });

  if (error) {
    return { error: "Erreur lors de l'activation." };
  }

  revalidatePath("/admin");
  return { success: true };
}
