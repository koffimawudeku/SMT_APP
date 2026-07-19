export type Asset = {
  id: string;
  name: string;
  acquisition_date: string;
  acquisition_value: number;
  useful_life_years: number;
  exit_date: string | null;
  exit_price: number | null;
};

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Amortissement linéaire prorata temporis, plafonné à la valeur
 * d'acquisition. Si l'actif est sorti (exit_date), le calcul s'arrête
 * à cette date plutôt qu'à `asOfDate`.
 */
export function computeDepreciation(asset: Asset, asOfDate: Date) {
  const tauxAnnuel = 1 / asset.useful_life_years;
  const acquisitionDate = new Date(asset.acquisition_date);
  const endDate = asset.exit_date ? new Date(asset.exit_date) : asOfDate;

  const joursEcoules = Math.max(
    0,
    (endDate.getTime() - acquisitionDate.getTime()) / DAY_MS
  );
  const anneesEcoulees = joursEcoules / 365;

  const cumulAmortissement = Math.min(
    asset.acquisition_value,
    tauxAnnuel * asset.acquisition_value * anneesEcoulees
  );
  const vcn = Math.max(0, asset.acquisition_value - cumulAmortissement);

  return { tauxAnnuel, cumulAmortissement, vcn };
}

/**
 * Dotation aux amortissements pour une année civile donnée : la part
 * du cumul d'amortissement qui tombe entre le 1er janvier et le 31
 * décembre de cette année (ou la date de sortie si antérieure).
 */
export function computeDotationForYear(asset: Asset, year: number) {
  const startOfYear = new Date(`${year}-01-01`);
  const endOfYear = new Date(`${year}-12-31`);

  const acquisitionDate = new Date(asset.acquisition_date);
  if (acquisitionDate > endOfYear) return 0;

  const { cumulAmortissement: cumulDebut } = computeDepreciation(
    asset,
    startOfYear < acquisitionDate ? acquisitionDate : startOfYear
  );
  const { cumulAmortissement: cumulFin } = computeDepreciation(
    asset,
    endOfYear
  );

  return Math.max(0, cumulFin - cumulDebut);
}
