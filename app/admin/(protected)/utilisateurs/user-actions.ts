"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

/** Durée de bannissement « indéfini » acceptée par l'API GoTrue (~100 ans). */
const BAN_FOREVER = "876000h";

function revalidateAdmin() {
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
}

/**
 * Empêche de retirer les droits / suspendre / supprimer le dernier
 * administrateur de plateforme — sinon plus personne ne peut accéder au
 * panneau admin.
 */
async function isLastPlatformAdmin(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data: target } = await admin
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!target?.is_platform_admin) return false;

  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_platform_admin", true);

  return (count ?? 0) <= 1;
}

/** Promeut ou révoque un administrateur de plateforme. */
export async function setPlatformAdmin(userId: string, value: boolean) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  if (!value) {
    if (userId === user.id) {
      return { error: "Vous ne pouvez pas révoquer vos propres droits admin." };
    }
    if (await isLastPlatformAdmin(admin, userId)) {
      return { error: "Impossible de révoquer le dernier administrateur." };
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_platform_admin: value })
    .eq("id", userId);

  if (error) {
    return { error: "Erreur lors de la mise à jour des droits." };
  }

  revalidateAdmin();
  return { success: true };
}

/**
 * Renvoie l'email de confirmation d'inscription. On utilise un client
 * anonyme dédié : `auth.resend` est une opération publique, inutile de la
 * faire porter par la session de l'admin connecté.
 */
export async function resendConfirmationEmail(email: string) {
  await requireAdmin();

  const anon = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await anon.auth.resend({ type: "signup", email });

  if (error) {
    // Le service email intégré de Supabase est fortement limité en débit
    // tant qu'un SMTP personnalisé n'est pas configuré.
    return { error: `Envoi impossible : ${error.message}` };
  }

  return { success: true };
}

/** Suspend (bannit) ou réactive un compte. */
export async function setUserBanned(userId: string, banned: boolean) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  if (banned) {
    if (userId === user.id) {
      return { error: "Vous ne pouvez pas suspendre votre propre compte." };
    }
    if (await isLastPlatformAdmin(admin, userId)) {
      return { error: "Impossible de suspendre le dernier administrateur." };
    }
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? BAN_FOREVER : "none",
  });

  if (error) {
    return { error: "Erreur lors de la mise à jour du compte." };
  }

  revalidateAdmin();
  return { success: true };
}

/**
 * Supprime définitivement un compte. Les écritures comptables saisies par
 * cet utilisateur sont CONSERVÉES : on détache seulement leur auteur
 * (`created_by` → null), car ces clés étrangères n'ont pas de
 * `on delete cascade` et bloqueraient sinon la suppression.
 *
 * L'email doit être ressaisi par l'admin et correspondre au compte ciblé.
 */
export async function deleteUserAccount(userId: string, confirmEmail: string) {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  if (userId === user.id) {
    return { error: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  const { data: targetUser, error: fetchError } =
    await admin.auth.admin.getUserById(userId);

  if (fetchError || !targetUser?.user) {
    return { error: "Compte introuvable." };
  }

  const actualEmail = (targetUser.user.email ?? "").toLowerCase();
  if (actualEmail !== confirmEmail.trim().toLowerCase()) {
    return { error: "L'email saisi ne correspond pas au compte à supprimer." };
  }

  if (await isLastPlatformAdmin(admin, userId)) {
    return { error: "Impossible de supprimer le dernier administrateur." };
  }

  // Détache l'auteur des données conservées avant la suppression.
  await admin
    .from("transactions")
    .update({ created_by: null })
    .eq("created_by", userId);
  await admin
    .from("stock_movements")
    .update({ created_by: null })
    .eq("created_by", userId);
  await admin
    .from("company_invitations")
    .update({ invited_by: null })
    .eq("invited_by", userId);

  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    return {
      error: `Suppression impossible : ${error.message}. Des données liées bloquent peut-être l'opération.`,
    };
  }

  revalidateAdmin();
  return { success: true };
}
