"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTransaction, deleteTransaction } from "./actions";

type Category = { id: string; name: string; type: string };

type TransactionData = {
  id: string;
  transaction_date: string;
  description: string | null;
  type: "recette" | "depense";
  payment_method: string;
  amount: number;
  category_id: string | null;
};

export default function TransactionActions({
  transaction,
  categories,
}: {
  transaction: TransactionData;
  categories: Category[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<"recette" | "depense">(transaction.type);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredCategories = categories.filter((c) => c.type === type);

  async function handleUpdate(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("type", type);

    const result = await updateTransaction(transaction.id, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Supprimer définitivement ce flux ? Cette action est irréversible.")) {
      return;
    }
    setLoading(true);
    const result = await deleteTransaction(transaction.id);
    if (result?.error) {
      alert(result.error);
    }
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={() => setEditing(true)}
          className="text-blue-600 hover:underline"
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
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5">
            <h2 className="mb-4 text-sm font-medium">Modifier le flux</h2>

            <form action={handleUpdate} className="space-y-3">
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

              <input
                name="amount"
                type="number"
                required
                min={0}
                step="1"
                defaultValue={transaction.amount}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Montant"
              />

              <input
                name="description"
                type="text"
                defaultValue={transaction.description ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Description"
              />

              <select
                name="category_id"
                required
                defaultValue={transaction.category_id ?? ""}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Sélectionner...</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                name="payment_method"
                required
                defaultValue={transaction.payment_method}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="caisse">Caisse</option>
                <option value="banque">Banque</option>
              </select>

              <input
                name="transaction_date"
                type="date"
                required
                defaultValue={transaction.transaction_date}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-md border border-gray-300 py-2 text-sm text-gray-600"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
