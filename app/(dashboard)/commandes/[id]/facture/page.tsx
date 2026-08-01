import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import PrintButton from "../../../print-button";
import { STATUS_LABELS, type OrderStatus } from "../../status";

export const dynamic = "force-dynamic";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);

export default async function FacturePage({
  params,
}: {
  params: { id: string };
}) {
  const { companyId, companyName, logoUrl } = await getActiveCompany();
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
    .select("id, client_name, order_date, delivery_date, status")
    .eq("id", params.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("description, quantity, unit_price")
    .eq("order_id", order.id);

  const lines = items ?? [];
  const total = lines.reduce(
    (sum, i) => sum + (i.quantity ?? 0) * (i.unit_price ?? 0),
    0
  );

  const isFacture = order.status === "payee";
  const docTitle = isFacture ? "FACTURE" : "BON DE COMMANDE";
  const reference = order.id.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/commandes/${order.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la commande
        </Link>
        <PrintButton label="Imprimer / PDF" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 print:border-0 print:p-0">
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={companyName ?? "Logo"}
                className="h-12 w-12 rounded object-contain"
              />
            )}
            <div>
              <p className="text-lg font-semibold">
                {companyName ?? "Entreprise"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold tracking-wide text-[#1A56A0]">
              {docTitle}
            </p>
            <p className="text-sm text-gray-500">N° {reference}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">
              Client
            </p>
            <p className="font-medium">{order.client_name}</p>
          </div>
          <div className="text-right">
            <p>
              <span className="text-gray-500">Date : </span>
              {order.order_date}
            </p>
            {order.delivery_date && (
              <p>
                <span className="text-gray-500">Livraison : </span>
                {order.delivery_date}
              </p>
            )}
            <p>
              <span className="text-gray-500">Statut : </span>
              {STATUS_LABELS[order.status as OrderStatus] ?? order.status}
            </p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300 text-left text-xs text-gray-500">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qté</th>
              <th className="py-2 text-right">P.U.</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2">{l.description}</td>
                <td className="py-2 text-right">{fmt(l.quantity ?? 0)}</td>
                <td className="py-2 text-right">{fmt(l.unit_price ?? 0)}</td>
                <td className="py-2 text-right">
                  {fmt((l.quantity ?? 0) * (l.unit_price ?? 0))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="py-2" colSpan={3}>
                TOTAL
              </td>
              <td className="py-2 text-right">{fmt(total)} FCFA</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-8 text-xs text-gray-400">
          {isFacture
            ? "Facture acquittée — merci de votre confiance."
            : "Document non contractuel — en attente de règlement."}
        </p>
      </div>
    </div>
  );
}
