"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_PRICES } from "@/lib/subscription";

export async function initiatePayment(
  organizationId: string,
  plan: "monthly" | "annual"
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!apiKey || !siteId || !appUrl) {
    return {
      error:
        "Paiement non configuré : CINETPAY_API_KEY, CINETPAY_SITE_ID ou NEXT_PUBLIC_APP_URL manquant côté serveur.",
    };
  }

  const amount = PLAN_PRICES[plan];
  const transactionId = randomUUID();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  // Enregistre une ligne "pending" que le webhook viendra activer
  // une fois le paiement confirmé côté CinetPay.
  const admin = createAdminClient();
  const { error: insertError } = await admin.from("subscriptions").insert({
    organization_id: organizationId,
    plan,
    status: "pending",
    payment_provider: "cinetpay",
    external_subscription_id: transactionId,
  });

  if (insertError) {
    return { error: "Erreur lors de la préparation du paiement." };
  }

  const [customerName, ...rest] = (profile?.full_name ?? "Client SMT").split(" ");
  const customerSurname = rest.join(" ") || "SMT";

  try {
    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transactionId,
        amount,
        currency: "XOF",
        description: `Abonnement SMT — ${plan === "monthly" ? "Mensuel" : "Annuel"}`,
        return_url: `${appUrl}/abonnement?payment=retour`,
        notify_url: `${appUrl}/api/webhooks/cinetpay`,
        channels: "MOBILE_MONEY",
        customer_name: customerName,
        customer_surname: customerSurname,
        customer_email: profile?.email ?? user.email,
      }),
    });

    const result = await response.json();

    if (result.code !== "201" || !result.data?.payment_url) {
      return {
        error: `Erreur CinetPay : ${result.message ?? "réponse inattendue"}.`,
      };
    }

    return { success: true, paymentUrl: result.data.payment_url as string };
  } catch {
    return { error: "Impossible de contacter le service de paiement." };
  }
}
