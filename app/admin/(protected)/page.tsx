import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import OrgRow from "./org-row";
import RefreshButton from "./refresh-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const admin = createAdminClient();

  const [
    { data: organizations },
    { data: authUsers },
    { data: companies },
    { data: members },
    { data: invitations },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select(
        "id, name, type, created_at, profiles(id, email, full_name), subscriptions(plan, status, current_period_end, created_at)"
      )
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers(),
    admin.from("companies").select("id, organization_id"),
    admin.from("company_members").select("user_id, companies(organization_id)"),
    // Table possiblement absente tant que la migration n'est pas jouée :
    // Supabase renvoie alors data:null (pas d'exception), on dégrade à 0.
    admin
      .from("company_invitations")
      .select("id, companies(organization_id)")
      .eq("status", "pending"),
  ]);

  const authUserById = new Map(
    (authUsers?.users ?? []).map((u) => [u.id, u])
  );

  // Nombre de dossiers (entreprises) par organisation.
  const dossiersByOrg = new Map<string, number>();
  for (const c of companies ?? []) {
    const orgId = c.organization_id as string;
    dossiersByOrg.set(orgId, (dossiersByOrg.get(orgId) ?? 0) + 1);
  }

  // Utilisateurs distincts membres d'au moins un dossier de l'organisation.
  const memberUsersByOrg = new Map<string, Set<string>>();
  for (const m of members ?? []) {
    const orgId = (m.companies as unknown as { organization_id: string } | null)
      ?.organization_id;
    if (!orgId) continue;
    if (!memberUsersByOrg.has(orgId)) memberUsersByOrg.set(orgId, new Set());
    memberUsersByOrg.get(orgId)!.add(m.user_id as string);
  }

  // Invitations en attente par organisation.
  const pendingInvitesByOrg = new Map<string, number>();
  for (const inv of invitations ?? []) {
    const orgId = (inv.companies as unknown as { organization_id: string } | null)
      ?.organization_id;
    if (!orgId) continue;
    pendingInvitesByOrg.set(orgId, (pendingInvitesByOrg.get(orgId) ?? 0) + 1);
  }

  const rows = (organizations ?? []).map((org) => {
    const owner = (org.profiles as unknown as
      | { id: string; email: string; full_name: string | null }[]
      | null)?.[0];
    const subs = (org.subscriptions as unknown as
      | { plan: string; status: string; current_period_end: string | null; created_at: string }[]
      | null) ?? [];
    const latestSub = [...subs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
    const authUser = owner ? authUserById.get(owner.id) : undefined;

    return {
      id: org.id as string,
      name: org.name as string,
      createdAt: org.created_at as string,
      ownerEmail: owner?.email ?? "—",
      ownerName: owner?.full_name ?? "—",
      dossiers: dossiersByOrg.get(org.id as string) ?? 0,
      members: memberUsersByOrg.get(org.id as string)?.size ?? 0,
      pendingInvites: pendingInvitesByOrg.get(org.id as string) ?? 0,
      plan: latestSub?.plan ?? null,
      status: latestSub?.status ?? null,
      currentPeriodEnd: latestSub?.current_period_end ?? null,
      emailConfirmed: Boolean(authUser?.email_confirmed_at),
      lastSignInAt: authUser?.last_sign_in_at ?? null,
    };
  });

  const totalUsers = authUsers?.users?.length ?? 0;
  const totalDossiers = companies?.length ?? 0;
  const activeCount = rows.filter(
    (r) =>
      (r.status === "active" || r.status === "trialing") &&
      (!r.currentPeriodEnd || new Date(r.currentPeriodEnd).getTime() > Date.now())
  ).length;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-medium">Inscriptions</h1>
          <p className="text-sm text-gray-500">
            {rows.length} organisation(s) · {totalDossiers} dossier(s) ·{" "}
            {totalUsers} utilisateur(s) · {activeCount} abonnement(s) actif(s)
          </p>
        </div>
        <RefreshButton />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Entreprise</th>
              <th className="px-4 py-2">Propriétaire</th>
              <th className="px-4 py-2 text-center">Dossiers</th>
              <th className="px-4 py-2 text-center">Membres</th>
              <th className="px-4 py-2">Inscrit le</th>
              <th className="px-4 py-2">Dernière connexion</th>
              <th className="px-4 py-2">Email</th>
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
