import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import RefreshButton from "../refresh-button";
import UsersTable, { type AdminUser } from "./users-table";

export const dynamic = "force-dynamic";

/**
 * `listUsers` est paginé (50 par défaut, 1000 au maximum). On boucle pour
 * récupérer l'intégralité des comptes, même au-delà du premier lot.
 */
async function listAllAuthUsers(
  admin: ReturnType<typeof createAdminClient>
) {
  const PER_PAGE = 1000;
  const all: {
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string | null;
    email_confirmed_at?: string | null;
    banned_until?: string | null;
  }[] = [];

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error || !data?.users?.length) break;
    all.push(...data.users);
    if (data.users.length < PER_PAGE) break;
  }

  return all;
}

export default async function AdminUsersPage() {
  const { user: currentAdmin } = await requireAdmin();

  // Sans la clé service_role, `createAdminClient()` lèverait une exception :
  // on affiche un diagnostic explicite plutôt qu'une page d'erreur.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="p-6">
        <h1 className="mb-4 text-xl font-medium">Utilisateurs</h1>
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          SUPABASE_SERVICE_ROLE_KEY est absente côté serveur — ajoutez-la dans
          les variables d&apos;environnement (Vercel &gt; Settings &gt;
          Environment Variables) puis redéployez.
        </div>
      </div>
    );
  }

  const admin = createAdminClient();

  const [authUsers, profilesRes, membershipsRes] = await Promise.all([
    listAllAuthUsers(admin),
    admin
      .from("profiles")
      .select(
        "id, email, full_name, is_platform_admin, organization_id, organizations(name)"
      ),
    admin.from("company_members").select("user_id, role, companies(name)"),
  ]);

  const profiles = profilesRes.data;
  const memberships = membershipsRes.data;

  const loadErrors = [
    profilesRes.error && `profiles : ${profilesRes.error.message}`,
    membershipsRes.error && `company_members : ${membershipsRes.error.message}`,
  ].filter(Boolean) as string[];

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id as string, p])
  );

  // Dossiers auxquels chaque utilisateur a accès, avec son rôle.
  const dossiersByUser = new Map<string, { name: string; role: string }[]>();
  for (const m of memberships ?? []) {
    const userId = m.user_id as string;
    const companyName =
      (m.companies as unknown as { name: string } | null)?.name ?? "Sans nom";
    if (!dossiersByUser.has(userId)) dossiersByUser.set(userId, []);
    dossiersByUser.get(userId)!.push({ name: companyName, role: m.role as string });
  }

  const users: AdminUser[] = authUsers
    .map((u) => {
      const profile = profileById.get(u.id);
      const organization = profile
        ? (profile.organizations as unknown as { name: string } | null)?.name ??
          null
        : null;

      return {
        id: u.id,
        email: u.email ?? (profile?.email as string) ?? "—",
        fullName: (profile?.full_name as string | null) ?? null,
        organization,
        isPlatformAdmin: Boolean(profile?.is_platform_admin),
        emailConfirmed: Boolean(u.email_confirmed_at),
        // `banned_until` est une date future tant que le compte est suspendu.
        banned: Boolean(
          u.banned_until && new Date(u.banned_until).getTime() > Date.now()
        ),
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        dossiers: dossiersByUser.get(u.id) ?? [],
      };
    })
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const confirmedCount = users.filter((u) => u.emailConfirmed).length;
  const neverSignedIn = users.filter((u) => !u.lastSignInAt).length;
  const bannedCount = users.filter((u) => u.banned).length;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-medium">Utilisateurs</h1>
          <p className="text-sm text-gray-500">
            {users.length} compte(s) · {confirmedCount} email(s) confirmé(s) ·{" "}
            {neverSignedIn} jamais connecté(s)
            {bannedCount > 0 && ` · ${bannedCount} suspendu(s)`}
          </p>
        </div>
        <RefreshButton />
      </div>

      {loadErrors.length > 0 && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <p className="mb-1 font-medium">
            Certaines données n&apos;ont pas pu être chargées :
          </p>
          <ul className="list-inside list-disc space-y-1 text-xs">
            {loadErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <UsersTable users={users} currentUserId={currentAdmin.id} />
    </div>
  );
}
