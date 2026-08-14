/** Champs texte du profil de l'entreprise, partagés par le formulaire et l'action. */
export const PROFILE_TEXT_FIELDS = [
  { name: "legal_name", label: "Dénomination sociale", placeholder: "Raison sociale officielle" },
  { name: "acronym", label: "Sigle usuel", placeholder: "Ex. BSH" },
  { name: "operator_name", label: "Nom et prénoms de l'exploitant" },
  { name: "tax_id", label: "N° d'immatriculation fiscale" },
  { name: "rccm", label: "N° RCCM / Registre du commerce" },
  { name: "activity_code", label: "Code activité principale" },
  { name: "activity_label", label: "Désignation de l'activité principale" },
  { name: "address", label: "Adresse géographique complète" },
  { name: "city", label: "Ville" },
  { name: "po_box", label: "Boîte postale" },
  { name: "phone", label: "N° de téléphone" },
  { name: "contact_email", label: "Email" },
] as const;

export type ProfileFieldName =
  | (typeof PROFILE_TEXT_FIELDS)[number]["name"]
  | "headcount";

export type CompanyProfile = {
  legal_name: string | null;
  acronym: string | null;
  operator_name: string | null;
  tax_id: string | null;
  rccm: string | null;
  activity_code: string | null;
  activity_label: string | null;
  address: string | null;
  city: string | null;
  po_box: string | null;
  phone: string | null;
  contact_email: string | null;
  headcount: number | null;
};
