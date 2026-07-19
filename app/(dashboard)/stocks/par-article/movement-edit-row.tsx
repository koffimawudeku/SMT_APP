"use client";

import { useState } from "react";
import { updateMovement, deleteMovement } from "../actions";

type Article = { id: string; name: string; reference: string | null };

type Movement = {
  id: string;
  type: "initial" | "entree" | "sortie";
  quantity: number;
  unit_cost: number | null;
  movement_date: string;
  description: string | null;
};

const TYPE_LABELS: Record<Movement["type"], string> = {
  initial: "Stock Initial",
  entree: "Entrée",
  sortie: "Sortie",
};

export default function MovementEditRow({
  movement,
  articleId,
  onChanged,
}: {
  movement: Movement;
  articles: Article[];
  articleId: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("stock_item_id", articleId);

    const result = await updateMovement(movement.id, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setEditing(false);
    onChanged();
  }

  async function handleDelete() {
    if (!confirm("Supprimer ce mouvement ? Cette action est irréversible.")) {
      return;
    }
    setLoading(true);
    const result = await deleteMovement(movement.id);
    setLoading(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    onChanged();
  }

  if (editing) {
    return (
      <tr className="border-t border-gray-100 bg-gray-50">
        <td colSpan={5} className="p-3">
          <form action={handleUpdate} className="flex flex-wrap items-end gap-2">
            <select
              name="type"
              defaultValue={movement.type}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="initial">Stock Initial</option>
              <option value="entree">Entrée</option>
              <option value="sortie">Sortie</option>
            </select>
            <input
              name="quantity"
              type="number"
              min={0}
              step="0.01"
              defaultValue={movement.quantity}
              className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              name="movement_date"
              type="date"
              defaultValue={movement.movement_date}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              name="description"
              type="text"
              defaultValue={movement.description ?? ""}
              placeholder="Description"
              className="min-w-[140px] flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            {error && <p className="w-full text-xs text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "..." : "Enregistrer"}
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-gray-100">
      <td className="px-3 py-2">{movement.movement_date}</td>
      <td className="px-3 py-2">{TYPE_LABELS[movement.type]}</td>
      <td className="px-3 py-2 text-right">
        {movement.type === "sortie" ? "-" : ""}
        {new Intl.NumberFormat("fr-FR").format(movement.quantity)}
      </td>
      <td className="px-3 py-2 text-gray-500">
        {movement.description ?? "—"}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={() => setEditing(true)}
          className="mr-2 text-blue-600 hover:underline"
        >
          Modifier
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-red-600 hover:underline disabled:opacity-50"
        >
          Supprimer
        </button>
      </td>
    </tr>
  );
}
