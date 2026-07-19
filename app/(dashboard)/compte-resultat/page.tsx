import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { buildResultat, type Txn } from "@/lib/compte-resultat";

export default async function CompteResultatPage() {
  const { companyId } = await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();

  const { data: rawTransactions } = await supabase
    .from("transactions")
    .select("type, amount, transaction_date, categories(name)")
    .eq("company_id", companyId);

  const transactions: Txn[] = (rawTransactions ?? []).map((t) => ({
    type: t.type,
    amount: t.amount,
    transaction_date: t.transaction_date,
    category_name:
      (t.categories as unknown as { name: string } | null)?.name ?? null,
  }));

  const { data: assets } = await supabase
    .from("assets")
    .select(
      "id, name, acquisition_date, acquisition_value, useful_life_years, exit_date, exit_price"
    )
    .eq("company_id", companyId);

  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const n = buildResultat(transactions, assets ?? [], currentYear);
  const n1 = buildResultat(transactions, assets ?? [], previousYear);

  const fmt = (val: number) => new Intl.NumberFormat("fr-FR").format(val);

  const rows: { label: string; n1: number; n: number; bold?: boolean }[] = [
    { label: "Recettes sur ventes ou prestations de services", n1: n1.ventes, n: n.ventes },
    { label: "Autres recettes sur activités", n1: n1.autresRecettes, n: n.autresRecettes },
    { label: "TOTAL RECETTES (A)", n1: n1.totalRecettes, n: n.totalRecettes, bold: true },
    { label: "Achats de marchandises ou matières premières", n1: n1.achats, n: n.achats },
    { label: "Services extérieurs (Loyer, Eau/Électricité, Matériel)", n1: n1.servicesExterieurs, n: n.servicesExterieurs },
    { label: "Impôts et taxes", n1: n1.impotsEtTaxes, n: n.impotsEtTaxes },
    { label: "Charges de personnel", n1: n1.chargesPersonnel, n: n.chargesPersonnel },
    { label: "Autres charges", n1: n1.autresCharges, n: n.autresCharges },
    { label: "Dotations aux amortissements", n1: n1.dotationsAmortissements, n: n.dotationsAmortissements },
    { label: "TOTAL DÉPENSES (B)", n1: n1.totalDepenses, n: n.totalDepenses, bold: true },
  ];

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-medium">Compte de Résultat (SMT)</h1>
      <p className="mb-6 text-sm text-gray-500">
        Comparatif Exercice {currentYear} / {previousYear}
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Rubrique</th>
              <th className="px-4 py-2 text-right">{previousYear}</th>
              <th className="px-4 py-2 text-right">{currentYear}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.label}
                className={`border-t border-gray-100 ${
                  r.bold ? "bg-gray-50 font-medium" : ""
                }`}
              >
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-4 py-2 text-right">{fmt(r.n1)}</td>
                <td className="px-4 py-2 text-right">{fmt(r.n)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-medium">
              <td className="px-4 py-2">
                RÉSULTAT DE L&apos;EXERCICE (A − B)
              </td>
              <td
                className={`px-4 py-2 text-right ${
                  n1.resultat >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {fmt(n1.resultat)} FCFA
              </td>
              <td
                className={`px-4 py-2 text-right ${
                  n.resultat >= 0 ? "text-green-700" : "text-red-700"
                }`}
              >
                {fmt(n.resultat)} FCFA
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        {n.resultat >= 0
          ? "Bénéfice"
          : "Perte"}{" "}
        pour l&apos;exercice {currentYear}. Les dotations aux amortissements
        proviennent du module Suivi du Matériel.
      </p>
    </div>
  );
}
