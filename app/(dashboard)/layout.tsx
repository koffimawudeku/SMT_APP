import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { acceptPendingInvitations } from "@/lib/members";
import { getSubscriptionStatus } from "@/lib/subscription";
import LogoutButton from "./logout-button";
import NavLinks from "./nav-links";
import OnboardingForm from "./onboarding/onboarding-form";
import CompanySwitcher from "./company-switcher";
import ThemeToggle from "../theme-toggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rattache l'utilisateur aux dossiers pour lesquels il a été invité avant
  // d'avoir un compte (invitations consommées à la première connexion).
  await acceptPendingInvitations();

  const { companyId, companyName, organizationId, logoUrl, companies } =
    await getActiveCompany();

  if (!companyId) {
    return <OnboardingForm />;
  }

  const sub = await getSubscriptionStatus(supabase, organizationId);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-3">
          <CompanySwitcher
            companies={companies}
            activeCompanyId={companyId}
            activeCompanyName={companyName}
            logoUrl={logoUrl}
            userEmail={user?.email ?? null}
          />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <NavLinks />
        </nav>

        {sub.status === "trialing" && sub.isActive && (
          <Link
            href="/abonnement"
            className="mx-3 mb-2 block rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-700"
          >
            Essai : {sub.daysRemaining} jour(s) restant(s)
          </Link>
        )}

        <div className="space-y-1 border-t border-gray-200 p-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 bg-canvas">{children}</main>
    </div>
  );
}
