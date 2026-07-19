import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import MovementForm from "./movement-form";

export default async function StockSaisiePage() {
  const { companyId } = await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();
  const { data: articles } = await supabase
    .from("stock_items")
    .select("id, name, reference, unit_cost")
    .eq("company_id", companyId)
    .order("name");

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-1 text-xl font-medium">Stock Input</h1>
      <p className="mb-6 text-sm text-gray-500">
        Enregistrez un Stock Initial, une Entrée ou une Sortie de stock.
      </p>
      <MovementForm companyId={companyId} articles={articles ?? []} />
    </div>
  );
}
