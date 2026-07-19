"use client";

import { useState } from "react";
import { updateCompanyName } from "./actions";

export default function SettingsForm({
  companyId,
  currentName,
  currentInitialCapital,
  disabled,
}: {
  companyId: string;
  currentName: string;
  currentInitialCapital: number;
  disabled: boolean;
}) {
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    const result = await updateCompanyName(companyId, formData);

    if (result?.error) {
      setMessage({ kind: "error", text: result.error });
    } else {
      setMessage({ kind: "success", text: "Nom mis à jour." });
    }
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-gray-600">
          Nom de l&apos;entreprise
        </label>
        <input
          name="name"
          type="text"
          required
          defaultValue={currentName}
          disabled={disabled}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">
          Capital initial (compte exploitant)
        </label>
        <input
          name="initial_capital"
          type="number"
          min={0}
          step="1"
          defaultValue={currentInitialCapital}
          disabled={disabled}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
        />
        <p className="mt-1 text-xs text-gray-400">
          Utilisé comme Capitaux Propres de départ dans le Bilan.
        </p>
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.kind === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || disabled}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
