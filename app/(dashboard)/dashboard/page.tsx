import { createClient } from "@/lib/supabase/server";
import TresorerieChart from "./tresorerie-chart";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Récupère le premier dossier accessible à l'utilisateur.
  // En V1 multi-dossiers, remplacez par un sélecteur d'entreprise actif.
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, companies(name)")
    .eq("user_id", user?.id)
    .limit(1)
    .single();

  const companyId = membership?.company_id;

  const { data: solde } = await supabase
    .from("v_solde_tresorerie")
    .select("solde")
    .eq("company_id", companyId)
    .single();

  const { data: resultatMois } = await supabase
    .from("v_compte_resultat")
    .select("*")
    .eq("company_id", companyId)
    .order("periode", { ascending: false })
    .limit(1)
    .single();

  // Évolution du solde cumulé (Caisse + Banque) jour par jour,
  // pour le graphique de tendance.
  const { data: allTransactions } = await supabase
    .from("transactions")
    .select("transaction_date, type, amount")
    .eq("company_id", companyId)
    .order("transaction_date", { ascending: true });

  const dailyTotals = new Map<string, number>();
  for (const t of allTransactions ?? []) {
    const signed = t.type === "recette" ? t.amount : -t.amount;
    dailyTotals.set(
      t.transaction_date,
      (dailyTotals.get(t.transaction_date) ?? 0) + signed
    );
  }

  let cumul = 0;
  const chartData = Array.from(dailyTotals.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, delta]) => {
      cumul += delta;
      return { date, solde: cumul };
    });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-xl font-medium">Tableau de bord</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Solde de trésorerie"
          value={solde?.solde ?? 0}
        />
        <KpiCard
          label="Recettes du mois"
          value={resultatMois?.total_recettes ?? 0}
        />
        <KpiCard
          label="Dépenses du mois"
          value={resultatMois?.total_depenses ?? 0}
        />
        <KpiCard
          label="Résultat net"
          value={resultatMois?.resultat_net ?? 0}
        />
      </div>

      <div className="mt-6 rounded-lg bg-white p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">
          Évolution du solde de trésorerie
        </p>
        <TresorerieChart data={chartData} />
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-medium">
        {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} FCFA
      </p>
    </div>
  );
}
