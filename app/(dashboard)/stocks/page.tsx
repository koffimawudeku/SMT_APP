import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";

export default async function StocksPage() {
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
    .select("id, reference, name, unit_cost, reorder_threshold")
    .eq("company_id", companyId)
    .order("name");

  const { data: quantities } = await supabase
    .from("v_stock_quantities")
    .select("stock_item_id, quantity");

  const quantityMap = new Map(
    (quantities ?? []).map((q) => [q.stock_item_id, q.quantity as number])
  );

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

  const rows = (articles ?? []).map((a) => {
    const quantity = quantityMap.get(a.id) ?? 0;
    const montant = quantity * (a.unit_cost ?? 0);
    const isLow =
      a.reorder_threshold !== null && quantity <= a.reorder_threshold;
    return { ...a, quantity, montant, isLow };
  });

  const totalMontant = rows.reduce((sum, r) => sum + r.montant, 0);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">État global du stock</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/stocks/saisie"
            className="rounded-md bg-primary px-3 py-2 font-medium text-white"
          >
            Saisir un mouvement
          </Link>
          <Link
            href="/stocks/par-article"
            className="rounded-md border border-gray-300 px-3 py-2 text-gray-700"
          >
            Stock par article
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun article enregistré. Rendez-vous sur{" "}
          <span className="font-medium">Stock Input</span> pour créer le
          premier article et saisir son stock initial.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2">Référence</th>
                  <th className="px-4 py-2">Désignation</th>
                  <th className="px-4 py-2 text-right">Quantité</th>
                  <th className="px-4 py-2 text-right">Prix unitaire</th>
                  <th className="px-4 py-2 text-right">Montant</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-500">
                      {r.reference ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-right">{fmt(r.quantity)}</td>
                    <td className="px-4 py-2 text-right">
                      {r.unit_cost ? `${fmt(r.unit_cost)} FCFA` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {fmt(r.montant)} FCFA
                    </td>
                    <td className="px-4 py-2">
                      {r.isLow && (
                        <span className="rounded-full bg-orange-50 px-2 py-1 text-xs text-orange-600">
                          Seuil bas
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                  <td colSpan={4} className="px-4 py-2 text-right">
                    Valeur totale du stock
                  </td>
                  <td className="px-4 py-2 text-right">
                    {fmt(totalMontant)} FCFA
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
