import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;

  if (!apiKey || !siteId) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const body = await request.formData().catch(() => null);
  const transactionId =
    body?.get("cpm_trans_id")?.toString() ??
    body?.get("transaction_id")?.toString();

  if (!transactionId) {
    return NextResponse.json({ error: "missing transaction_id" }, { status: 400 });
  }

  // On ne fait JAMAIS confiance directement au contenu de la notification :
  // on revérifie le statut auprès de CinetPay, comme recommandé par leur doc.
  const checkResponse = await fetch(
    "https://api-checkout.cinetpay.com/v2/payment/check",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transactionId,
      }),
    }
  );

  const check = await checkResponse.json();

  if (check.data?.status !== "ACCEPTED") {
    // Paiement refusé/annulé : rien à activer.
    return NextResponse.json({ ok: true, status: check.data?.status ?? "unknown" });
  }

  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("subscriptions")
    .select("id, organization_id, plan")
    .eq("external_subscription_id", transactionId)
    .eq("status", "pending")
    .single();

  if (!pending) {
    return NextResponse.json({ ok: true, note: "already processed or not found" });
  }

  const durationDays = pending.plan === "annual" ? 365 : 30;
  const currentPeriodEnd = new Date(
    Date.now() + durationDays * 24 * 60 * 60 * 1000
  ).toISOString();

  await admin
    .from("subscriptions")
    .update({ status: "active", current_period_end: currentPeriodEnd })
    .eq("id", pending.id);

  return NextResponse.json({ ok: true });
}
