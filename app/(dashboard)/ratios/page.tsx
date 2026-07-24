import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { computeBilan } from "@/lib/bilan";
import {
  getEarliestDataYear,
  listExercices,
  resolveExercice,
} from "@/lib/exercice";
import ExerciceSelector from "../exercice-selector";
import PrintButton from "../print-button";

type Level = "bon" | "alerte" | "critique";

function levelStyles(level: Level) {
  switch (level) {
    case "bon":
      return "border-green-200 bg-green-50 text-green-800";
    case "alerte":
      return "border-orange-200 bg-orange-50 text-orange-800";
    case "critique":
      return "border-red-200 bg-red-50 text-red-800";
  }
}

function RatioCard({
  label,
  value,
  level,
  description,
}: {
  label: string;
  value: string;
  level: Level;
  description: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${levelStyles(level)}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-2xl font-medium">{value}</p>
      <p className="mt-2 text-xs opacity-80">{description}</p>
    </div>
  );
}

export default async function RatiosPage({
  searchParams,
}: {
  searchParams: { exercice?: string };
}) {
  const { companyId, initialCapital } = await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();
  const exercice = resolveExercice(searchParams.exercice);
  const b = await computeBilan(supabase, companyId, initialCapital, exercice);
  const earliestYear = await getEarliestDataYear(supabase, companyId);
  const years = listExercices(earliestYear, exercice.year);

  const chiffreAffaires = b.resultat.totalRecettes;
  const achatsConsommes = b.resultat.achats;
  const resultatNet = b.resultat.resultat;

  const margeCommerciale =
    chiffreAffaires > 0
      ? (chiffreAffaires - achatsConsommes) / chiffreAffaires
      : 0;
  const rentabiliteNette =
    chiffreAffaires > 0 ? resultatNet / chiffreAffaires : 0;
  const liquiditeGenerale =
    b.dettesFournisseurs > 0
      ? (b.stocks + b.creances + b.tresorerie) / b.dettesFournisseurs
      : b.stocks + b.creances + b.tresorerie > 0
        ? Infinity
        : 0;
  const autonomieFinanciere =
    b.totalPassif > 0 ? b.capitauxPropres / b.totalPassif : 0;

  const pct = (n: number) =>
    n === Infinity ? "∞" : `${(n * 100).toFixed(1)}%`;
  const ratio = (n: number) => (n === Infinity ? "∞" : n.toFixed(2));

  const levelForPct = (n: number, bon: number, alerte: number): Level =>
    n >= bon ? "bon" : n >= alerte ? "alerte" : "critique";

  const levelForRatio = (n: number, bon: number, alerte: number): Level =>
    n === Infinity || n >= bon ? "bon" : n >= alerte ? "alerte" : "critique";

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-medium">Analyse des Ratios Financiers</h1>
          <p className="text-sm text-gray-500">
            Calculés à partir du Compte de Résultat et du Bilan de l&apos;exercice{" "}
            {exercice.year}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExerciceSelector years={years} selected={exercice.year} />
          <PrintButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RatioCard
          label="Marge Commerciale"
          value={pct(margeCommerciale)}
          level={levelForPct(margeCommerciale, 0.3, 0.15)}
          description="(Chiffre d'Affaires − Achats consommés) / Chiffre d'Affaires"
        />
        <RatioCard
          label="Rentabilité Nette"
          value={pct(rentabiliteNette)}
          level={levelForPct(rentabiliteNette, 0.1, 0)}
          description="Résultat Net / Chiffre d'Affaires"
        />
        <RatioCard
          label="Liquidité Générale"
          value={ratio(liquiditeGenerale)}
          level={levelForRatio(liquiditeGenerale, 1.5, 1)}
          description="(Stocks + Créances + Trésorerie) / Dettes fournisseurs"
        />
        <RatioCard
          label="Autonomie Financière"
          value={pct(autonomieFinanciere)}
          level={levelForPct(autonomieFinanciere, 0.3, 0.15)}
          description="Capitaux Propres / Total Passif"
        />
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Seuils indicatifs (vert = bon, orange = alerte, rouge = critique),
        donnés à titre de repère général — à ajuster selon votre secteur
        d&apos;activité.
      </p>
    </div>
  );
}
