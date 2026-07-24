"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 Mo

export async function updateLogo(companyId: string, formData: FormData) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non authentifié." };
  }

  // Vérifie manuellement le rôle owner : on utilise ensuite la clé service
  // (qui contourne la RLS) pour l'upload, donc ce contrôle est essentiel.
  const { data: membership } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .single();

  if (membership?.role !== "owner") {
    return { error: "Seul le propriétaire peut modifier le logo." };
  }

  const file = formData.get("logo") as File | null;

  if (!file || file.size === 0) {
    return { error: "Aucun fichier sélectionné." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Format non supporté (PNG, JPEG, WEBP ou SVG uniquement)." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "Le fichier dépasse 2 Mo." };
  }

  const admin = createAdminClient();
  const extension = file.name.split(".").pop() ?? "png";
  const path = `${companyId}/logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from("logos")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: "Erreur lors du téléversement du logo." };
  }

  const { data: publicUrl } = admin.storage.from("logos").getPublicUrl(path);

  const { error: updateError } = await admin
    .from("companies")
    .update({ logo_url: publicUrl.publicUrl })
    .eq("id", companyId);

  if (updateError) {
    return { error: "Erreur lors de l'enregistrement du logo." };
  }

  revalidatePath("/parametres");
  return { success: true, logoUrl: publicUrl.publicUrl };
}
