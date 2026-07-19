"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const debtSchema = z.object({
  type: z.enum(["dette", "creance"]),
  third_party_name: z.string().min(1, "Le nom du tiers est requis"),
  label: z.string().max(255).optional(),
  amount: z.coerce.number().int("Nombre entier requis").positive("Le montant doit être positif"),
  due_date: z.coerce.date().optional(),
});

export async function createDebtOrReceivable(
  companyId: string,
  formData: FormData
) {
  const supabase = createClient();

  const parsed = debtSchema.safeParse({
    type: formData.get("type"),
    third_party_name: formData.get("third_party_name"),
    label: formData.get("label") || undefined,
    amount: formData.get("amount"),
    due_date: formData.get("due_date") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.data ? "Erreur de validation." : parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("debts_receivables").insert({
    company_id: companyId,
    ...parsed.data,
  });

  if (error) {
    return { error: "Erreur lors de l'enregistrement." };
  }

  revalidatePath("/dettes-creances");
  return { success: true };
}

export async function markAsSolde(id: string) {
  const supabase = createClient();

  const { data: current, error: fetchError } = await supabase
    .from("debts_receivables")
    .select("amount")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return { error: "Impossible de retrouver cette ligne." };
  }

  const { error } = await supabase
    .from("debts_receivables")
    .update({ status: "solde", amount_paid: current.amount })
    .eq("id", id);

  if (error) {
    return { error: "Impossible de mettre à jour le statut." };
  }

  revalidatePath("/dettes-creances");
  return { success: true };
}
