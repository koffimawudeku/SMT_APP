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

export default async function BilanPage({
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

  const ecart = b.totalActif - b.totalPassif;
  const equilibre = Math.abs(ecart) < 1;
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
  const arreteLabel = exercice.isCurrent
    ? new Date().toLocaleDateString("fr-FR")
    : `31/12/${exercice.year}`;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-medium">Bilan (SMT)</h1>
          <p className="text-sm text-gray-500">
            Situation patrimoniale au {arreteLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExerciceSelector years={years} selected={exercice.year} />
          <PrintButton />
        </div>
      </div>

      {!equilibre && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          ⚠ Le Total Actif ({fmt(b.totalActif)} FCFA) ne correspond pas au
          Total Passif ({fmt(b.totalPassif)} FCFA) — écart de{" "}
          {fmt(Math.abs(ecart))} FCFA. Vérifiez vos saisies (stocks,
          créances/dettes, capital initial).
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white">
          <p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium">
            ACTIF (Emplois)
          </p>
          <dl className="space-y-2 p-4 text-sm">
            <Row label="Immobilisations nettes" value={b.immobilisationsNettes} fmt={fmt} />
            <Row label="Stocks" value={b.stocks} fmt={fmt} />
            <Row label="Clients et débiteurs divers" value={b.creances} fmt={fmt} />
            <Row label="Trésorerie Actif" value={b.tresorerie} fmt={fmt} />
            <div className="flex justify-between border-t border-gray-200 pt-2 font-medium">
              <dt>Total Actif</dt>
              <dd>{fmt(b.totalActif)} FCFA</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <p className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium">
            PASSIF (Ressources)
          </p>
          <dl className="space-y-2 p-4 text-sm">
            <Row label="Compte exploitant (capital initial)" value={initialCapital} fmt={fmt} />
            <Row
              label="Report à nouveau (résultats antérieurs)"
              value={b.reportANouveau}
              fmt={fmt}
            />
            <Row label="Résultat de l'exercice" value={b.resultat.resultat} fmt={fmt} />
            <Row
              label="Emprunts et dettes financières"
              value={b.empruntsDettesFinancieres}
              fmt={fmt}
              note="non suivi pour l'instant"
            />
            <Row label="Fournisseurs et créanciers divers" value={b.dettesFournisseurs} fmt={fmt} />
            <div className="flex justify-between border-t border-gray-200 pt-2 font-medium">
              <dt>Total Passif</dt>
              <dd>{fmt(b.totalPassif)} FCFA</dd>
            </div>
          </dl>
        </div>
      </div>

      {equilibre && (
        <p className="mt-4 text-sm text-green-700">
          ✓ Le Bilan est équilibré (Actif = Passif).
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  fmt,
  note,
}: {
  label: string;
  value: number;
  fmt: (n: number) => string;
  note?: string;
}) {
  return (
    <div className="flex justify-between text-gray-700">
      <dt>
        {label}
        {note && <span className="ml-1 text-xs text-gray-400">({note})</span>}
      </dt>
      <dd>{fmt(value)} FCFA</dd>
    </div>
  );
}
