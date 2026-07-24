"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extendTrial, activateSubscriptionManually } from "./actions";

type Org = {
  id: string;
  name: string;
  createdAt: string;
  ownerEmail: string;
  ownerName: string;
  plan: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
};

function statusBadge(status: string | null, currentPeriodEnd: string | null) {
  const isExpired =
    currentPeriodEnd && new Date(currentPeriodEnd).getTime() < Date.now();

  if (!status) return { label: "Aucun abonnement", color: "bg-gray-100 text-gray-600" };
  if (isExpired) return { label: "Expiré", color: "bg-red-100 text-red-700" };
  if (status === "trialing") return { label: "Essai", color: "bg-orange-100 text-orange-700" };
  if (status === "active") return { label: "Actif", color: "bg-green-100 text-green-700" };
  if (status === "pending") return { label: "En attente", color: "bg-gray-100 text-gray-600" };
  return { label: status, color: "bg-gray-100 text-gray-600" };
}

export default function OrgRow({ org }: { org: Org }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const badge = statusBadge(org.status, org.currentPeriodEnd);

  async function handleExtendTrial() {
    setLoading("extend");
    await extendTrial(org.id, 14);
    setLoading(null);
    router.refresh();
  }

  async function handleActivate(plan: "monthly" | "annual") {
    if (!confirm(`Activer l'abonnement ${plan === "monthly" ? "Mensuel" : "Annuel"} pour ${org.name} ?`)) {
      return;
    }
    setLoading(plan);
    await activateSubscriptionManually(org.id, plan);
    setLoading(null);
    router.refresh();
  }

  return (
    <tr className="border-t border-gray-100">
      <td className="px-4 py-2 font-medium">{org.name}</td>
      <td className="px-4 py-2">
        <div>{org.ownerName}</div>
        <div className="text-xs text-gray-400">{org.ownerEmail}</div>
      </td>
      <td className="px-4 py-2 text-gray-500">
        {new Date(org.createdAt).toLocaleDateString("fr-FR")}
      </td>
      <td className="px-4 py-2">
        <span className={`rounded-full px-2 py-1 text-xs ${badge.color}`}>
          {badge.label}
        </span>
      </td>
      <td className="px-4 py-2 text-gray-500">
        {org.currentPeriodEnd
          ? new Date(org.currentPeriodEnd).toLocaleDateString("fr-FR")
          : "—"}
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExtendTrial}
            disabled={loading !== null}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading === "extend" ? "..." : "+14j essai"}
          </button>
          <button
            onClick={() => handleActivate("monthly")}
            disabled={loading !== null}
            className="rounded-md border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
          >
            {loading === "monthly" ? "..." : "Activer mensuel"}
          </button>
          <button
            onClick={() => handleActivate("annual")}
            disabled={loading !== null}
            className="rounded-md border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-50"
          >
            {loading === "annual" ? "..." : "Activer annuel"}
          </button>
        </div>
      </td>
    </tr>
  );
}
