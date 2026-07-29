"use server";

import { randomInt } from "crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inviteNewUserByEmail,
  notifyCollaboratorAdded,
} from "@/lib/onboarding-email";

const INVITABLE_ROLES = ["comptable", "consultant", "viewer"] as const;

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide."),
  role: z.enum(INVITABLE_ROLES),
});

const passwordInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide."),
  role: z.enum(INVITABLE_ROLES),
  fullName: z.string().trim().max(255).optional(),
});

/**
 * Génère un mot de passe temporaire lisible (sans caractères ambigus comme
 * O/0 ou l/1), suffisamment robuste pour un accès initial.
 */
function generateTempPassword(length = 12): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[randomInt(chars.length)];
  return out;
}

/**
 * Vérifie que l'utilisateur courant est `owner` du dossier. Toutes les
 * mutations de membres passent par ce contrôle avant d'utiliser la clé
 * service (qui contourne la RLS).
 */
async function requireOwner(companyId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié." as const };

  const { data: me } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (me?.role !== "owner") {
    return { error: "Seul le propriétaire du dossier peut gérer les membres." as const };
  }

  return { user };
}

export async function inviteCollaborator(companyId: string, formData: FormData) {
  const guard = await requireOwner(companyId);
  if ("error" in guard) return { error: guard.error };

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, role } = parsed.data;
  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();
  const dossierName = (company?.name as string) ?? "votre dossier";

  // Si un compte existe déjà avec cet email, on rattache directement le
  // collaborateur au dossier (+ email de notification) ; sinon, on crée le
  // compte et on lui envoie un email d'invitation avec lien de mot de passe.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    if (existingProfile.id === guard.user.id) {
      return { error: "Vous êtes déjà membre de ce dossier." };
    }

    const { data: already } = await admin
      .from("company_members")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (already) {
      return { error: "Cet utilisateur est déjà membre du dossier." };
    }

    const { error } = await admin.from("company_members").insert({
      company_id: companyId,
      user_id: existingProfile.id,
      role,
    });

    if (error) {
      return { error: "Erreur lors de l'ajout du collaborateur." };
    }

    const { error: emailError } = await notifyCollaboratorAdded(
      email,
      dossierName
    );

    revalidatePath("/parametres");
    return { success: true, immediate: true, emailError };
  }

  // Nouveau compte : l'invitation doit exister AVANT la création pour que le
  // trigger d'inscription ne crée pas d'organisation perso.
  const { error } = await admin.from("company_invitations").upsert(
    {
      company_id: companyId,
      email,
      role,
      status: "pending",
      invited_by: guard.user.id,
      accepted_at: null,
    },
    { onConflict: "company_id,email" }
  );

  if (error) {
    return {
      error:
        "Erreur lors de l'enregistrement de l'invitation. La table company_invitations existe-t-elle ? (voir migration README)",
    };
  }

  const { userId, error: createError, emailError } = await inviteNewUserByEmail(
    admin,
    {
      email,
      heading: "Vous êtes invité(e) sur SMT",
      intro: `Vous avez été ajouté(e) au dossier « ${dossierName} » sur SMT.`,
    }
  );

  if (createError || !userId) {
    return { error: `Invitation impossible : ${createError}` };
  }

  await admin.from("company_members").insert({
    company_id: companyId,
    user_id: userId,
    role,
  });
  await admin
    .from("company_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("email", email);

  revalidatePath("/parametres");
  return { success: true, immediate: false, emailError };
}

/**
 * Crée un accès collaborateur AVEC un mot de passe temporaire, sans passer
 * par l'email : le propriétaire communique lui-même les identifiants au
 * collaborateur. Utile quand l'email n'est pas fiable. Le mot de passe
 * n'est renvoyé qu'une seule fois, à afficher immédiatement.
 */
export async function createCollaboratorWithPassword(
  companyId: string,
  formData: FormData
) {
  const guard = await requireOwner(companyId);
  if ("error" in guard) return { error: guard.error };

  const parsed = passwordInviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
    fullName: formData.get("fullName") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, role, fullName } = parsed.data;
  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  // Compte déjà existant : on ne réinitialise jamais son mot de passe (ce
  // serait une faille) ; on le rattache simplement au dossier.
  if (existingProfile) {
    if (existingProfile.id === guard.user.id) {
      return { error: "Vous êtes déjà membre de ce dossier." };
    }

    const { data: already } = await admin
      .from("company_members")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (already) {
      return { error: "Cet utilisateur est déjà membre du dossier." };
    }

    const { error } = await admin.from("company_members").insert({
      company_id: companyId,
      user_id: existingProfile.id,
      role,
    });
    if (error) {
      return { error: "Erreur lors du rattachement au dossier." };
    }

    revalidatePath("/parametres");
    return {
      success: true,
      existing: true,
      message:
        "Ce compte existait déjà : il a été rattaché au dossier et se connecte avec son mot de passe habituel.",
    };
  }

  // Nouveau compte : l'invitation doit exister AVANT la création pour que le
  // trigger d'inscription ne crée pas d'organisation perso.
  const { error: inviteError } = await admin.from("company_invitations").upsert(
    {
      company_id: companyId,
      email,
      role,
      status: "pending",
      invited_by: guard.user.id,
      accepted_at: null,
    },
    { onConflict: "company_id,email" }
  );

  if (inviteError) {
    return {
      error:
        "Impossible d'enregistrer l'invitation. La table company_invitations existe-t-elle ? (voir migration README)",
    };
  }

  const password = generateTempPassword();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName ?? null },
    });

  if (createError || !created?.user) {
    return {
      error: `Création impossible : ${createError?.message ?? "réponse inattendue"}`,
    };
  }

  await admin.from("company_members").insert({
    company_id: companyId,
    user_id: created.user.id,
    role,
  });
  await admin
    .from("company_invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("email", email);

  revalidatePath("/parametres");
  return { success: true, email, password };
}

export async function removeMember(companyId: string, memberUserId: string) {
  const guard = await requireOwner(companyId);
  if ("error" in guard) return { error: guard.error };

  if (memberUserId === guard.user.id) {
    return { error: "Vous ne pouvez pas vous retirer vous-même du dossier." };
  }

  const admin = createAdminClient();

  // Empêche de retirer le dernier owner du dossier.
  const { data: owners } = await admin
    .from("company_members")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("role", "owner");

  const target = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", memberUserId)
    .maybeSingle();

  if (target.data?.role === "owner" && (owners?.length ?? 0) <= 1) {
    return { error: "Impossible de retirer le dernier propriétaire du dossier." };
  }

  const { error } = await admin
    .from("company_members")
    .delete()
    .eq("company_id", companyId)
    .eq("user_id", memberUserId);

  if (error) {
    return { error: "Erreur lors du retrait du membre." };
  }

  revalidatePath("/parametres");
  return { success: true };
}

export async function revokeInvitation(companyId: string, invitationId: string) {
  const guard = await requireOwner(companyId);
  if ("error" in guard) return { error: guard.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("company_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("company_id", companyId);

  if (error) {
    return { error: "Erreur lors de la révocation de l'invitation." };
  }

  revalidatePath("/parametres");
  return { success: true };
}
