"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { ORDER_STATUSES, type OrderStatus } from "./status";

const itemSchema = z.object({
  description: z.string().trim().min(1, "Description requise.").max(255),
  quantity: z.coerce.number().positive("Quantité invalide."),
  unitPrice: z.coerce.number().min(0, "Prix invalide."),
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
  notes?: string | null;
  items: {
    description: string;
    quantity: number | string;
    unitPrice: number | string;
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
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unitPrice,
    }))
  );

  if (itemsError) {
    return { error: "Erreur lors de la mise à jour des lignes." };
  }

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
