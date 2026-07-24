import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { getSubscriptionStatus } from "@/lib/subscription";
import PlanSelector from "./plan-selector";

export default async function AbonnementPage() {
  const { organizationId } = await getActiveCompany();
  const supabase = createClient();
  const sub = await getSubscriptionStatus(supabase, organizationId);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-xl font-medium">Abonnement</h1>
      <p className="mb-6 text-sm text-gray-500">
        Gérez votre essai gratuit ou votre abonnement SMT.
      </p>

      <div
        className={`mb-8 rounded-lg border p-4 text-sm ${
          sub.isActive
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}
      >
        {sub.status === "trialing" && sub.isActive && (
          <p>
            Essai gratuit en cours — <strong>{sub.daysRemaining} jour(s)</strong> restant(s).
          </p>
        )}
        {sub.status === "active" && sub.isActive && (
          <p>
            Abonnement <strong>{sub.plan === "annual" ? "Annuel" : "Mensuel"}</strong>{" "}
            actif — renouvellement dans <strong>{sub.daysRemaining} jour(s)</strong>.
          </p>
        )}
        {!sub.isActive && (
          <p>
            {sub.status === "trialing"
              ? "Votre essai gratuit est terminé."
              : "Aucun abonnement actif."}{" "}
            Choisissez un plan ci-dessous pour continuer à utiliser SMT.
          </p>
        )}
      </div>

      <PlanSelector organizationId={organizationId ?? ""} />

      <p className="mt-6 text-xs text-gray-400">
        Paiement sécurisé par Mobile Money (T-Money ou Flooz) via CinetPay.
        Vous serez redirigé vers la page de paiement CinetPay pour finaliser
        la transaction.
      </p>
    </div>
  );
}
