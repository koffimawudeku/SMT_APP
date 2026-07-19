"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const settingsSchema = z.object({
  name: z.string().min(1, "Le nom de l'entreprise est requis").max(255),
  initial_capital: z.coerce.number().int("Nombre entier requis").min(0).optional(),
});

export async function updateCompanyName(companyId: string, formData: FormData) {
  const supabase = createClient();

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    initial_capital: formData.get("initial_capital") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // La policy RLS "companies_update" (voir rls_policies.sql) doit exister
  // pour que cette écriture soit autorisée ; sinon Supabase renverra une
  // erreur silencieuse (0 ligne modifiée).
  const { error, data } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      ...(parsed.data.initial_capital !== undefined && {
        initial_capital: parsed.data.initial_capital,
      }),
    })
    .eq("id", companyId)
    .select();

  if (error) {
    return { error: "Erreur lors de la mise à jour." };
  }

  if (!data || data.length === 0) {
    return {
      error:
        "Aucune ligne mise à jour — vérifiez que la policy RLS d'écriture sur companies existe.",
    };
  }

  revalidatePath("/parametres");
  revalidatePath("/dashboard");
  return { success: true };
}
