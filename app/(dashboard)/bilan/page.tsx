import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { computeBilan } from "@/lib/bilan";

export default async function BilanPage() {
  const { companyId, initialCapital } = await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();
  const b = await computeBilan(supabase, companyId, initialCapital);

  const ecart = b.totalActif - b.totalPassif;
  const equilibre = Math.abs(ecart) < 1;
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
  const today = new Date();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-medium">Bilan (SMT)</h1>
      <p className="mb-6 text-sm text-gray-500">
        Situation patrimoniale au {today.toLocaleDateString("fr-FR")}
      </p>

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
