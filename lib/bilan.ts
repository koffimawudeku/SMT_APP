import type { SupabaseClient } from "@supabase/supabase-js";
import { computeDepreciation, type Asset } from "./depreciation";
import { buildResultat, type Txn } from "./compte-resultat";
import { resolveExercice, yearOf, type Exercice } from "./exercice";

export async function computeBilan(
  supabase: SupabaseClient,
  companyId: string,
  initialCapital: number,
  exercice: Exercice = resolveExercice()
) {
  // Date d'arrêté : 31/12 pour un exercice clos, aujourd'hui sinon.
  const cutoffISO = exercice.isCurrent
    ? new Date().toISOString().slice(0, 10)
    : exercice.end;

  const [
    { data: rawTransactions },
    { data: rawAssets },
    { data: stockItems },
    { data: rawMovements },
    { data: debts },
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
    supabase
      .from("stock_movements")
      .select("stock_item_id, type, quantity, movement_date")
      .eq("company_id", companyId),
    supabase
      .from("debts_receivables")
      .select("type, amount, amount_paid")
      .eq("company_id", companyId),
  ]);

  const transactions: Txn[] = (rawTransactions ?? []).map((t) => ({
    type: t.type,
    amount: t.amount,
    transaction_date: t.transaction_date,
    category_name:
      (t.categories as unknown as { name: string } | null)?.name ?? null,
  }));

  const assets: Asset[] = rawAssets ?? [];

  // Résultat de l'exercice sélectionné.
  const resultat = buildResultat(transactions, assets, exercice.year);

  // Report à nouveau : cumul des résultats de tous les exercices
  // antérieurs (bénéfices/pertes non distribués). Sans lui, le bilan ne
  // pourrait pas s'équilibrer au-delà de la première année d'activité.
  const earliestYear = earliestActivityYear(transactions, assets);
  let reportANouveau = 0;
  for (let y = earliestYear; y < exercice.year; y++) {
    reportANouveau += buildResultat(transactions, assets, y).resultat;
  }

  // Immobilisations nettes à la date d'arrêté (VCN), en excluant les
  // biens acquis après cette date.
  const immobilisationsNettes = assets
    .filter((a) => a.acquisition_date <= cutoffISO)
    .reduce((sum, a) => sum + computeDepreciation(a, exercice.cutoff).vcn, 0);

  // Quantités en stock à la date d'arrêté, dérivées du grand livre des
  // mouvements bornés au cutoff.
  const quantityMap = new Map<string, number>();
  for (const m of rawMovements ?? []) {
    if (m.movement_date > cutoffISO) continue;
    const signed = m.type === "sortie" ? -m.quantity : m.quantity;
    quantityMap.set(
      m.stock_item_id,
      (quantityMap.get(m.stock_item_id) ?? 0) + signed
    );
  }
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

  // Trésorerie à la date d'arrêté (cumul des flux jusqu'au cutoff inclus).
  const tresorerie = transactions
    .filter((t) => t.transaction_date <= cutoffISO)
    .reduce((sum, t) => sum + (t.type === "recette" ? t.amount : -t.amount), 0);

  const totalActif = immobilisationsNettes + stocks + creances + tresorerie;

  const capitauxPropres = initialCapital + reportANouveau + resultat.resultat;
  const empruntsDettesFinancieres = 0;
  const totalPassif =
    capitauxPropres + empruntsDettesFinancieres + dettesFournisseurs;

  return {
    resultat,
    reportANouveau,
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

/**
 * Année la plus ancienne où l'on trouve une transaction ou l'acquisition
 * d'une immobilisation. Sert de point de départ au cumul du report à
 * nouveau. Par défaut, l'année courante s'il n'y a aucune donnée.
 */
function earliestActivityYear(transactions: Txn[], assets: Asset[]): number {
  let earliest = Number.POSITIVE_INFINITY;
  for (const t of transactions) earliest = Math.min(earliest, yearOf(t.transaction_date));
  for (const a of assets) earliest = Math.min(earliest, yearOf(a.acquisition_date));
  return Number.isFinite(earliest) ? earliest : new Date().getFullYear();
}
