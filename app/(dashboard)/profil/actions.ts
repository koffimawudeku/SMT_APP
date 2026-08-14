"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_TEXT_FIELDS } from "./fields";

/**
 * Enregistre le profil de l'entreprise. L'écriture passe par la policy RLS
 * `companies_update` (réservée au rôle `owner`) : si l'utilisateur n'est pas
 * propriétaire, aucune ligne n'est modifiée et on le signale.
 */
export async function updateCompanyProfile(companyId: string, formData: FormData) {
  const supabase = createClient();

  const update: Record<string, string | number | null> = {};
  for (const f of PROFILE_TEXT_FIELDS) {
    const value = (formData.get(f.name) as string | null)?.trim();
    update[f.name] = value ? value : null;
  }
  const headcount = (formData.get("headcount") as string | null)?.trim();
  update.headcount = headcount ? Math.max(0, Math.round(Number(headcount))) : null;

  const { data, error } = await supabase
    .from("companies")
    .update(update)
    .eq("id", companyId)
    .select("id");

  if (error) {
    return {
      error:
        "Erreur lors de l'enregistrement. Les colonnes de profil existent-elles ? (voir migration README)",
    };
  }

  if (!data || data.length === 0) {
    return {
      error:
        "Aucune modification enregistrée — seul le propriétaire du dossier peut modifier le profil.",
    };
  }

  revalidatePath("/profil");
  return { success: true };
}
