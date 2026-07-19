import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import ArticleExplorer from "./article-explorer";

export default async function StockParArticlePage() {
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
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-medium">Stock par article</h1>
      <p className="mb-6 text-sm text-gray-500">
        Choisissez un article pour consulter son historique de mouvements sur
        une période, et modifier une ligne si besoin.
      </p>
      <ArticleExplorer articles={articles ?? []} />
    </div>
  );
}
