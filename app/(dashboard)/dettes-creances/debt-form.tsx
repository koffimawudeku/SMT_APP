"use client";

import { useState } from "react";
import { createDebtOrReceivable } from "./actions";

export default function DebtForm({ companyId }: { companyId: string }) {
  const [type, setType] = useState<"dette" | "creance">("creance");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("type", type);

    const result = await createDebtOrReceivable(companyId, formData);

    if (result?.error) {
      setError(result.error);
    } else {
      (document.getElementById("debt-form") as HTMLFormElement)?.reset();
    }
    setLoading(false);
  }

  return (
    <form id="debt-form" action={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("creance")}
          className={`flex-1 rounded-md border px-3 py-2 text-sm ${
            type === "creance"
              ? "border-green-600 bg-green-50 text-green-700"
              : "border-gray-300 text-gray-600"
          }`}
        >
          Créance (on me doit)
        </button>
        <button
          type="button"
          onClick={() => setType("dette")}
          className={`flex-1 rounded-md border px-3 py-2 text-sm ${
            type === "dette"
              ? "border-red-600 bg-red-50 text-red-700"
              : "border-gray-300 text-gray-600"
          }`}
        >
          Dette (je dois)
        </button>
      </div>

      <input
        name="third_party_name"
        type="text"
        required
        placeholder="Nom du client ou du fournisseur"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      <input
        name="label"
        type="text"
        placeholder="Libellé (ex. Facture n°012, avance sur commande...)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="flex gap-2">
        <input
          name="amount"
          type="number"
          required
          min={0}
          step="0.01"
          placeholder="Montant"
          className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="due_date"
          type="date"
          className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Ajout..." : "Ajouter"}
      </button>
    </form>
  );
}
