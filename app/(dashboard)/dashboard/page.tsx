import { createClient } from "@/lib/supabase/server";
import TresorerieChart from "./tresorerie-chart";
import { Wallet, TrendingUp, TrendingDown, Scale } from "lucide-react";

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
          color={(solde?.solde ?? 0) >= 0 ? "blue" : "red"}
          icon={Wallet}
        />
        <KpiCard
          label="Recettes du mois"
          value={resultatMois?.total_recettes ?? 0}
          color="green"
          icon={TrendingUp}
        />
        <KpiCard
          label="Dépenses du mois"
          value={resultatMois?.total_depenses ?? 0}
          color="red"
          icon={TrendingDown}
        />
        <KpiCard
          label="Résultat net"
          value={resultatMois?.resultat_net ?? 0}
          color={(resultatMois?.resultat_net ?? 0) >= 0 ? "green" : "red"}
          icon={Scale}
        />
      </div>

      <div className="mt-6 rounded-lg border-t-4 border-primary bg-white p-4">
        <p className="mb-3 text-sm font-medium text-gray-700">
          Évolution du solde de trésorerie
        </p>
        <TresorerieChart data={chartData} />
      </div>
    </div>
  );
}

const COLOR_STYLES = {
  blue: {
    border: "border-l-blue-500",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    value: "text-blue-700",
  },
  green: {
    border: "border-l-green-500",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    value: "text-green-700",
  },
  red: {
    border: "border-l-red-500",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    value: "text-red-700",
  },
} as const;

function KpiCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: keyof typeof COLOR_STYLES;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const s = COLOR_STYLES[color];
  return (
    <div
      className={`rounded-lg border-l-4 bg-white p-4 ${s.border}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <span className={`rounded-full p-1.5 ${s.iconBg}`}>
          <Icon className={`h-4 w-4 ${s.iconColor}`} />
        </span>
      </div>
      <p className={`text-2xl font-medium ${s.value}`}>
        {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value)} FCFA
      </p>
    </div>
  );
}
