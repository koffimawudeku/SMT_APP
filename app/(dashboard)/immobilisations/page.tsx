import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { computeDepreciation, type Asset } from "@/lib/depreciation";
import AssetForm from "./asset-form";
import AssetRow from "./asset-row";

export default async function ImmobilisationsPage() {
  const { companyId } = await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("assets")
    .select(
      "id, name, acquisition_date, acquisition_value, useful_life_years, exit_date, exit_price"
    )
    .eq("company_id", companyId)
    .order("acquisition_date", { ascending: false });

  const assets: Asset[] = data ?? [];
  const today = new Date();

  const rows = assets.map((a) => ({
    ...a,
    ...computeDepreciation(a, today),
  }));

  const totalVCN = rows.reduce((sum, r) => sum + r.vcn, 0);
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-1 text-xl font-medium">Suivi du Matériel</h1>
      <p className="mb-6 text-sm text-gray-500">
        Registre des immobilisations et calcul automatique des amortissements.
      </p>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
        <AssetForm companyId={companyId} />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucune immobilisation enregistrée.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">Désignation</th>
                <th className="px-3 py-2">Acquisition</th>
                <th className="px-3 py-2 text-right">Valeur</th>
                <th className="px-3 py-2 text-right">Durée</th>
                <th className="px-3 py-2 text-right">Taux</th>
                <th className="px-3 py-2 text-right">Cumul amort.</th>
                <th className="px-3 py-2 text-right">VCN</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <AssetRow key={r.id} asset={r} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                <td colSpan={6} className="px-3 py-2 text-right">
                  Total VCN (alimente l&apos;Actif du Bilan)
                </td>
                <td className="px-3 py-2 text-right">{fmt(totalVCN)} FCFA</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
