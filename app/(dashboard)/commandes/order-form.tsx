"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createOrder, updateOrder, deleteOrder } from "./actions";
import { ORDER_STATUSES, STATUS_LABELS } from "./status";

type Item = { description: string; quantity: string; unitPrice: string };

export type OrderInitial = {
  id: string;
  clientName: string;
  orderDate: string;
  deliveryDate: string | null;
  status: string;
  notes: string | null;
  items: { description: string; quantity: number; unitPrice: number }[];
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

const today = () => new Date().toISOString().slice(0, 10);

export default function OrderForm({ initial }: { initial?: OrderInitial }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [orderDate, setOrderDate] = useState(initial?.orderDate ?? today());
  const [deliveryDate, setDeliveryDate] = useState(initial?.deliveryDate ?? "");
  const [status, setStatus] = useState(initial?.status ?? "devis");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<Item[]>(
    initial?.items.map((i) => ({
      description: i.description,
      quantity: String(i.quantity),
      unitPrice: String(i.unitPrice),
    })) ?? [{ description: "", quantity: "1", unitPrice: "" }]
  );

  const total = items.reduce(
    (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0
  );

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index)
    );
  }

  function submit() {
    setError(null);
    const payload = {
      clientName,
      orderDate,
      deliveryDate: deliveryDate || null,
      status: status as (typeof ORDER_STATUSES)[number],
      notes: notes || null,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    };

    startTransition(async () => {
      const res = isEdit
        ? await updateOrder(initial!.id, payload)
        : await createOrder(payload);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.push("/commandes");
      router.refresh();
    });
  }

  function onDelete() {
    if (!initial) return;
    if (!confirm("Supprimer définitivement cette commande ?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteOrder(initial.id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.push("/commandes");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-gray-600">Client</label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nom du client"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Date de commande
          </label>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Livraison prévue <span className="text-gray-400">(optionnel)</span>
          </label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Articles</label>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 text-sm text-primary"
          >
            <Plus className="h-4 w-4" />
            Ajouter une ligne
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2 text-right">Quantité</th>
                <th className="px-3 py-2 text-right">Prix unitaire</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const lineTotal =
                  (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                return (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <input
                        value={it.description}
                        onChange={(e) =>
                          updateItem(i, { description: e.target.value })
                        }
                        placeholder="Article / prestation"
                        className="w-full rounded border border-gray-300 px-2 py-1 focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(i, { quantity: e.target.value })
                        }
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-right focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItem(i, { unitPrice: e.target.value })
                        }
                        className="w-28 rounded border border-gray-300 px-2 py-1 text-right focus:border-primary focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {fmt(lineTotal)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        disabled={items.length === 1}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-medium">
                <td className="px-3 py-2" colSpan={3}>
                  Total commande
                </td>
                <td className="px-3 py-2 text-right">{fmt(total)} FCFA</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-600">
          Notes <span className="text-gray-400">(optionnel)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending
            ? "Enregistrement…"
            : isEdit
              ? "Enregistrer les modifications"
              : "Créer la commande"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/commandes")}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
        >
          Annuler
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}
