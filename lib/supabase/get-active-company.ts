import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** Nom du cookie qui mémorise le dossier actif entre deux requêtes. */
export const ACTIVE_COMPANY_COOKIE = "smt_active_company";

type CompanyJoin = {
  name: string;
  initial_capital: number;
  organization_id: string;
  logo_url: string | null;
};

type MembershipRow = {
  company_id: string;
  role: string;
  companies: CompanyJoin | null;
};

export async function getActiveCompany() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("company_members")
    .select(
      "company_id, role, companies(name, initial_capital, organization_id, logo_url)"
    )
    .eq("user_id", user?.id);

  const rows = ((memberships ?? []) as unknown as MembershipRow[])
    .filter((m) => m.companies)
    .sort((a, b) =>
      (a.companies?.name ?? "").localeCompare(b.companies?.name ?? "", "fr")
    );

  // Liste des dossiers accessibles, pour alimenter le sélecteur.
  const companies = rows.map((m) => ({
    id: m.company_id,
    name: m.companies?.name ?? "Sans nom",
    role: m.role,
  }));

  // Dossier actif : celui mémorisé en cookie s'il fait toujours partie des
  // adhésions de l'utilisateur, sinon le premier par ordre alphabétique.
  const cookieCompanyId = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  const active =
    rows.find((m) => m.company_id === cookieCompanyId) ?? rows[0] ?? null;

  return {
    userId: user?.id ?? null,
    companyId: active?.company_id ?? null,
    organizationId: active?.companies?.organization_id ?? null,
    role: active?.role ?? null,
    companyName: active?.companies?.name ?? null,
    initialCapital: active?.companies?.initial_capital ?? 0,
    logoUrl: active?.companies?.logo_url ?? null,
    companies,
  };
}
