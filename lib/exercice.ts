/**
 * Gestion de l'exercice comptable (année civile) pour toutes les pages
 * de restitution : Journal, Compte de Résultat, Bilan, Ratios.
 *
 * Les exercices SMT suivent l'année civile (1er janvier → 31 décembre),
 * cohérent avec `buildResultat` qui filtre déjà par `getFullYear()`.
 */

export type Exercice = {
  /** L'année de l'exercice, ex. 2026. */
  year: number;
  /** Premier jour de l'exercice au format ISO (YYYY-01-01). */
  start: string;
  /** Dernier jour de l'exercice au format ISO (YYYY-12-31). */
  end: string;
  /**
   * Date d'arrêté des soldes patrimoniaux (Bilan) : le 31 décembre pour
   * un exercice clos, ou aujourd'hui si l'exercice est encore en cours.
   */
  cutoff: Date;
  /** Vrai si l'exercice est l'année civile courante (non clos). */
  isCurrent: boolean;
};

/**
 * Résout l'exercice demandé à partir d'un paramètre d'URL (`?exercice=YYYY`).
 * En l'absence de paramètre valide, retourne l'exercice de l'année courante.
 */
export function resolveExercice(param?: string | string[]): Exercice {
  const raw = Array.isArray(param) ? param[0] : param;
  const currentYear = new Date().getFullYear();

  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const year =
    Number.isInteger(parsed) && parsed >= 2000 && parsed <= currentYear + 1
      ? parsed
      : currentYear;

  const isCurrent = year === currentYear;
  const today = new Date();
  const endOfYear = new Date(`${year}-12-31T23:59:59`);

  return {
    year,
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    // Pour un exercice passé, on arrête au 31/12. Pour l'exercice courant,
    // on s'arrête à aujourd'hui (soldes patrimoniaux "à date").
    cutoff: isCurrent ? today : endOfYear,
    isCurrent,
  };
}

/**
 * Construit la liste des exercices proposés dans le sélecteur : de l'année
 * la plus ancienne trouvée dans les données jusqu'à l'année courante, en
 * incluant toujours au minimum l'exercice sélectionné et l'année courante.
 *
 * @param earliestDataYear année la plus ancienne présente dans les données
 *                          (transactions, immobilisations…), ou null.
 */
export function listExercices(
  earliestDataYear: number | null,
  selectedYear: number
): number[] {
  const currentYear = new Date().getFullYear();
  const from = Math.min(
    earliestDataYear ?? currentYear,
    selectedYear,
    currentYear
  );

  const years: number[] = [];
  for (let y = currentYear; y >= from; y--) {
    years.push(y);
  }
  return years;
}

/**
 * Extrait l'année d'une date ISO/`date` Postgres (`YYYY-MM-DD`) sans passer
 * par `new Date()` (évite tout décalage de fuseau horaire).
 */
export function yearOf(isoDate: string): number {
  return Number.parseInt(isoDate.slice(0, 4), 10);
}

/**
 * Année la plus ancienne présente dans les données de l'entreprise
 * (première transaction ou première acquisition d'immobilisation), utilisée
 * pour peupler le sélecteur d'exercice. Retourne null si aucune donnée.
 */
export async function getEarliestDataYear(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string
): Promise<number | null> {
  const [{ data: tx }, { data: asset }] = await Promise.all([
    supabase
      .from("transactions")
      .select("transaction_date")
      .eq("company_id", companyId)
      .order("transaction_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("assets")
      .select("acquisition_date")
      .eq("company_id", companyId)
      .order("acquisition_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const years: number[] = [];
  if (tx?.transaction_date) years.push(yearOf(tx.transaction_date));
  if (asset?.acquisition_date) years.push(yearOf(asset.acquisition_date));
  return years.length ? Math.min(...years) : null;
}
