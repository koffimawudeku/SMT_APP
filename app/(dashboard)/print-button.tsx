"use client";

import { Printer } from "lucide-react";

/**
 * Déclenche l'impression du navigateur (Ctrl+P). Combiné aux styles
 * `@media print` de globals.css, permet d'obtenir un PDF propre des états
 * financiers via « Enregistrer au format PDF ».
 */
export default function PrintButton({ label = "Imprimer / PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 print:hidden"
    >
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
