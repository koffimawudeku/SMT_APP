"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  company_name: z.string().min(1, "Le nom de l'entreprise est requis").max(255),
});

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

export async function createCompanyForCurrentUser(formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  const parsed = schema.safeParse({
    company_name: formData.get("company_name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Évite les doublons si l'utilisateur soumet deux fois.
  const { data: existing } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { success: true };
  }

  const admin = createAdminClient();
  const companyLabel = parsed.data.company_name;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: companyLabel, type: "individuel" })
    .select("id")
    .single();

  if (orgError || !org) {
    return { error: "Erreur lors de la création de l'organisation." };
  }

  await admin
    .from("profiles")
    .update({ organization_id: org.id })
    .eq("id", user.id);

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({ organization_id: org.id, name: companyLabel })
    .select("id")
    .single();

  if (companyError || !company) {
    return { error: "Erreur lors de la création de l'entreprise." };
  }

  const { error: memberError } = await admin.from("company_members").insert({
    company_id: company.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: "Erreur lors du rattachement à l'entreprise." };
  }

  await admin.from("subscriptions").insert({
    organization_id: org.id,
    plan: "trial",
    status: "trialing",
    current_period_end: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString(),
  });

  await admin.from("categories").insert(
    DEFAULT_CATEGORIES.map((c) => ({
      company_id: company.id,
      name: c.name,
      type: c.type,
    }))
  );

  return { success: true };
}
