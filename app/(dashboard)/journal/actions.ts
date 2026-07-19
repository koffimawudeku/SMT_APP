"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/validations/transaction";

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = createClient();

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

  const { error } = await supabase
    .from("transactions")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    return { error: "Erreur lors de la modification." };
  }

  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const supabase = createClient();

  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    return { error: "Erreur lors de la suppression." };
  }

  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return { success: true };
}
