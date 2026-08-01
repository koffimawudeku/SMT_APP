import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import OrderForm, { type OrderInitial, type StockOption } from "../order-form";

export const dynamic = "force-dynamic";

export default async function CommandeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { companyId } = await getActiveCompany();
  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, company_id, client_name, order_date, delivery_date, status, payment_method, notes"
    )
    .eq("id", params.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const [{ data: items }, { data: stock }] = await Promise.all([
    supabase
      .from("order_items")
      .select("description, quantity, unit_price, stock_item_id")
      .eq("order_id", order.id),
    supabase
      .from("stock_items")
      .select("id, name, unit_cost")
      .eq("company_id", companyId)
      .order("name"),
  ]);

  const stockItems: StockOption[] = (stock ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    unitCost: s.unit_cost,
  }));

  const initial: OrderInitial = {
    id: order.id,
    clientName: order.client_name,
    orderDate: order.order_date,
    deliveryDate: order.delivery_date,
    status: order.status,
    paymentMethod: order.payment_method ?? "caisse",
    notes: order.notes,
    items: (items ?? []).map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      stockItemId: i.stock_item_id,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/commandes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux commandes
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-medium">Commande — {order.client_name}</h1>
        <Link
          href={`/commandes/${order.id}/facture`}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <FileText className="h-4 w-4" />
          Facture / Bon
        </Link>
      </div>
      <OrderForm initial={initial} stockItems={stockItems} />
    </div>
  );
}
