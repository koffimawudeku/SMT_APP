"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteOrder } from "./actions";

export default function OrderRowActions({
  orderId,
  clientName,
}: {
  orderId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    if (!confirm(`Supprimer définitivement la commande de ${clientName} ?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteOrder(orderId);
      if (res?.error) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/commandes/${orderId}`}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
      >
        <Pencil className="h-3.5 w-3.5" />
        Modifier
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {isPending ? "…" : "Supprimer"}
      </button>
    </div>
  );
}
