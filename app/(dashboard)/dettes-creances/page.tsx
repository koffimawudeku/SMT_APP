import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import DebtForm from "./debt-form";
import DebtRow from "./debt-row";

export default async function DettesCreancesPage() {
  const { companyId } = await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();
  const { data: items } = await supabase
    .from("debts_receivables")
    .select("id, type, third_party_name, label, amount, amount_paid, due_date, status")
    .eq("company_id", companyId)
    .order("due_date", { ascending: true });

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

  const totals = (items ?? []).reduce(
    (acc, item) => {
      const key = item.type === "creance" ? "creances" : "dettes";
      acc[key].total += item.amount;
      acc[key].regle += item.amount_paid;
      return acc;
    },
    {
      creances: { total: 0, regle: 0 },
      dettes: { total: 0, regle: 0 },
    }
  );

  const soldeCreances = totals.creances.total - totals.creances.regle;
  const soldeDettes = totals.dettes.total - totals.dettes.regle;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-6 text-xl font-medium">Dettes & créances</h1>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-sm font-medium text-green-800">Créances</p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Total</dt>
              <dd className="font-medium">{fmt(totals.creances.total)} FCFA</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Réglé</dt>
              <dd>{fmt(totals.creances.regle)} FCFA</dd>
            </div>
            <div className="flex justify-between border-t border-green-200 pt-1">
              <dt className="text-gray-600">Solde (reste à recevoir)</dt>
              <dd className="font-medium">{fmt(soldeCreances)} FCFA</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-sm font-medium text-red-800">Dettes</p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Total</dt>
              <dd className="font-medium">{fmt(totals.dettes.total)} FCFA</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Réglé</dt>
              <dd>{fmt(totals.dettes.regle)} FCFA</dd>
            </div>
            <div className="flex justify-between border-t border-red-200 pt-1">
              <dt className="text-gray-600">Solde (reste à payer)</dt>
              <dd className="font-medium">{fmt(soldeDettes)} FCFA</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Position nette (Créances − Dettes)</span>
          <span
            className={`font-medium ${
              soldeCreances - soldeDettes >= 0 ? "text-green-700" : "text-red-700"
            }`}
          >
            {fmt(soldeCreances - soldeDettes)} FCFA
          </span>
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
        <DebtForm companyId={companyId} />
      </div>

      {!items || items.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune dette ni créance enregistrée.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <DebtRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
