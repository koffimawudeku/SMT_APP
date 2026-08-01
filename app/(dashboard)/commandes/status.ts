export const ORDER_STATUSES = [
  "devis",
  "confirmee",
  "livree",
  "payee",
  "annulee",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  devis: "Devis",
  confirmee: "Confirmée",
  livree: "Livrée",
  payee: "Payée",
  annulee: "Annulée",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  devis: "bg-gray-100 text-gray-700",
  confirmee: "bg-blue-100 text-blue-700",
  livree: "bg-orange-100 text-orange-700",
  payee: "bg-green-100 text-green-700",
  annulee: "bg-red-100 text-red-700",
};
