import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import OrgRow from "./org-row";
import RefreshButton from "./refresh-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  // Sans la clé service_role, toutes les requêtes ci-dessous échouent
  // silencieusement (data: null) et la page reste vide : on le signale.
  const missingServiceKey = !process.env.SUPABASE_SERVICE_ROLE_KEY;

  // `createAdminClient()` lèverait une exception sans la clé : on n'exécute
  // les requêtes que si elle est présente, pour pouvoir afficher le
  // diagnostic plutôt qu'une page d'erreur.
  const empty = { data: null, error: null } as const;

  const [orgRes, authRes, companiesRes, membersRes, invitationsRes] =
    missingServiceKey
      ? [empty, empty, empty, empty, empty]
      : await (async () => {
          const admin = createAdminClient();
          return Promise.all([
            admin
              .from("organizations")
              .select(
                "id, name, type, created_at, profiles(id, email, full_name), subscriptions(plan, status, current_period_end)"
              )
              .order("created_at", { ascending: false }),
            admin.auth.admin.listUsers(),
            admin.from("companies").select("id, organization_id"),
            admin
              .from("company_members")
              .select("user_id, companies(organization_id)"),
            admin
              .from("company_invitations")
              .select("id, companies(organization_id)")
              .eq("status", "pending"),
          ]);
        })();

  const organizations = orgRes.data;
  const authUsers = authRes.data;
  const companies = companiesRes.data;
  const members = membersRes.data;
  const invitations = invitationsRes.data;

  // Diagnostics : on remonte chaque échec au lieu d'afficher un tableau vide.
  const errors: string[] = [];
  if (missingServiceKey) {
    errors.push(
      "SUPABASE_SERVICE_ROLE_KEY est absente côté serveur — ajoutez-la dans les variables d'environnement (Vercel > Settings > Environment Variables) puis redéployez."
    );
  }
  if (orgRes.error) errors.push(`organizations : ${orgRes.error.message}`);
  if (authRes.error) errors.push(`comptes auth : ${authRes.error.message}`);
  if (companiesRes.error) errors.push(`companies : ${companiesRes.error.message}`);
  if (membersRes.error) errors.push(`company_members : ${membersRes.error.message}`);
  // Table optionnelle tant que la migration des invitations n'est pas jouée :
  // on n'en fait pas une erreur bloquante, juste une note.
  const invitationsUnavailable = Boolean(invitationsRes.error);

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
      | { plan: string; status: string; current_period_end: string | null }[]
      | null) ?? [];
    // Trié par échéance décroissante : `subscriptions.created_at` n'existe
    // pas sur les bases créées avant son ajout au schéma, et le reste de
    // l'application (middleware, lib/subscription) utilise déjà ce critère.
    const latestSub = [...subs].sort((a, b) => {
      const ta = a.current_period_end
        ? new Date(a.current_period_end).getTime()
        : 0;
      const tb = b.current_period_end
        ? new Date(b.current_period_end).getTime()
        : 0;
      return tb - ta;
    })[0];
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

      {errors.length > 0 && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <p className="mb-1 font-medium">
            Les données n&apos;ont pas pu être chargées :
          </p>
          <ul className="list-inside list-disc space-y-1 text-xs">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {invitationsUnavailable && errors.length === 0 && (
        <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700">
          La table <code>company_invitations</code> n&apos;existe pas encore :
          la colonne Membres n&apos;affiche pas les invitations en attente.
          Exécutez la migration indiquée dans le README.
        </div>
      )}

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

        {rows.length === 0 && errors.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            Aucune organisation inscrite pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
