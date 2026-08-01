"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { ORDER_STATUSES, type OrderStatus } from "./status";

const PAYMENT_METHODS = ["caisse", "banque", "mobile_money"] as const;

const itemSchema = z.object({
  description: z.string().trim().min(1, "Description requise.").max(255),
  quantity: z.coerce.number().positive("Quantité invalide."),
  unitPrice: z.coerce.number().min(0, "Prix invalide."),
  stockItemId: z.string().uuid().optional().nullable().or(z.literal("")),
});

const orderSchema = z.object({
  clientName: z.string().trim().min(1, "Le nom du client est requis.").max(255),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  deliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .or(z.literal("")),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(itemSchema).min(1, "Ajoutez au moins une ligne."),
});

// Type manuel accepté depuis le client : les nombres arrivent en chaînes de
// caractères (champs de formulaire) et sont convertis par `z.coerce`.
export type OrderPayload = {
  clientName: string;
  orderDate: string;
  deliveryDate?: string | null;
  status: OrderStatus;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  notes?: string | null;
  items: {
    description: string;
    quantity: number | string;
    unitPrice: number | string;
    stockItemId?: string | null;
  }[];
};

export async function createOrder(payload: OrderPayload) {
  const parsed = orderSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { companyId, userId } = await getActiveCompany();
  if (!companyId) return { error: "Aucun dossier actif." };

  const supabase = createClient();
  const d = parsed.data;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      company_id: companyId,
      client_name: d.clientName,
      order_date: d.orderDate,
      delivery_date: d.deliveryDate || null,
      status: d.status,
      payment_method: d.paymentMethod,
      notes: d.notes || null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !order) {
    return {
      error:
        "Erreur lors de la création de la commande. La table orders existe-t-elle ? (voir migration README)",
    };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    d.items.map((i) => ({
      order_id: order.id,
      stock_item_id: i.stockItemId || null,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    }))
  );

  if (itemsError) {
    // On retire la commande orpheline pour ne pas laisser d'entête sans lignes.
    await supabase.from("orders").delete().eq("id", order.id);
    return { error: "Erreur lors de l'enregistrement des lignes." };
  }

  await applyOrderEffects(order.id as string);

  revalidatePath("/commandes");
  return { success: true, id: order.id as string };
}

export async function updateOrder(orderId: string, payload: OrderPayload) {
  const parsed = orderSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const d = parsed.data;

  const { error } = await supabase
    .from("orders")
    .update({
      client_name: d.clientName,
      order_date: d.orderDate,
      delivery_date: d.deliveryDate || null,
      status: d.status,
      payment_method: d.paymentMethod,
      notes: d.notes || null,
    })
    .eq("id", orderId);

  if (error) {
    return { error: "Erreur lors de la mise à jour de la commande." };
  }

  // On remplace intégralement les lignes (plus simple et cohérent qu'un diff).
  await supabase.from("order_items").delete().eq("order_id", orderId);
  const { error: itemsError } = await supabase.from("order_items").insert(
    d.items.map((i) => ({
      order_id: orderId,
      stock_item_id: i.stockItemId || null,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    }))
  );

  if (itemsError) {
    return { error: "Erreur lors de la mise à jour des lignes." };
  }

  await applyOrderEffects(orderId);

  revalidatePath("/commandes");
  revalidatePath(`/commandes/${orderId}`);
  return { success: true, id: orderId };
}

export async function deleteOrder(orderId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) {
    return { error: "Erreur lors de la suppression de la commande." };
  }
  revalidatePath("/commandes");
  return { success: true };
}

/**
 * Applique les effets automatiques d'une commande selon son statut, de
 * manière idempotente (chaque effet n'est posé qu'une fois, tracé par des
 * colonnes dédiées sur `orders`) :
 *  - Livrée/Payée → sortie de stock des lignes liées à un article
 *  - Livrée        → création d'une créance du montant total (si non payée)
 *  - Payée         → recette au Journal + créance liée soldée
 *
 * Utilise la clé service pour ne pas dépendre du rôle (transactions_insert
 * est restreint aux owner/comptable) : l'accès au dossier a déjà été validé
 * par l'écriture de la commande via la RLS.
 *
 * Silencieux si les colonnes d'intégration n'existent pas encore (migration
 * non jouée) : la commande de base reste fonctionnelle.
 */
async function applyOrderEffects(orderId: string) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: order, error } = await admin
    .from("orders")
    .select(
      "id, company_id, client_name, order_date, delivery_date, status, payment_method, stock_movement_done, receivable_id, transaction_id, created_by"
    )
    .eq("id", orderId)
    .single();

  if (error || !order) return; // colonnes d'intégration absentes → on n'agit pas

  const { data: items } = await admin
    .from("order_items")
    .select("stock_item_id, description, quantity, unit_price")
    .eq("order_id", orderId);

  const lines = items ?? [];
  const total = lines.reduce(
    (sum, i) => sum + (i.quantity ?? 0) * (i.unit_price ?? 0),
    0
  );
  const delivered = order.status === "livree" || order.status === "payee";

  // 0) Contre-passation : commande annulée après avoir été livrée/payée.
  //    On réinjecte le stock, on supprime la recette et la créance, puis on
  //    réinitialise les marqueurs — de sorte qu'une éventuelle ré-activation
  //    ultérieure reposte proprement les effets.
  if (order.status === "annulee") {
    if (order.stock_movement_done) {
      const stockLines = lines.filter((l) => l.stock_item_id);
      if (stockLines.length > 0) {
        await admin.from("stock_movements").insert(
          stockLines.map((l) => ({
            company_id: order.company_id,
            stock_item_id: l.stock_item_id,
            type: "entree",
            quantity: l.quantity,
            unit_cost: null,
            movement_date: new Date().toISOString().slice(0, 10),
            description: `Annulation commande ${order.client_name}`,
            created_by: order.created_by,
          }))
        );
      }
    }

    if (order.transaction_id) {
      await admin.from("transactions").delete().eq("id", order.transaction_id);
    }
    if (order.receivable_id) {
      await admin
        .from("debts_receivables")
        .delete()
        .eq("id", order.receivable_id);
    }

    await admin
      .from("orders")
      .update({
        stock_movement_done: false,
        transaction_id: null,
        receivable_id: null,
      })
      .eq("id", orderId);

    revalidatePath("/commandes");
    revalidatePath("/journal");
    revalidatePath("/dettes-creances");
    revalidatePath("/stocks");
    return;
  }

  // 1) Sortie de stock (à la livraison ou au paiement direct)
  if (delivered && !order.stock_movement_done) {
    const stockLines = lines.filter((l) => l.stock_item_id);
    if (stockLines.length > 0) {
      await admin.from("stock_movements").insert(
        stockLines.map((l) => ({
          company_id: order.company_id,
          stock_item_id: l.stock_item_id,
          type: "sortie",
          quantity: l.quantity,
          unit_cost: null,
          movement_date: order.delivery_date ?? order.order_date,
          description: `Commande ${order.client_name}`,
          created_by: order.created_by,
        }))
      );
    }
    await admin
      .from("orders")
      .update({ stock_movement_done: true })
      .eq("id", orderId);
  }

  // 2) Créance à la livraison (tant que la commande n'est pas payée)
  if (
    order.status === "livree" &&
    !order.receivable_id &&
    !order.transaction_id &&
    total > 0
  ) {
    const { data: receivable } = await admin
      .from("debts_receivables")
      .insert({
        company_id: order.company_id,
        type: "creance",
        third_party_name: order.client_name,
        label: `Commande ${order.client_name}`,
        amount: total,
        amount_paid: 0,
        due_date: order.delivery_date,
        status: "en_cours",
      })
      .select("id")
      .single();

    if (receivable) {
      await admin
        .from("orders")
        .update({ receivable_id: receivable.id })
        .eq("id", orderId);
    }
  }

  // 3) Recette à l'encaissement + solde de la créance liée
  if (order.status === "payee" && !order.transaction_id && total > 0) {
    const { data: category } = await admin
      .from("categories")
      .select("id")
      .eq("company_id", order.company_id)
      .eq("type", "recette")
      .eq("name", "Ventes")
      .maybeSingle();

    const { data: transaction } = await admin
      .from("transactions")
      .insert({
        company_id: order.company_id,
        category_id: category?.id ?? null,
        type: "recette",
        amount: total,
        payment_method: order.payment_method ?? "caisse",
        transaction_date: new Date().toISOString().slice(0, 10),
        description: `Commande ${order.client_name}`,
        created_by: order.created_by,
      })
      .select("id")
      .single();

    if (transaction) {
      await admin
        .from("orders")
        .update({ transaction_id: transaction.id })
        .eq("id", orderId);
    }

    if (order.receivable_id) {
      await admin
        .from("debts_receivables")
        .update({ amount_paid: total, status: "solde" })
        .eq("id", order.receivable_id);
    }
  }

  // 4) Resynchronisation à l'édition : si les écritures existaient déjà
  //    AVANT cet appel (montants stockés dans l'objet `order` chargé plus
  //    haut), on les réaligne sur le total courant. Les blocs 2 et 3
  //    ci-dessus ne se déclenchent qu'à la première pose ; ce bloc couvre
  //    les modifications ultérieures de quantités/prix.
  if (order.transaction_id) {
    await admin
      .from("transactions")
      .update({
        amount: total,
        payment_method: order.payment_method ?? "caisse",
      })
      .eq("id", order.transaction_id);
  }
  if (order.receivable_id) {
    const paid = order.status === "payee";
    await admin
      .from("debts_receivables")
      .update({
        amount: total,
        amount_paid: paid ? total : 0,
        status: paid ? "solde" : "en_cours",
      })
      .eq("id", order.receivable_id);
  }

  revalidatePath("/commandes");
  revalidatePath("/journal");
  revalidatePath("/dettes-creances");
}
