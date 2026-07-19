"use client";

import { useState } from "react";
import { createAsset } from "./actions";

export default function AssetForm({ companyId }: { companyId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExit, setShowExit] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await createAsset(companyId, formData);

    if (result?.error) {
      setError(result.error);
    } else {
      (document.getElementById("asset-form") as HTMLFormElement)?.reset();
      setShowExit(false);
    }
    setLoading(false);
  }

  return (
    <form id="asset-form" action={handleSubmit} className="space-y-3">
      <input
        name="name"
        type="text"
        required
        placeholder="Désignation (ex. Machine à coudre industrielle)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="flex gap-2">
        <input
          name="acquisition_date"
          type="date"
          required
          className="w-1/3 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="acquisition_value"
          type="number"
          required
          min={0}
          step="0.01"
          placeholder="Valeur d'acquisition"
          className="w-1/3 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="useful_life_years"
          type="number"
          required
          min={1}
          step="1"
          placeholder="Durée de vie (années)"
          className="w-1/3 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowExit((v) => !v)}
        className="text-xs text-primary"
      >
        {showExit ? "− Masquer la sortie d'actif" : "+ Enregistrer une sortie d'actif"}
      </button>

      {showExit && (
        <div className="flex gap-2 rounded-md border border-gray-200 p-2">
          <input
            name="exit_date"
            type="date"
            className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Date de sortie"
          />
          <input
            name="exit_price"
            type="number"
            min={0}
            step="0.01"
            placeholder="Prix de cession"
            className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Ajout..." : "Ajouter l'immobilisation"}
      </button>
    </form>
  );
}
