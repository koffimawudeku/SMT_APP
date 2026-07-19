import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";
import NavLinks from "./nav-links";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("company_members")
    .select("companies(name)")
    .eq("user_id", user?.id)
    .limit(1)
    .single();

  const companyName =
    (membership?.companies as unknown as { name: string } | null)?.name ??
    "Aucune entreprise rattachée";

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <p className="text-sm font-medium">{companyName}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <NavLinks />
        </nav>

        <div className="border-t border-gray-200 p-3">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 bg-gray-50">{children}</main>
    </div>
  );
}
