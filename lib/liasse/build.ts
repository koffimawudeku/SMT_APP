import path from "path";
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { computeBilan } from "@/lib/bilan";
import { resolveExercice, yearOf, type Exercice } from "@/lib/exercice";

const TEMPLATE_PATH = path.join(process.cwd(), "lib", "liasse", "template.xlsx");

type Txn = {
  type: "recette" | "depense";
  amount: number;
  transaction_date: string;
  payment_method: string;
  category_name: string | null;
};

type YearData = {
  year: number;
  // Bilan
  immobilisations: number;
  stocks: number;
  creances: number;
  caisse: number;
  banque: number;
  totalActif: number;
  compteExploitant: number;
  resultat: number;
  dettes: number;
  totalPassif: number;
  // Compte de résultat
  ventes: number;
  prestations: number;
  autresRecettes: number;
  totalRecettes: number;
  achats: number;
  loyers: number;
  salaires: number;
  impots: number;
  chargesInteret: number;
  autresDepenses: number;
  totalDepenses: number;
  solde: number;
  dotations: number;
};

function sumCat(txns: Txn[], year: number, names: string[]): number {
  return txns
    .filter(
      (t) =>
        yearOf(t.transaction_date) === year &&
        names.includes(t.category_name ?? "")
    )
    .reduce((s, t) => s + t.amount, 0);
}

async function computeYear(
  supabase: SupabaseClient,
  companyId: string,
  initialCapital: number,
  txns: Txn[],
  exercice: Exercice
): Promise<YearData> {
  const b = await computeBilan(supabase, companyId, initialCapital, exercice);
  const year = exercice.year;

  // Répartition Caisse / Banque à la date d'arrêté (mobile money assimilé banque).
  const cutoffISO = exercice.isCurrent
    ? new Date().toISOString().slice(0, 10)
    : exercice.end;
  let caisse = 0;
  let banque = 0;
  for (const t of txns) {
    if (t.transaction_date > cutoffISO) continue;
    const signed = t.type === "recette" ? t.amount : -t.amount;
    if (t.payment_method === "caisse") caisse += signed;
    else banque += signed; // banque + mobile_money
  }

  const ventes = sumCat(txns, year, ["Ventes"]);
  const autresRecettes = sumCat(txns, year, ["Autres Recettes"]);
  const achats = sumCat(txns, year, ["Achat Marchandises", "Achat Matières/Fourn."]);
  const loyers = sumCat(txns, year, ["Loyer"]);
  const salaires = sumCat(txns, year, ["Salaires"]);
  const impots = sumCat(txns, year, ["Impôts/Taxes"]);
  const autresDepenses = sumCat(txns, year, [
    "Autres Dépenses",
    "Eau/Électricité",
    "Matériel/Mobilier",
  ]);

  const totalRecettes = ventes + autresRecettes;
  const totalDepenses = achats + loyers + salaires + impots + autresDepenses;

  return {
    year,
    immobilisations: b.immobilisationsNettes,
    stocks: b.stocks,
    creances: b.creances,
    caisse,
    banque,
    totalActif: b.totalActif,
    compteExploitant: initialCapital,
    resultat: b.resultat.resultat,
    dettes: b.dettesFournisseurs,
    totalPassif: b.totalPassif,
    ventes,
    prestations: 0,
    autresRecettes,
    totalRecettes,
    achats,
    loyers,
    salaires,
    impots,
    chargesInteret: 0,
    autresDepenses,
    totalDepenses,
    solde: totalRecettes - totalDepenses,
    dotations: b.resultat.dotationsAmortissements,
  };
}

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Colonne de ventilation (G→O) selon la catégorie de l'opération.
const VENTILATION_COL: Record<string, string> = {
  Ventes: "G",
  "Autres Recettes": "H",
  "Matériel/Mobilier": "I",
  "Achat Marchandises": "J",
  "Achat Matières/Fourn.": "K",
  Loyer: "L",
  Salaires: "M",
  "Impôts/Taxes": "N",
  "Autres Dépenses": "O",
  "Eau/Électricité": "O",
};

/**
 * Note 4 — Journal de trésorerie SMT, rempli en récapitulatif mensuel
 * (une ligne par mois, en continu sur une seule page), pour la Caisse
 * (onglet NOT4) et la Banque + Mobile Money (onglet NOT4 (2)). Le report à
 * nouveau (solde d'ouverture) figure en ligne 12, les 12 mois en 13-24, et
 * les totaux (formules SUM du modèle) se recalculent.
 */
function fillNote4(wb: ExcelJS.Workbook, txns: Txn[], exercice: Exercice) {
  const year = exercice.year;

  const openingFor = (isCaisse: boolean) =>
    txns
      .filter(
        (t) =>
          yearOf(t.transaction_date) < year &&
          (isCaisse
            ? t.payment_method === "caisse"
            : t.payment_method !== "caisse")
      )
      .reduce((s, t) => s + (t.type === "recette" ? t.amount : -t.amount), 0);

  const fillSheet = (sheetName: string, isCaisse: boolean) => {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) return;

    const rows = txns.filter(
      (t) =>
        yearOf(t.transaction_date) === year &&
        (isCaisse
          ? t.payment_method === "caisse"
          : t.payment_method !== "caisse")
    );

    let solde = openingFor(isCaisse);
    ws.getCell("F12").value = Math.round(solde); // report à nouveau

    for (let m = 0; m < 12; m++) {
      const r = 13 + m;
      const mm = String(m + 1).padStart(2, "0");
      const monthTxns = rows.filter(
        (t) => t.transaction_date.slice(5, 7) === mm
      );
      const recettes = monthTxns
        .filter((t) => t.type === "recette")
        .reduce((s, t) => s + t.amount, 0);
      const depenses = monthTxns
        .filter((t) => t.type === "depense")
        .reduce((s, t) => s + t.amount, 0);
      solde += recettes - depenses;

      ws.getCell(`A${r}`).value = `${mm}/${year}`;
      ws.getCell(`B${r}`).value = MONTHS[m];
      if (recettes > 0) ws.getCell(`D${r}`).value = Math.round(recettes);
      if (depenses > 0) ws.getCell(`E${r}`).value = Math.round(depenses);
      ws.getCell(`F${r}`).value = Math.round(solde);

      // Ventilations du mois par catégorie.
      const byCol: Record<string, number> = {};
      for (const t of monthTxns) {
        const col = VENTILATION_COL[t.category_name ?? ""];
        if (col) byCol[col] = (byCol[col] ?? 0) + t.amount;
      }
      for (const [col, val] of Object.entries(byCol)) {
        if (val > 0) ws.getCell(`${col}${r}`).value = Math.round(val);
      }
    }
  };

  fillSheet("NOT4", true); // Caisse
  fillSheet("NOT4 (2)", false); // Banque + Mobile Money
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : "";
}

/**
 * Renseigne les notes détaillées de la liasse :
 *  - Note 1 : suivi du matériel (immobilisations)
 *  - Note 2 : état des stocks (+ valeurs finale et initiale)
 *  - Note 3 : état des créances et des dettes non échues
 */
async function fillNotes(
  wb: ExcelJS.Workbook,
  supabase: SupabaseClient,
  companyId: string,
  exercice: Exercice
) {
  const cutoffISO = exercice.isCurrent
    ? new Date().toISOString().slice(0, 10)
    : exercice.end;
  const yearStartISO = exercice.start;

  const [{ data: assets }, { data: stockItems }, { data: movements }, { data: debts }] =
    await Promise.all([
      supabase
        .from("assets")
        .select("name, acquisition_date, acquisition_value, exit_date, exit_price")
        .eq("company_id", companyId)
        .order("acquisition_date", { ascending: true }),
      supabase
        .from("stock_items")
        .select("id, reference, name, unit_cost")
        .eq("company_id", companyId)
        .order("name"),
      supabase
        .from("stock_movements")
        .select("stock_item_id, type, quantity, movement_date")
        .eq("company_id", companyId),
      supabase
        .from("debts_receivables")
        .select("type, third_party_name, amount, amount_paid, due_date")
        .eq("company_id", companyId),
    ]);

  // --- NOTE 1 : matériel (lignes 11 à 40) ---
  const note1 = wb.getWorksheet("NOTE1");
  if (note1) {
    (assets ?? []).slice(0, 30).forEach((a, i) => {
      const r = 11 + i;
      note1.getCell(`A${r}`).value = fmtDate(a.acquisition_date);
      note1.getCell(`B${r}`).value = a.name;
      note1.getCell(`G${r}`).value = Math.round(a.acquisition_value ?? 0);
      if (a.exit_date) note1.getCell(`H${r}`).value = fmtDate(a.exit_date);
      if (a.exit_price != null)
        note1.getCell(`I${r}`).value = Math.round(a.exit_price);
    });
  }

  // --- NOTE 2 : stocks (lignes 11 à 72) + valeurs finale / initiale ---
  const qtyAt = (itemId: string, dateISO: string) =>
    (movements ?? [])
      .filter((m) => m.stock_item_id === itemId && m.movement_date <= dateISO)
      .reduce(
        (s, m) => s + (m.type === "sortie" ? -m.quantity : m.quantity),
        0
      );

  const note2 = wb.getWorksheet("NOTE2");
  if (note2) {
    let totalFinal = 0;
    let totalInitial = 0;
    (stockItems ?? []).slice(0, 62).forEach((it, i) => {
      const r = 11 + i;
      const qtyFinal = qtyAt(it.id, cutoffISO);
      const cost = it.unit_cost ?? 0;
      const montant = qtyFinal * cost;
      totalFinal += montant;
      totalInitial += qtyAt(it.id, yearStartISO) * cost;
      note2.getCell(`A${r}`).value = it.reference ?? "";
      note2.getCell(`B${r}`).value = it.name;
      note2.getCell(`G${r}`).value = Math.round(qtyFinal);
      note2.getCell(`H${r}`).value = Math.round(cost);
      note2.getCell(`I${r}`).value = Math.round(montant);
    });
    note2.getCell("I73").value = Math.round(totalFinal);
    note2.getCell("I74").value = Math.round(totalInitial);
  }

  // --- NOTE 3 : état des créances (11-24) et des dettes (31-44) ---
  const note3 = wb.getWorksheet("NOTE3");
  if (note3) {
    const creances = (debts ?? []).filter(
      (d) => d.type === "creance" && (d.amount ?? 0) - (d.amount_paid ?? 0) > 0
    );
    const dettes = (debts ?? []).filter(
      (d) => d.type === "dette" && (d.amount ?? 0) - (d.amount_paid ?? 0) > 0
    );

    creances.slice(0, 14).forEach((d, i) => {
      const r = 11 + i;
      note3.getCell(`A${r}`).value = fmtDate(d.due_date);
      note3.getCell(`B${r}`).value = d.third_party_name;
      note3.getCell(`G${r}`).value = Math.round((d.amount ?? 0) - (d.amount_paid ?? 0));
    });
    dettes.slice(0, 14).forEach((d, i) => {
      const r = 31 + i;
      note3.getCell(`A${r}`).value = fmtDate(d.due_date);
      note3.getCell(`B${r}`).value = d.third_party_name;
      note3.getCell(`G${r}`).value = Math.round((d.amount ?? 0) - (d.amount_paid ?? 0));
    });
  }
}

/** Écrit une valeur dans la cellule située `offset` colonnes après un libellé. */
function setAfterLabel(
  ws: ExcelJS.Worksheet,
  labelIncludes: string,
  value: string,
  colOffset = 1
) {
  ws.eachRow((row) => {
    row.eachCell((cell) => {
      if (
        typeof cell.value === "string" &&
        cell.value.toLowerCase().includes(labelIncludes.toLowerCase())
      ) {
        try {
          const target = ws.getCell(Number(cell.row), Number(cell.col) + colOffset);
          if (!target.value) target.value = value;
        } catch {
          /* cellule fusionnée non inscriptible : on ignore */
        }
      }
    });
  });
}

/**
 * Génère la liasse fiscale SMT (SYSCOHADA révisé) renseignée à partir du
 * modèle Excel officiel, pour l'exercice demandé (N) comparé à N-1.
 */
export async function buildLiasseBuffer(
  active: { companyId: string; initialCapital: number; companyName: string | null },
  exerciceParam?: string
): Promise<{ buffer: Buffer; year: number }> {
  const supabase = createClient();
  const exN = resolveExercice(exerciceParam);
  const exN1 = resolveExercice(String(exN.year - 1));

  const { data: rawTxns } = await supabase
    .from("transactions")
    .select("type, amount, transaction_date, payment_method, categories(name)")
    .eq("company_id", active.companyId);

  const txns: Txn[] = (rawTxns ?? []).map((t) => ({
    type: t.type,
    amount: t.amount,
    transaction_date: t.transaction_date,
    payment_method: t.payment_method,
    category_name:
      (t.categories as unknown as { name: string } | null)?.name ?? null,
  }));

  const N = await computeYear(supabase, active.companyId, active.initialCapital, txns, exN);
  const N1 = await computeYear(supabase, active.companyId, active.initialCapital, txns, exN1);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(TEMPLATE_PATH);

  const set = (sheet: string, cell: string, value: number) => {
    const ws = wb.getWorksheet(sheet);
    if (ws) ws.getCell(cell).value = Math.round(value);
  };

  // --- BILAN (Actif: C=N, D=N-1 ; Passif: H=N, I=N-1) ---
  set("BILAN", "C13", N.immobilisations); set("BILAN", "D13", N1.immobilisations);
  set("BILAN", "C14", N.stocks); set("BILAN", "D14", N1.stocks);
  set("BILAN", "C15", N.creances); set("BILAN", "D15", N1.creances);
  set("BILAN", "C16", N.caisse); set("BILAN", "D16", N1.caisse);
  set("BILAN", "C17", N.banque); set("BILAN", "D17", N1.banque);
  set("BILAN", "C18", N.totalActif); set("BILAN", "D18", N1.totalActif);
  set("BILAN", "H13", N.compteExploitant); set("BILAN", "I13", N1.compteExploitant);
  set("BILAN", "H14", N.resultat); set("BILAN", "I14", N1.resultat);
  set("BILAN", "H16", N.dettes); set("BILAN", "I16", N1.dettes);
  set("BILAN", "H18", N.totalPassif); set("BILAN", "I18", N1.totalPassif);

  // --- COMPTE DE RESULTAT (H=N, I=N-1) ---
  const cr = "COMPTE DE RESULTAT";
  set(cr, "H10", N.ventes); set(cr, "I10", N1.ventes);
  set(cr, "H11", N.prestations); set(cr, "I11", N1.prestations);
  set(cr, "H12", N.autresRecettes); set(cr, "I12", N1.autresRecettes);
  set(cr, "H13", N.totalRecettes); set(cr, "I13", N1.totalRecettes);
  set(cr, "H14", N.achats); set(cr, "I14", N1.achats);
  set(cr, "H15", N.loyers); set(cr, "I15", N1.loyers);
  set(cr, "H16", N.salaires); set(cr, "I16", N1.salaires);
  set(cr, "H17", N.impots); set(cr, "I17", N1.impots);
  set(cr, "H18", N.chargesInteret); set(cr, "I18", N1.chargesInteret);
  set(cr, "H19", N.autresDepenses); set(cr, "I19", N1.autresDepenses);
  set(cr, "H20", N.totalDepenses); set(cr, "I20", N1.totalDepenses);
  set(cr, "H21", N.solde); set(cr, "I21", N1.solde);
  // Variations (N - N-1) selon les libellés de la liasse
  const varStocks = N.stocks - N1.stocks;
  const varCreances = N.creances - N1.creances;
  const varDettes = N.dettes - N1.dettes;
  set(cr, "H23", varStocks);
  set(cr, "H24", varCreances);
  set(cr, "H25", varDettes);
  set(cr, "H26", N.dotations); set(cr, "I26", N1.dotations);
  // RESULTAT H = C + D + E + F - G (formule imprimée sur la liasse)
  set(cr, "H27", N.solde + varStocks + varCreances + varDettes - N.dotations);

  // --- CA : Détail du chiffre d'affaires (G=N, E=N-1) ---
  set("CA", "G21", N.ventes); set("CA", "E21", N1.ventes);
  set("CA", "G22", N.prestations); set("CA", "E22", N1.prestations);
  set("CA", "G23", N.autresRecettes); set("CA", "E23", N1.autresRecettes);
  set("CA", "G24", N.ventes + N.autresRecettes);
  set("CA", "E24", N1.ventes + N1.autresRecettes);

  // --- Notes détaillées (1, 2, 3) ---
  await fillNotes(wb, supabase, active.companyId, exN);

  // --- Note 4 : journal de trésorerie Caisse / Banque (récap mensuel) ---
  fillNote4(wb, txns, exN);

  // --- Identification (best-effort) sur les onglets principaux ---
  const { data: profile } = await supabase
    .from("companies")
    .select(
      "legal_name, acronym, operator_name, tax_id, rccm, activity_code, activity_label, address, city, po_box, phone, contact_email, headcount"
    )
    .eq("id", active.companyId)
    .maybeSingle();

  const denomination = profile?.legal_name || active.companyName || "";
  const closLe = `31/12/${N.year}`;

  // Best-effort (par libellé) sur les états financiers et les notes.
  for (const sheetName of ["BILAN", cr, "CA", "NOTE1", "NOTE2", "NOTE3", "DETAIL DES CHARGES"]) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) continue;
    if (denomination) setAfterLabel(ws, "dénomination", denomination);
    if (profile?.acronym) setAfterLabel(ws, "sigle", profile.acronym);
    if (profile?.tax_id) setAfterLabel(ws, "immatriculation fiscale", profile.tax_id);
    if (profile?.address) setAfterLabel(ws, "adresse", profile.address);
    setAfterLabel(ws, "exercice clos le", closLe);
  }

  // Mappage EXACT des fiches d'identification (FICHE ID 2 recopie l'adresse,
  // l'immatriculation et la durée depuis FICHE ID 1 via ses formules).
  const adresseLine = [
    profile?.address,
    profile?.po_box ? `BP ${profile.po_box}` : null,
    profile?.city,
  ]
    .filter(Boolean)
    .join(", ");

  const id1 = wb.getWorksheet("FICHE IDENTIFICATION 1 ");
  if (id1) {
    const put = (cell: string, v?: string | number | null) => {
      if (v !== undefined && v !== null && v !== "") id1.getCell(cell).value = v;
    };
    // En-tête
    put("A3", denomination);
    put("M3", profile?.acronym);
    put("D4", adresseLine);
    put("F5", profile?.tax_id);
    put("K5", closLe);
    put("Q5", 12);
    // ZA : exercice comptable (du / au)
    put("J7", `01/01/${N.year}`);
    put("P7", `31/12/${N.year}`);
    // ZC : exercice précédent clos le
    put("J11", `31/12/${N.year - 1}`);
    // ZD : n° registre du commerce (RCCM)
    put("D13", profile?.rccm);
    // ZE : code activité principale
    put("O15", profile?.activity_code);
    // ZF : désignation de l'entité + sigle
    put("B17", denomination);
    put("P17", profile?.acronym);
    // ZG : téléphone / boîte postale / ville
    put("C20", profile?.phone);
    put("N20", profile?.po_box);
    put("P20", profile?.city);
    // ZH : adresse géographique complète
    put("B23", profile?.address);
    // ZI : désignation précise de l'activité
    put("B29", profile?.activity_label);
    // Personne à contacter / signataire
    put("B32", profile?.operator_name);
    put("B48", profile?.operator_name);
    put("B51", "L'exploitant");
    put("B54", closLe);
  }

  const id2 = wb.getWorksheet("FICHE IDENTIFICATION 2 ");
  if (id2) {
    const put = (cell: string, v?: string | number | null) => {
      if (v !== undefined && v !== null && v !== "") id2.getCell(cell).value = v;
    };
    put("A3", denomination);
    put("AB3", profile?.acronym);
    put("W5", closLe);
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(arrayBuffer), year: N.year };
}
