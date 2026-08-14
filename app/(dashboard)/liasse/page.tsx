import { Download, FileSpreadsheet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import {
  getEarliestDataYear,
  listExercices,
  resolveExercice,
} from "@/lib/exercice";
import ExerciceSelector from "../exercice-selector";

export const dynamic = "force-dynamic";

export default async function LiassePage({
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
  const earliestYear = await getEarliestDataYear(supabase, companyId);
  const years = listExercices(earliestYear, exercice.year);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-medium">Liasse fiscale SMT</h1>
          <p className="text-sm text-gray-500">
            SYSCOHADA révisé — Système Minimal de Trésorerie
          </p>
        </div>
        <ExerciceSelector years={years} selected={exercice.year} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileSpreadsheet className="h-6 w-6" />
          </span>
          <div>
            <p className="font-medium">Liasse renseignée — exercice {exercice.year}</p>
            <p className="text-sm text-gray-500">
              Générée au format Excel officiel, comparatif N / N-1.
            </p>
          </div>
        </div>

        <a
          href={`/liasse/download?exercice=${exercice.year}`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Download className="h-4 w-4" />
          Télécharger la liasse (Excel)
        </a>

        <div className="mt-6 space-y-2 text-sm text-gray-600">
          <p className="font-medium text-gray-700">Renseigné automatiquement :</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Bilan (Actif / Passif), exercices N et N-1</li>
            <li>Compte de résultat, avec variations et dotations</li>
            <li>Détail du chiffre d&apos;affaires</li>
            <li>Note 1 — Suivi du matériel (immobilisations)</li>
            <li>Note 2 — État des stocks (valeurs finale et initiale)</li>
            <li>Note 3 — État des créances et des dettes</li>
            <li>Note 4 — Journal de trésorerie Caisse et Banque (récap mensuel)</li>
            <li>
              Fiches d&apos;identification (dénomination, sigle, immatriculation,
              RCCM, adresse, téléphone, activité…) depuis le{" "}
              <span className="font-medium">Profil de l&apos;entreprise</span>
            </li>
          </ul>
          <p className="pt-2 text-xs text-gray-400">
            Renseignez le Profil de l&apos;entreprise pour que les fiches
            d&apos;identification se remplissent. La Note 4 est en récapitulatif
            mensuel (une ligne par mois, en continu).
          </p>
        </div>
      </div>
    </div>
  );
}
