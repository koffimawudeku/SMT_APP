"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const assetSchema = z.object({
  name: z.string().min(1, "La désignation est requise"),
  acquisition_date: z.coerce.date(),
  acquisition_value: z.coerce.number().int("Nombre entier requis").positive("La valeur doit être positive"),
  useful_life_years: z.coerce.number().int("Nombre entier requis").positive("La durée de vie doit être positive"),
  exit_date: z.coerce.date().optional(),
  exit_price: z.coerce.number().int("Nombre entier requis").min(0).optional(),
});

export async function createAsset(companyId: string, formData: FormData) {
  const supabase = createClient();

  const parsed = assetSchema.safeParse({
    name: formData.get("name"),
    acquisition_date: formData.get("acquisition_date"),
    acquisition_value: formData.get("acquisition_value"),
    useful_life_years: formData.get("useful_life_years"),
    exit_date: formData.get("exit_date") || undefined,
    exit_price: formData.get("exit_price") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("assets")
    .insert({ company_id: companyId, ...parsed.data });

  if (error) {
    return { error: "Erreur lors de l'enregistrement." };
  }

  revalidatePath("/immobilisations");
  revalidatePath("/compte-resultat");
  return { success: true };
}

export async function updateAsset(id: string, formData: FormData) {
  const supabase = createClient();

  const parsed = assetSchema.safeParse({
    name: formData.get("name"),
    acquisition_date: formData.get("acquisition_date"),
    acquisition_value: formData.get("acquisition_value"),
    useful_life_years: formData.get("useful_life_years"),
    exit_date: formData.get("exit_date") || undefined,
    exit_price: formData.get("exit_price") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("assets")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { error: "Erreur lors de la modification." };
  }

  revalidatePath("/immobilisations");
  revalidatePath("/compte-resultat");
  return { success: true };
}

export async function deleteAsset(id: string) {
  const supabase = createClient();

  const { error } = await supabase.from("assets").delete().eq("id", id);

  if (error) {
    return { error: "Erreur lors de la suppression." };
  }

  revalidatePath("/immobilisations");
  revalidatePath("/compte-resultat");
  return { success: true };
}
