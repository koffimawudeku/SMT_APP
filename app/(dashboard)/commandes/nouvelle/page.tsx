import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OrderForm from "../order-form";

export default function NouvelleCommandePage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link
        href="/commandes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux commandes
      </Link>
      <h1 className="mb-6 text-xl font-medium">Nouvelle commande</h1>
      <OrderForm />
    </div>
  );
}
