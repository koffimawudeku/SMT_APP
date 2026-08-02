import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import {
  getEarliestDataYear,
  listExercices,
  resolveExercice,
  yearOf,
} from "@/lib/exercice";
import TresorerieChart from "./tresorerie-chart";
import ExerciceSelector from "../exercice-selector";
import { Wallet, TrendingUp, TrendingDown, Scale } from "lucide-react";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { exercice?: string };
}) {
  const { companyId } = await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();
  const exercice = resolveExercice(searchParams.exercice);
  const cutoffISO = exercice.isCurrent
    ? new Date().toISOString().slice(0, 10)
    : exercice.end;

  const { data: allTransactions } = await supabase
    .from("transactions")
    .select("transaction_date, type, amount")
    .eq("company_id", companyId)
    .order("transaction_date", { ascending: true });

  const earliestYear = await getEarliestDataYear(supabase, companyId);
  const years = listExercices(earliestYear, exercice.year);

  const txns = allTransactions ?? [];

  // Solde d'ouverture (report à nouveau) : cumul de tous les flux des
  // exercices antérieurs.
  let openingBalance = 0;
  for (const t of txns) {
    if (yearOf(t.transaction_date) >= exercice.year) continue;
    openingBalance += t.type === "recette" ? t.amount : -t.amount;
  }

  // Flux de l'exercice sélectionné (bornés à la date d'arrêté).
  const exerciceTxns = txns.filter(
    (t) =>
      yearOf(t.transaction_date) === exercice.year &&
      t.transaction_date <= cutoffISO
  );

  let recettes = 0;
  let depenses = 0;
  for (const t of exerciceTxns) {
    if (t.type === "recette") recettes += t.amount;
    else depenses += t.amount;
  }
  const resultat = recettes - depenses;
  const soldeCloture = openingBalance + resultat;

  // Courbe d'évolution du solde sur l'exercice, jour par jour, en partant
  // du report à nouveau pour une continuité avec l'exercice précédent.
  const dailyTotals = new Map<string, number>();
  for (const t of exerciceTxns) {
    const signed = t.type === "recette" ? t.amount : -t.amount;
    dailyTotals.set(
      t.transaction_date,
      (dailyTotals.get(t.transaction_date) ?? 0) + signed
    );
  }

  let cumul = openingBalance;
  const chartData = Array.from(dailyTotals.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, delta]) => {
      cumul += delta;
      return { date, solde: cumul };
    });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-medium">Tableau de bord</h1>
        <ExerciceSelector years={years} selected={exercice.year} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label={
            exercice.isCurrent
              ? "Solde de trésorerie"
              : `Solde au 31/12/${exercice.year}`
          }
          value={soldeCloture}
          color={soldeCloture >= 0 ? "blue" : "red"}
          icon={Wallet}
        />
        <KpiCard
          label="Recettes de l'exercice"
          value={recettes}
          color="green"
          icon={TrendingUp}
        />
        <KpiCard
          label="Dépenses de l'exercice"
          value={depenses}
          color="red"
          icon={TrendingDown}
        />
        <KpiCard
          label="Résultat de trésorerie"
          value={resultat}
          color={resultat >= 0 ? "green" : "red"}
          icon={Scale}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
        <p className="mb-3 text-sm font-medium text-gray-700">
          Évolution du solde de trésorerie — exercice {exercice.year}
        </p>
        {openingBalance !== 0 && (
          <p className="mb-2 text-xs text-gray-400">
            Report à nouveau au 1er janvier {exercice.year} :{" "}
            {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
              openingBalance
            )}{" "}
            FCFA
          </p>
        )}
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
      className={`rounded-2xl border border-gray-200 border-l-4 bg-white p-4 shadow-card ${s.border}`}
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
