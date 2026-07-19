import { z } from "zod";

export const transactionSchema = z.object({
  type: z.enum(["recette", "depense"]),
  amount: z.coerce.number().positive("Le montant doit être positif"),
  category_id: z.string().uuid("Choisissez une catégorie"),
  payment_method: z.enum(["caisse", "banque"]),
  transaction_date: z.coerce.date(),
  description: z.string().max(500).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
