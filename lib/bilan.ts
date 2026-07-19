import type { SupabaseClient } from "@supabase/supabase-js";
import { computeDepreciation, type Asset } from "./depreciation";
import { buildResultat, type Txn } from "./compte-resultat";

export async function computeBilan(
  supabase: SupabaseClient,
  companyId: string,
  initialCapital: number
) {
  const today = new Date();
  const currentYear = today.getFullYear();

  const [
    { data: rawTransactions },
    { data: rawAssets },
    { data: stockItems },
    { data: stockQuantities },
    { data: debts },
    { data: soldeTresorerie },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, transaction_date, categories(name)")
      .eq("company_id", companyId),
    supabase
      .from("assets")
      .select(
        "id, name, acquisition_date, acquisition_value, useful_life_years, exit_date, exit_price"
      )
      .eq("company_id", companyId),
    supabase.from("stock_items").select("id, unit_cost").eq("company_id", companyId),
    supabase.from("v_stock_quantities").select("stock_item_id, quantity"),
    supabase
      .from("debts_receivables")
      .select("type, amount, amount_paid")
      .eq("company_id", companyId),
    supabase
      .from("v_solde_tresorerie")
      .select("solde")
      .eq("company_id", companyId)
      .single(),
  ]);

  const transactions: Txn[] = (rawTransactions ?? []).map((t) => ({
    type: t.type,
    amount: t.amount,
    transaction_date: t.transaction_date,
    category_name:
      (t.categories as unknown as { name: string } | null)?.name ?? null,
  }));

  const assets: Asset[] = rawAssets ?? [];
  const resultat = buildResultat(transactions, assets, currentYear);

  const immobilisationsNettes = assets.reduce(
    (sum, a) => sum + computeDepreciation(a, today).vcn,
    0
  );

  const quantityMap = new Map(
    (stockQuantities ?? []).map((q) => [q.stock_item_id, q.quantity as number])
  );
  const stocks = (stockItems ?? []).reduce(
    (sum, item) => sum + (quantityMap.get(item.id) ?? 0) * (item.unit_cost ?? 0),
    0
  );

  const creances = (debts ?? [])
    .filter((d) => d.type === "creance")
    .reduce((sum, d) => sum + (d.amount - d.amount_paid), 0);
  const dettesFournisseurs = (debts ?? [])
    .filter((d) => d.type === "dette")
    .reduce((sum, d) => sum + (d.amount - d.amount_paid), 0);

  const tresorerie = soldeTresorerie?.solde ?? 0;
  const totalActif = immobilisationsNettes + stocks + creances + tresorerie;

  const capitauxPropres = initialCapital + resultat.resultat;
  const empruntsDettesFinancieres = 0;
  const totalPassif =
    capitauxPropres + empruntsDettesFinancieres + dettesFournisseurs;

  return {
    resultat,
    immobilisationsNettes,
    stocks,
    creances,
    tresorerie,
    totalActif,
    capitauxPropres,
    empruntsDettesFinancieres,
    dettesFournisseurs,
    totalPassif,
  };
}
