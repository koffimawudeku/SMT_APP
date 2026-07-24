"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ACTIVE_COMPANY_COOKIE } from "@/lib/supabase/get-active-company";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 an
};

const DEFAULT_CATEGORIES: { name: string; type: "recette" | "depense" }[] = [
  { name: "Ventes", type: "recette" },
  { name: "Autres Recettes", type: "recette" },
  { name: "Matériel/Mobilier", type: "depense" },
  { name: "Achat Marchandises", type: "depense" },
  { name: "Achat Matières/Fourn.", type: "depense" },
  { name: "Loyer", type: "depense" },
  { name: "Salaires", type: "depense" },
  { name: "Eau/Électricité", type: "depense" },
  { name: "Impôts/Taxes", type: "depense" },
  { name: "Autres Dépenses", type: "depense" },
];

/**
 * Change le dossier actif. On vérifie d'abord que l'utilisateur est bien
 * membre du dossier ciblé avant d'écrire le cookie, pour qu'un identifiant
 * forgé ne puisse pas donner accès à un dossier tiers.
 */
export async function setActiveCompany(companyId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!membership) {
    return { error: "Dossier inaccessible." };
  }

  cookies().set(ACTIVE_COMPANY_COOKIE, companyId, COOKIE_OPTIONS);
  revalidatePath("/", "layout");
  return { success: true };
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Le nom du dossier est requis.").max(255),
});

/**
 * Crée un nouveau dossier (entreprise) rattaché à la même organisation que
 * l'utilisateur courant — le mode « cabinet » : plusieurs entreprises
 * suivies sous un seul abonnement. Le nouveau dossier devient actif.
 */
export async function createDossier(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return { error: "Aucune organisation rattachée à votre compte." };
  }

  const admin = createAdminClient();

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ organization_id: profile.organization_id, name: parsed.data.name })
    .select("id")
    .single();

  if (companyError || !company) {
    return { error: "Erreur lors de la création du dossier." };
  }

  const { error: memberError } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: "Erreur lors du rattachement au dossier." };
  }

  await admin.from("categories").insert(
    DEFAULT_CATEGORIES.map((c) => ({
      company_id: company.id,
      name: c.name,
      type: c.type,
    }))
  );

  // Le nouveau dossier devient immédiatement le dossier actif.
  cookies().set(ACTIVE_COMPANY_COOKIE, company.id, COOKIE_OPTIONS);
  revalidatePath("/", "layout");
  return { success: true };
}
