"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validations/transaction";

export async function createTransaction(
  companyId: string,
  formData: FormData
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const parsed = transactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category_id: formData.get("category_id"),
    payment_method: formData.get("payment_method"),
    transaction_date: formData.get("transaction_date"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await supabase.from("transactions").insert({
    company_id: companyId,
    created_by: user.id,
    ...parsed.data,
  });

  if (error) {
    return { error: "Erreur lors de l'enregistrement. Réessayez." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/saisie");
  return { success: true };
}
