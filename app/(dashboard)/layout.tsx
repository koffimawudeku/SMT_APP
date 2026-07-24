import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { getSubscriptionStatus } from "@/lib/subscription";
import LogoutButton from "./logout-button";
import NavLinks from "./nav-links";
import OnboardingForm from "./onboarding/onboarding-form";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { companyId, companyName, organizationId, logoUrl } = await getActiveCompany();

  if (!companyId) {
    return <OnboardingForm />;
  }

  const sub = await getSubscriptionStatus(supabase, organizationId);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 p-4">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={companyName ?? "Logo"}
              className="h-8 w-8 rounded object-contain"
            />
          )}
          <div>
            <p className="text-sm font-medium">
              {companyName ?? "Aucune entreprise rattachée"}
            </p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
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

        <div className="border-t border-gray-200 p-3">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
