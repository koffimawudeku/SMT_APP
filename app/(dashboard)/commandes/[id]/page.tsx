import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import OrderForm, { type OrderInitial } from "../order-form";

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
    .select("id, company_id, client_name, order_date, delivery_date, status, notes")
    .eq("id", params.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("description, quantity, unit_price")
    .eq("order_id", order.id);

  const initial: OrderInitial = {
    id: order.id,
    clientName: order.client_name,
    orderDate: order.order_date,
    deliveryDate: order.delivery_date,
    status: order.status,
    notes: order.notes,
    items: (items ?? []).map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unit_price,
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
      <h1 className="mb-6 text-xl font-medium">
        Commande — {order.client_name}
      </h1>
      <OrderForm initial={initial} />
    </div>
  );
}
