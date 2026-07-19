"use client";

import { useState } from "react";
import { markAsSolde } from "./actions";

type Item = {
  id: string;
  type: string;
  third_party_name: string;
  label: string | null;
  amount: number;
  amount_paid: number;
  due_date: string | null;
  status: string;
};

export default function DebtRow({ item }: { item: Item }) {
  const [status, setStatus] = useState(item.status);
  const [loading, setLoading] = useState(false);

  const isLate =
    status === "en_cours" &&
    item.due_date &&
    new Date(item.due_date) < new Date();

  async function handleSolde() {
    setLoading(true);
    const result = await markAsSolde(item.id);
    if (!result?.error) setStatus("solde");
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
      <div>
        <p className="text-sm font-medium">
          {item.third_party_name}{" "}
          <span
            className={
              item.type === "creance" ? "text-green-600" : "text-red-600"
            }
          >
            ({item.type === "creance" ? "créance" : "dette"})
          </span>
        </p>
        <p className="text-xs text-gray-500">
          {item.label && <span>{item.label} — </span>}
          {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(item.amount)} FCFA
          {item.due_date ? ` — échéance ${item.due_date}` : ""}
          {isLate && <span className="ml-1 text-orange-600">en retard</span>}
        </p>
      </div>

      {status === "solde" ? (
        <span className="text-xs text-gray-400">Soldée</span>
      ) : (
        <button
          onClick={handleSolde}
          disabled={loading}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Marquer soldée
        </button>
      )}
    </div>
  );
}
