"use client";

import { useState } from "react";
import { createTransaction } from "./actions";

type Category = { id: string; name: string; type: string };

export default function SaisieForm({
  companyId,
  categories,
}: {
  companyId: string;
  categories: Category[];
}) {
  const [type, setType] = useState<"recette" | "depense">("recette");
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    formData.set("type", type);

    const result = await createTransaction(companyId, formData);

    if (result?.error) {
      setMessage({ kind: "error", text: result.error });
    } else {
      setMessage({ kind: "success", text: "Flux enregistré avec succès." });
      (document.getElementById("saisie-form") as HTMLFormElement)?.reset();
    }
    setLoading(false);
  }

  return (
    <form id="saisie-form" action={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("recette")}
          className={`flex-1 rounded-md border px-3 py-2 text-sm ${
            type === "recette"
              ? "border-green-600 bg-green-50 text-green-700"
              : "border-gray-300 text-gray-600"
          }`}
        >
          Recette
        </button>
        <button
          type="button"
          onClick={() => setType("depense")}
          className={`flex-1 rounded-md border px-3 py-2 text-sm ${
            type === "depense"
              ? "border-red-600 bg-red-50 text-red-700"
              : "border-gray-300 text-gray-600"
          }`}
        >
          Dépense
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">Montant</label>
        <input
          name="amount"
          type="number"
          required
          min={0}
          step="0.01"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="0"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">
          Description
        </label>
        <input
          name="description"
          type="text"
          className="w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="ex. Carburant pour livraison"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">Catégorie</label>
        <select
          name="category_id"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">Sélectionner...</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {filteredCategories.length === 0 && (
          <p className="mt-1 text-xs text-gray-500">
            Aucune catégorie de type {type} n&apos;existe encore. Ajoutez-en
            depuis Supabase (table categories) ou via une future page de
            gestion des catégories.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">
          Compte
        </label>
        <select
          name="payment_method"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="caisse">Caisse</option>
          <option value="banque">Banque</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">Date</label>
        <input
          name="transaction_date"
          type="date"
          required
          defaultValue={new Date().toISOString().split("T")[0]}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        />
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
        disabled={loading}
        className="w-full rounded-md bg-primary py-2 font-medium text-white disabled:opacity-50"
      >
        {loading ? "Enregistrement..." : "Enregistrer le flux"}
      </button>
    </form>
  );
}
