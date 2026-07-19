"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const articleSchema = z.object({
  name: z.string().min(1, "La désignation est requise"),
  reference: z.string().max(100).optional(),
  unit_cost: z.coerce.number().min(0).optional(),
  reorder_threshold: z.coerce.number().min(0).optional(),
});

export async function createArticle(companyId: string, formData: FormData) {
  const supabase = createClient();

  const parsed = articleSchema.safeParse({
    name: formData.get("name"),
    reference: formData.get("reference") || undefined,
    unit_cost: formData.get("unit_cost") || undefined,
    reorder_threshold: formData.get("reorder_threshold") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("stock_items")
    .insert({ company_id: companyId, ...parsed.data })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Erreur création article :", error);
    return {
      error: `[DEBUG] ${error?.message ?? "aucune donnée retournée"} (code: ${error?.code ?? "?"})`,
    };
  }

  revalidatePath("/stocks");
  revalidatePath("/stocks/saisie");
  revalidatePath("/stocks/par-article");
  return { success: true, id: data.id as string };
}

const movementSchema = z.object({
  stock_item_id: z.string().uuid("Choisissez un article"),
  type: z.enum(["initial", "entree", "sortie"]),
  quantity: z.coerce.number().positive("La quantité doit être positive"),
  unit_cost: z.coerce.number().min(0).optional(),
  movement_date: z.coerce.date(),
  description: z.string().max(500).optional(),
});

export async function createMovement(companyId: string, formData: FormData) {
  const supabase = createClient();

  const parsed = movementSchema.safeParse({
    stock_item_id: formData.get("stock_item_id"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    unit_cost: formData.get("unit_cost") || undefined,
    movement_date: formData.get("movement_date"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("stock_movements").insert({
    company_id: companyId,
    ...parsed.data,
  });

  if (error) {
    return { error: "Erreur lors de l'enregistrement du mouvement." };
  }

  revalidatePath("/stocks");
  revalidatePath("/stocks/par-article");
  return { success: true };
}

export async function updateMovement(id: string, formData: FormData) {
  const supabase = createClient();

  const parsed = movementSchema.safeParse({
    stock_item_id: formData.get("stock_item_id"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    unit_cost: formData.get("unit_cost") || undefined,
    movement_date: formData.get("movement_date"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("stock_movements")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { error: "Erreur lors de la modification." };
  }

  revalidatePath("/stocks");
  revalidatePath("/stocks/par-article");
  return { success: true };
}

export async function deleteMovement(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("stock_movements")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: "Erreur lors de la suppression." };
  }

  revalidatePath("/stocks");
  revalidatePath("/stocks/par-article");
  return { success: true };
}
