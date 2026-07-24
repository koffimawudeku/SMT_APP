"use client";

import { Download } from "lucide-react";

export type ExportRow = {
  transaction_date: string;
  description: string | null;
  type: "recette" | "depense";
  payment_method: string;
  amount: number;
  category_name: string | null;
  soldeCaisse: number;
  soldeBanque: number;
};

/**
 * Exporte le journal affiché au format CSV compatible Excel :
 * séparateur point-virgule (locale FR) et BOM UTF-8 pour que les accents
 * s'affichent correctement à l'ouverture dans Excel.
 */
export default function JournalExport({
  rows,
  ventilations,
  openingCaisse,
  openingBanque,
  exercice,
}: {
  rows: ExportRow[];
  ventilations: string[];
  openingCaisse: number;
  openingBanque: number;
  exercice: number;
}) {
  function download() {
    const sep = ";";
    const header = [
      "Date",
      "Libellé",
      "Caisse Entrée",
      "Caisse Sortie",
      "Solde Caisse",
      "Banque Entrée",
      "Banque Sortie",
      "Solde Banque",
      ...ventilations,
    ];

    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines: string[] = [header.map(esc).join(sep)];

    // Ligne de report à nouveau (soldes d'ouverture).
    lines.push(
      [
        "",
        "Report à nouveau",
        "",
        "",
        openingCaisse,
        "",
        "",
        openingBanque,
        ...ventilations.map(() => ""),
      ]
        .map(esc)
        .join(sep)
    );

    for (const r of rows) {
      const isCaisse = r.payment_method === "caisse";
      const isEntree = r.type === "recette";
      lines.push(
        [
          r.transaction_date,
          r.description ?? "",
          isCaisse && isEntree ? r.amount : "",
          isCaisse && !isEntree ? r.amount : "",
          r.soldeCaisse,
          !isCaisse && isEntree ? r.amount : "",
          !isCaisse && !isEntree ? r.amount : "",
          r.soldeBanque,
          ...ventilations.map((v) => (r.category_name === v ? r.amount : "")),
        ]
          .map(esc)
          .join(sep)
      );
    }

    const csv = "﻿" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-smt-${exercice}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 print:hidden"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
