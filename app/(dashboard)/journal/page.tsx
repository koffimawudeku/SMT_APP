import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import TransactionActions from "./transaction-actions";

// Ordre et libellés strictement identiques à l'onglet
// "Journal Recettes Dépenses" du fichier Excel SMT.
const VENTILATION_RECETTES = ["Ventes", "Autres Recettes"];
const VENTILATION_DEPENSES = [
  "Matériel/Mobilier",
  "Achat Marchandises",
  "Achat Matières/Fourn.",
  "Loyer",
  "Salaires",
  "Eau/Électricité",
  "Impôts/Taxes",
  "Autres Dépenses",
];
const ALL_VENTILATIONS = [...VENTILATION_RECETTES, ...VENTILATION_DEPENSES];

type Row = {
  id: string;
  transaction_date: string;
  description: string | null;
  type: "recette" | "depense";
  payment_method: string;
  amount: number;
  category_id: string | null;
  category_name: string | null;
};

export default async function JournalPage() {
  const { companyId } = await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();
  const { data: raw } = await supabase
    .from("transactions")
    .select(
      "id, transaction_date, description, type, payment_method, amount, category_id, categories(name)"
    )
    .eq("company_id", companyId)
    .order("transaction_date", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type")
    .eq("company_id", companyId)
    .order("name");

  const transactions: Row[] = (raw ?? []).map((t) => ({
    id: t.id,
    transaction_date: t.transaction_date,
    description: t.description,
    type: t.type,
    payment_method: t.payment_method,
    amount: t.amount,
    category_id: t.category_id,
    category_name: (t.categories as unknown as { name: string } | null)?.name ?? null,
  }));

  // Calcul des soldes courants Caisse et Banque, ligne par ligne,
  // exactement comme les formules de la colonne E (Solde Caisse) et
  // H (Solde Banque) dans le fichier Excel d'origine.
  let soldeCaisse = 0;
  let soldeBanque = 0;

  const rows = transactions.map((t) => {
    const isEntree = t.type === "recette";
    const montantSigne = isEntree ? t.amount : -t.amount;

    if (t.payment_method === "caisse") soldeCaisse += montantSigne;
    if (t.payment_method === "banque") soldeBanque += montantSigne;

    return { ...t, soldeCaisse, soldeBanque };
  });

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6">
      <h1 className="mb-1 text-xl font-medium">Journal de Trésorerie SMT</h1>
      <p className="mb-6 text-sm text-gray-500">Caisse et Banque</p>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun flux enregistré pour le moment. Rendez-vous sur{" "}
          <span className="font-medium">Saisie de flux</span> pour ajouter le
          premier.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full whitespace-nowrap text-xs">
            <thead>
              <tr>
                <th
                  colSpan={2}
                  className="border-b border-gray-200 bg-[#1A56A0] px-2 py-1 text-left text-white"
                >
                  Date / Libellé
                </th>
                <th
                  colSpan={3}
                  className="border-b border-gray-200 bg-green-100 px-2 py-1 text-center text-green-800"
                >
                  CAISSE
                </th>
                <th
                  colSpan={3}
                  className="border-b border-gray-200 bg-blue-100 px-2 py-1 text-center text-blue-800"
                >
                  BANQUE
                </th>
                <th
                  colSpan={2}
                  className="border-b border-gray-200 bg-green-100 px-2 py-1 text-center text-green-800"
                >
                  Ventilations Recettes
                </th>
                <th
                  colSpan={8}
                  className="border-b border-gray-200 bg-orange-100 px-2 py-1 text-center text-orange-800"
                >
                  Ventilations Dépenses
                </th>
                <th
                  rowSpan={2}
                  className="border-b border-gray-200 bg-gray-100 px-2 py-1 text-center text-gray-600"
                >
                  Actions
                </th>
              </tr>
              <tr className="bg-gray-50 text-gray-500">
                <th className="px-2 py-1 text-left">Date</th>
                <th className="px-2 py-1 text-left">Libellé</th>
                <th className="px-2 py-1 text-right">Entrée</th>
                <th className="px-2 py-1 text-right">Sortie</th>
                <th className="px-2 py-1 text-right">Solde</th>
                <th className="px-2 py-1 text-right">Entrée</th>
                <th className="px-2 py-1 text-right">Sortie</th>
                <th className="px-2 py-1 text-right">Solde</th>
                {ALL_VENTILATIONS.map((v) => (
                  <th key={v} className="px-2 py-1 text-right">
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isCaisse = r.payment_method === "caisse";
                const isEntree = r.type === "recette";

                return (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="px-2 py-1">{r.transaction_date}</td>
                    <td className="max-w-[180px] truncate px-2 py-1">
                      {r.description ?? "—"}
                    </td>
                    <td className="px-2 py-1 text-right text-green-700">
                      {isCaisse && isEntree ? fmt(r.amount) : ""}
                    </td>
                    <td className="px-2 py-1 text-right text-red-700">
                      {isCaisse && !isEntree ? fmt(r.amount) : ""}
                    </td>
                    <td className="px-2 py-1 text-right font-medium">
                      {fmt(r.soldeCaisse)}
                    </td>
                    <td className="px-2 py-1 text-right text-green-700">
                      {!isCaisse && isEntree ? fmt(r.amount) : ""}
                    </td>
                    <td className="px-2 py-1 text-right text-red-700">
                      {!isCaisse && !isEntree ? fmt(r.amount) : ""}
                    </td>
                    <td className="px-2 py-1 text-right font-medium">
                      {fmt(r.soldeBanque)}
                    </td>
                    {ALL_VENTILATIONS.map((v) => (
                      <td key={v} className="px-2 py-1 text-right">
                        {r.category_name === v ? fmt(r.amount) : ""}
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <TransactionActions
                        transaction={r}
                        categories={categories ?? []}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex gap-6 text-sm">
        <p>
          <span className="text-gray-500">Solde Caisse : </span>
          <span className="font-medium">
            {fmt(rows.at(-1)?.soldeCaisse ?? 0)} FCFA
          </span>
        </p>
        <p>
          <span className="text-gray-500">Solde Banque : </span>
          <span className="font-medium">
            {fmt(rows.at(-1)?.soldeBanque ?? 0)} FCFA
          </span>
        </p>
      </div>
    </div>
  );
}
