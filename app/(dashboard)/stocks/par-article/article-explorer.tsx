"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MovementEditRow from "./movement-edit-row";

type Article = {
  id: string;
  name: string;
  reference: string | null;
  unit_cost: number | null;
};

type Movement = {
  id: string;
  type: "initial" | "entree" | "sortie";
  quantity: number;
  unit_cost: number | null;
  movement_date: string;
  description: string | null;
};

export default function ArticleExplorer({
  articles,
}: {
  articles: Article[];
}) {
  const supabase = createClient();
  const [articleId, setArticleId] = useState(articles[0]?.id ?? "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadMovements() {
    if (!articleId) {
      setMovements([]);
      return;
    }
    setLoading(true);

    let query = supabase
      .from("stock_movements")
      .select("id, type, quantity, unit_cost, movement_date, description")
      .eq("stock_item_id", articleId)
      .order("movement_date", { ascending: true });

    if (dateFrom) query = query.gte("movement_date", dateFrom);
    if (dateTo) query = query.lte("movement_date", dateTo);

    const { data } = await query;
    setMovements(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, dateFrom, dateTo]);

  const quantiteFinPeriode = movements.reduce(
    (acc, m) => acc + (m.type === "sortie" ? -m.quantity : m.quantity),
    0
  );

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

  if (articles.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Aucun article enregistré pour le moment.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <select
          value={articleId}
          onChange={(e) => setArticleId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.reference ? ` (${a.reference})` : ""}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Depuis"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Jusqu'au"
        />
      </div>

      <div className="mb-4 rounded-md bg-gray-50 p-3 text-sm">
        <span className="text-gray-500">
          Quantité sur la période sélectionnée :{" "}
        </span>
        <span className="font-medium">{fmt(quantiteFinPeriode)}</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Chargement...</p>
      ) : movements.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun mouvement pour cette période.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Quantité</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <MovementEditRow
                  key={m.id}
                  movement={m}
                  articles={articles}
                  articleId={articleId}
                  onChanged={loadMovements}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
