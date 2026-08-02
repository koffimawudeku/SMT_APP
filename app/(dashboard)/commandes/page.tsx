import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { STATUS_LABELS, STATUS_COLORS, type OrderStatus } from "./status";
import OrderRowActions from "./order-row-actions";

export const dynamic = "force-dynamic";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

export default async function CommandesPage() {
  const { companyId } = await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, client_name, order_date, delivery_date, status")
    .eq("company_id", companyId)
    .order("order_date", { ascending: false });

  // Table absente tant que la migration n'a pas été jouée.
  if (error) {
    return (
      <div className="p-6">
        <h1 className="mb-4 text-xl font-medium">Commandes</h1>
        <div className="rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700">
          Le module Commandes n&apos;est pas encore activé sur votre base :
          exécutez la migration <code>orders</code> / <code>order_items</code>
          indiquée dans le README (SQL Editor Supabase).
        </div>
      </div>
    );
  }

  const orderIds = (orders ?? []).map((o) => o.id);
  const totalsByOrder = new Map<string, number>();

  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from("order_items")
      .select("order_id, quantity, unit_price")
      .in("order_id", orderIds);

    for (const it of items ?? []) {
      const line = (it.quantity ?? 0) * (it.unit_price ?? 0);
      totalsByOrder.set(
        it.order_id,
        (totalsByOrder.get(it.order_id) ?? 0) + line
      );
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-medium">Commandes</h1>
          <p className="text-sm text-gray-500">
            {(orders ?? []).length} commande(s) enregistrée(s).
          </p>
        </div>
        <Link
          href="/commandes/nouvelle"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Nouvelle commande
        </Link>
      </div>

      {(orders ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucune commande pour le moment. Cliquez sur{" "}
          <span className="font-medium">Nouvelle commande</span> pour en créer
          une.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Livraison</th>
                <th className="px-4 py-2">Statut</th>
                <th className="px-4 py-2 text-right">Montant</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/commandes/${o.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {o.client_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{o.order_date}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {o.delivery_date ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        STATUS_COLORS[o.status as OrderStatus] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABELS[o.status as OrderStatus] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    {fmt(totalsByOrder.get(o.id) ?? 0)} FCFA
                  </td>
                  <td className="px-4 py-2">
                    <OrderRowActions orderId={o.id} clientName={o.client_name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
