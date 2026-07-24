import { createClient } from "@/lib/supabase/server";

export async function getActiveCompany() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, role, companies(name, initial_capital, organization_id, logo_url)")
    .eq("user_id", user?.id)
    .limit(1)
    .single();

  return {
    userId: user?.id ?? null,
    companyId: membership?.company_id ?? null,
    organizationId:
      (membership?.companies as unknown as { organization_id: string } | null)
        ?.organization_id ?? null,
    role: membership?.role ?? null,
    companyName:
      (membership?.companies as unknown as { name: string } | null)?.name ?? null,
    initialCapital:
      (membership?.companies as unknown as { initial_capital: number } | null)
        ?.initial_capital ?? 0,
    logoUrl:
      (membership?.companies as unknown as { logo_url: string | null } | null)
        ?.logo_url ?? null,
  };
}
