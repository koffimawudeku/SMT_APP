import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import OrderForm, { type StockOption } from "../order-form";

export const dynamic = "force-dynamic";

export default async function NouvelleCommandePage() {
  const { companyId } = await getActiveCompany();
  const supabase = createClient();

  const { data: stock } = companyId
    ? await supabase
        .from("stock_items")
        .select("id, name, unit_cost")
        .eq("company_id", companyId)
        .order("name")
    : { data: null };

  const stockItems: StockOption[] = (stock ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    unitCost: s.unit_cost,
  }));

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/commandes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux commandes
      </Link>
      <h1 className="mb-6 text-xl font-medium">Nouvelle commande</h1>
      <OrderForm stockItems={stockItems} />
    </div>
  );
}
