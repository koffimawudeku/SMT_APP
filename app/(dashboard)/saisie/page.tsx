import { createClient } from "@/lib/supabase/server";
import SaisieForm from "./saisie-form";

export default async function SaisiePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user?.id)
    .limit(1)
    .single();

  const companyId = membership?.company_id;

  if (!companyId) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className="text-sm text-gray-600">
          Aucune entreprise n&apos;est encore rattachée à votre compte.
          Contactez votre administrateur ou créez un dossier via le SQL
          Editor de Supabase (voir le README).
        </p>
      </div>
    );
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type")
    .eq("company_id", companyId)
    .order("name");

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-xl font-medium">Saisie de flux</h1>
      <SaisieForm companyId={companyId} categories={categories ?? []} />
    </div>
  );
}
