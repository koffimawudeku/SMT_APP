"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAsset, deleteAsset } from "./actions";

type Row = {
  id: string;
  name: string;
  acquisition_date: string;
  acquisition_value: number;
  useful_life_years: number;
  exit_date: string | null;
  exit_price: number | null;
  tauxAnnuel: number;
  cumulAmortissement: number;
  vcn: number;
};

export default function AssetRow({ asset }: { asset: Row }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

  async function handleUpdate(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await updateAsset(asset.id, formData);
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
    if (!confirm("Supprimer cette immobilisation ?")) return;
    setLoading(true);
    const result = await deleteAsset(asset.id);
    setLoading(false);
    if (result?.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <tr className="border-t border-gray-100 bg-gray-50">
        <td colSpan={8} className="p-3">
          <form action={handleUpdate} className="flex flex-wrap items-end gap-2">
            <input
              name="name"
              defaultValue={asset.name}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              name="acquisition_date"
              type="date"
              defaultValue={asset.acquisition_date}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              name="acquisition_value"
              type="number"
              step="0.01"
              defaultValue={asset.acquisition_value}
              className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              name="useful_life_years"
              type="number"
              defaultValue={asset.useful_life_years}
              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              name="exit_date"
              type="date"
              defaultValue={asset.exit_date ?? ""}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
            <input
              name="exit_price"
              type="number"
              step="0.01"
              defaultValue={asset.exit_price ?? ""}
              placeholder="Prix cession"
              className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm"
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
      <td className="px-3 py-2 font-medium">{asset.name}</td>
      <td className="px-3 py-2">{asset.acquisition_date}</td>
      <td className="px-3 py-2 text-right">{fmt(asset.acquisition_value)}</td>
      <td className="px-3 py-2 text-right">{asset.useful_life_years} ans</td>
      <td className="px-3 py-2 text-right">
        {(asset.tauxAnnuel * 100).toFixed(1)}%
      </td>
      <td className="px-3 py-2 text-right">
        {fmt(asset.cumulAmortissement)}
      </td>
      <td className="px-3 py-2 text-right font-medium">{fmt(asset.vcn)}</td>
      <td className="px-3 py-2 text-right whitespace-nowrap">
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
