import { computeDotationForYear, type Asset } from "./depreciation";

export type Txn = {
  type: "recette" | "depense";
  amount: number;
  transaction_date: string;
  category_name: string | null;
};

export function buildResultat(transactions: Txn[], assets: Asset[], year: number) {
  const inYear = transactions.filter(
    (t) => new Date(t.transaction_date).getFullYear() === year
  );

  const sumByCategories = (names: string[], type: "recette" | "depense") =>
    inYear
      .filter((t) => t.type === type && names.includes(t.category_name ?? ""))
      .reduce((sum, t) => sum + t.amount, 0);

  const ventes = sumByCategories(["Ventes"], "recette");
  const autresRecettes = sumByCategories(["Autres Recettes"], "recette");

  const achats = sumByCategories(
    ["Achat Marchandises", "Achat Matières/Fourn."],
    "depense"
  );
  const servicesExterieurs = sumByCategories(
    ["Loyer", "Eau/Électricité", "Matériel/Mobilier"],
    "depense"
  );
  const impotsEtTaxes = sumByCategories(["Impôts/Taxes"], "depense");
  const chargesPersonnel = sumByCategories(["Salaires"], "depense");
  const autresCharges = sumByCategories(["Autres Dépenses"], "depense");
  const dotationsAmortissements = assets.reduce(
    (sum, a) => sum + computeDotationForYear(a, year),
    0
  );

  const totalRecettes = ventes + autresRecettes;
  const totalDepenses =
    achats +
    servicesExterieurs +
    impotsEtTaxes +
    chargesPersonnel +
    autresCharges +
    dotationsAmortissements;

  return {
    ventes,
    autresRecettes,
    totalRecettes,
    achats,
    servicesExterieurs,
    impotsEtTaxes,
    chargesPersonnel,
    autresCharges,
    dotationsAmortissements,
    totalDepenses,
    resultat: totalRecettes - totalDepenses,
  };
}
