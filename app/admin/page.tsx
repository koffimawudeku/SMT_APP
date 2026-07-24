import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import OrgRow from "./org-row";

export default async function AdminPage() {
  await requireAdmin();

  const admin = createAdminClient();

  const { data: organizations } = await admin
    .from("organizations")
    .select(
      "id, name, type, created_at, profiles(email, full_name), subscriptions(plan, status, current_period_end, created_at)"
    )
    .order("created_at", { ascending: false });

  const rows = (organizations ?? []).map((org) => {
    const owner = (org.profiles as unknown as { email: string; full_name: string | null }[] | null)?.[0];
    const subs = (org.subscriptions as unknown as
      | { plan: string; status: string; current_period_end: string | null; created_at: string }[]
      | null) ?? [];
    const latestSub = [...subs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    return {
      id: org.id as string,
      name: org.name as string,
      createdAt: org.created_at as string,
      ownerEmail: owner?.email ?? "—",
      ownerName: owner?.full_name ?? "—",
      plan: latestSub?.plan ?? null,
      status: latestSub?.status ?? null,
      currentPeriodEnd: latestSub?.current_period_end ?? null,
    };
  });

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-medium">Inscriptions</h1>
      <p className="mb-6 text-sm text-gray-500">
        {rows.length} organisation(s) inscrite(s).
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Entreprise</th>
              <th className="px-4 py-2">Propriétaire</th>
              <th className="px-4 py-2">Inscrit le</th>
              <th className="px-4 py-2">Statut</th>
              <th className="px-4 py-2">Expire le</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <OrgRow key={r.id} org={r} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
