"use client";

import { useState } from "react";
import { initiatePayment } from "./actions";
import { PLAN_PRICES } from "@/lib/subscription";

export default function PlanSelector({
  organizationId,
}: {
  organizationId: string;
}) {
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "annual" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function handlePay(plan: "monthly" | "annual") {
    setLoadingPlan(plan);
    setError(null);

    const result = await initiatePayment(organizationId, plan);

    if (result?.error || !result?.paymentUrl) {
      setError(result?.error ?? "Erreur lors de l'initiation du paiement.");
      setLoadingPlan(null);
      return;
    }

    window.location.href = result.paymentUrl;
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Mensuel</p>
          <p className="mt-1 text-2xl font-medium">
            {fmt(PLAN_PRICES.monthly)} FCFA
            <span className="text-sm font-normal text-gray-500">/mois</span>
          </p>
          <button
            onClick={() => handlePay("monthly")}
            disabled={loadingPlan !== null}
            className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loadingPlan === "monthly"
              ? "Redirection..."
              : "Payer avec Mobile Money"}
          </button>
        </div>

        <div className="rounded-lg border-2 border-primary bg-white p-5">
          <p className="text-sm text-gray-500">
            Annuel{" "}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Recommandé
            </span>
          </p>
          <p className="mt-1 text-2xl font-medium">
            {fmt(PLAN_PRICES.annual)} FCFA
            <span className="text-sm font-normal text-gray-500">/an</span>
          </p>
          <button
            onClick={() => handlePay("annual")}
            disabled={loadingPlan !== null}
            className="mt-4 w-full rounded-md bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loadingPlan === "annual"
              ? "Redirection..."
              : "Payer avec Mobile Money"}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
