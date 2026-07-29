"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inviteNewUserByEmail,
  notifyCollaboratorAdded,
} from "@/lib/onboarding-email";

const INVITABLE_ROLES = ["comptable", "consultant", "viewer"] as const;

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/utilisateurs");
}

/** Message de rappel quand l'email n'a pas pu partir (compte quand même créé). */
function emailWarning(emailError?: string) {
  return emailError
    ? ` (compte créé, mais l'email n'a pas pu être envoyé : ${emailError})`
    : "";
}

const inscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide."),
  fullName: z.string().trim().max(255).optional(),
  companyName: z
    .string()
    .trim()
    .min(1, "Le nom de l'entreprise est requis.")
    .max(255),
});

/**
 * Crée une nouvelle inscription : un compte avec sa propre organisation et
 * son propre dossier (via le trigger handle_new_user, alimenté par les
 * métadonnées). Un email d'invitation permet à la personne de définir son
 * mot de passe.
 */
export async function adminCreateInscription(formData: FormData) {
  await requireAdmin();

  const parsed = inscriptionSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName") || undefined,
    companyName: formData.get("companyName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, fullName, companyName } = parsed.data;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const { error, emailError } = await inviteNewUserByEmail(admin, {
    email,
    fullName,
    metadata: { company_name: companyName },
    heading: "Bienvenue sur SMT",
    intro: `Un compte vient d'être créé pour vous, avec le dossier « ${companyName} ».`,
  });

  if (error) {
    return { error: `Création impossible : ${error}` };
  }

  revalidateAdmin();
  return { success: true, warning: emailWarning(emailError) };
}

const collaboratorSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide."),
  fullName: z.string().trim().max(255).optional(),
  companyId: z.string().uuid("Dossier invalide."),
  role: z.enum(INVITABLE_ROLES),
});

/**
 * Ajoute un collaborateur à un dossier existant. Si le compte existe déjà,
 * il est rattaché immédiatement. Sinon, on enregistre d'abord l'invitation
 * (pour que le trigger handle_new_user ne crée pas d'organisation perso),
 * puis on crée le compte et on le rattache au dossier.
 */
export async function adminAddCollaborator(formData: FormData) {
  await requireAdmin();

  const parsed = collaboratorSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName") || undefined,
    companyId: formData.get("companyId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { email, fullName, companyId, role } = parsed.data;
  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();
  const dossierName = (company?.name as string) ?? "votre dossier";

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  // Compte déjà existant : rattachement direct au dossier + notification.
  if (existingProfile) {
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

    const { error: emailError } = await notifyCollaboratorAdded(
      email,
      dossierName
    );

    revalidateAdmin();
    return { success: true, immediate: true, warning: emailWarning(emailError) };
  }

  // Nouveau compte : l'invitation doit exister AVANT la création pour que le
  // trigger d'inscription n'ouvre pas d'organisation perso.
  const { error: inviteError } = await admin.from("company_invitations").upsert(
    {
      company_id: companyId,
      email,
      role,
      status: "pending",
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

  const { userId, error: createError, emailError } = await inviteNewUserByEmail(
    admin,
    {
      email,
      fullName,
      heading: "Vous êtes invité(e) sur SMT",
      intro: `Vous avez été ajouté(e) au dossier « ${dossierName} » sur SMT.`,
    }
  );

  if (createError || !userId) {
    return { error: `Création impossible : ${createError}` };
  }

  // Rattachement immédiat et marquage de l'invitation comme acceptée.
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

  revalidateAdmin();
  return { success: true, immediate: false, warning: emailWarning(emailError) };
}
