"use client";

import { useState } from "react";
import { createArticle, createMovement } from "../actions";

type Article = {
  id: string;
  name: string;
  reference: string | null;
  unit_cost: number | null;
};

export default function MovementForm({
  companyId,
  articles,
}: {
  companyId: string;
  articles: Article[];
}) {
  const [isNewArticle, setIsNewArticle] = useState(articles.length === 0);
  const [type, setType] = useState<"initial" | "entree" | "sortie">("initial");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    formData.set("type", type);

    let stockItemId = formData.get("stock_item_id") as string;

    if (isNewArticle) {
      const articleResult = await createArticle(companyId, formData);
      if (articleResult?.error || !articleResult?.id) {
        setError(articleResult?.error ?? "Erreur lors de la création de l'article.");
        setLoading(false);
        return;
      }
      stockItemId = articleResult.id;
      formData.set("stock_item_id", stockItemId);
    }

    const result = await createMovement(companyId, formData);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess("Mouvement enregistré avec succès.");
      (document.getElementById("movement-form") as HTMLFormElement)?.reset();
    }
    setLoading(false);
  }

  return (
    <form id="movement-form" action={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsNewArticle(false)}
          disabled={articles.length === 0}
          className={`flex-1 rounded-md border px-3 py-2 text-sm disabled:opacity-40 ${
            !isNewArticle
              ? "border-primary bg-primary/10 text-primary"
              : "border-gray-300 text-gray-600"
          }`}
        >
          Article existant
        </button>
        <button
          type="button"
          onClick={() => setIsNewArticle(true)}
          className={`flex-1 rounded-md border px-3 py-2 text-sm ${
            isNewArticle
              ? "border-primary bg-primary/10 text-primary"
              : "border-gray-300 text-gray-600"
          }`}
        >
          Nouvel article
        </button>
      </div>

      {isNewArticle ? (
        <div className="space-y-3 rounded-md border border-gray-200 p-3">
          <input
            name="name"
            type="text"
            required
            placeholder="Désignation de l'article"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              name="reference"
              type="text"
              placeholder="Référence"
              className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              name="unit_cost"
              type="number"
              min={0}
              step="1"
              placeholder="Prix unitaire"
              className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <input
            name="reorder_threshold"
            type="number"
            min={0}
            step="1"
            placeholder="Seuil d'alerte (optionnel)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      ) : (
        <select
          name="stock_item_id"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Sélectionner un article...</option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.reference ? ` (${a.reference})` : ""}
            </option>
          ))}
        </select>
      )}

      <div>
        <label className="mb-1 block text-sm text-gray-600">
          Type de mouvement
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("initial")}
            className={`flex-1 rounded-md border px-2 py-2 text-xs ${
              type === "initial"
                ? "border-gray-600 bg-gray-100 text-gray-800"
                : "border-gray-300 text-gray-600"
            }`}
          >
            Stock Initial
          </button>
          <button
            type="button"
            onClick={() => setType("entree")}
            className={`flex-1 rounded-md border px-2 py-2 text-xs ${
              type === "entree"
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-gray-300 text-gray-600"
            }`}
          >
            Entrée en Stock
          </button>
          <button
            type="button"
            onClick={() => setType("sortie")}
            className={`flex-1 rounded-md border px-2 py-2 text-xs ${
              type === "sortie"
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-gray-300 text-gray-600"
            }`}
          >
            Sortie de Stock
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          name="quantity"
          type="number"
          required
          min={0}
          step="1"
          placeholder="Quantité"
          className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          name="movement_date"
          type="date"
          required
          defaultValue={new Date().toISOString().split("T")[0]}
          className="w-1/2 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <input
        name="description"
        type="text"
        placeholder="Description (optionnel)"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Enregistrement..." : "Enregistrer le mouvement"}
      </button>
    </form>
  );
}
