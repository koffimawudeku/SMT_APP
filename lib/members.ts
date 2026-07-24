import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CompanyMember = {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  isSelf: boolean;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
  createdAt: string;
};

/**
 * Liste les membres et les invitations en attente d'un dossier. Les emails
 * proviennent de `profiles`, protégés par une RLS "own only" : on passe donc
 * par la clé service, mais seulement après avoir confirmé que l'appelant est
 * bien membre du dossier.
 */
export async function getCompanyMembers(companyId: string): Promise<{
  members: CompanyMember[];
  invitations: PendingInvitation[];
  canManage: boolean;
  currentUserId: string | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { members: [], invitations: [], canManage: false, currentUserId: null };
  }

  const { data: me } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!me) {
    return { members: [], invitations: [], canManage: false, currentUserId: user.id };
  }

  const admin = createAdminClient();

  const { data: rawMembers } = await admin
    .from("company_members")
    .select("id, user_id, role, profiles(email, full_name)")
    .eq("company_id", companyId);

  const members: CompanyMember[] = (rawMembers ?? [])
    .map((m) => {
      const profile = m.profiles as unknown as {
        email: string;
        full_name: string | null;
      } | null;
      return {
        id: m.id as string,
        userId: m.user_id as string,
        email: profile?.email ?? "—",
        fullName: profile?.full_name ?? null,
        role: m.role as string,
        isSelf: m.user_id === user.id,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email, "fr"));

  // La table peut ne pas exister tant que la migration n'a pas été jouée :
  // on dégrade proprement en liste vide plutôt que de casser la page.
  let invitations: PendingInvitation[] = [];
  const { data: rawInvites } = await admin
    .from("company_invitations")
    .select("id, email, role, created_at")
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (rawInvites) {
    invitations = rawInvites.map((i) => ({
      id: i.id as string,
      email: i.email as string,
      role: i.role as string,
      createdAt: i.created_at as string,
    }));
  }

  return {
    members,
    invitations,
    canManage: me.role === "owner",
    currentUserId: user.id,
  };
}

/**
 * Consomme les invitations en attente correspondant à l'email de
 * l'utilisateur courant : le rattache aux dossiers concernés puis marque les
 * invitations comme acceptées. Idempotent — sans effet s'il n'y a rien.
 * Appelé une fois par chargement du layout du dashboard.
 */
export async function acceptPendingInvitations(): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return;

  const admin = createAdminClient();
  const email = user.email.toLowerCase();

  const { data: invites } = await admin
    .from("company_invitations")
    .select("id, company_id, role")
    .eq("email", email)
    .eq("status", "pending");

  if (!invites || invites.length === 0) return;

  for (const invite of invites) {
    // Ignore les doublons si l'utilisateur est déjà membre du dossier.
    await admin
      .from("company_members")
      .upsert(
        {
          company_id: invite.company_id,
          user_id: user.id,
          role: invite.role,
        },
        { onConflict: "company_id,user_id", ignoreDuplicates: true }
      );

    await admin
      .from("company_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
  }
}
