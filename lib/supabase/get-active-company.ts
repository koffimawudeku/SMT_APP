import { createClient } from "@/lib/supabase/server";

export async function getActiveCompany() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, role, companies(name)")
    .eq("user_id", user?.id)
    .limit(1)
    .single();

  return {
    userId: user?.id ?? null,
    companyId: membership?.company_id ?? null,
    role: membership?.role ?? null,
    companyName:
      (membership?.companies as unknown as { name: string } | null)?.name ?? null,
  };
}
