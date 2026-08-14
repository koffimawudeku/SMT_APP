import { createClient } from "@/lib/supabase/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import ProfileForm from "./profile-form";
import type { CompanyProfile } from "./fields";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const { companyId, companyName, role } = await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const supabase = createClient();
  const { data: company } = await supabase
    .from("companies")
    .select(
      "legal_name, acronym, operator_name, tax_id, rccm, activity_code, activity_label, address, city, po_box, phone, contact_email, headcount"
    )
    .eq("id", companyId)
    .maybeSingle();

  const profile = (company ?? {}) as CompanyProfile;
  const isOwner = role === "owner";

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-medium">Profil de l&apos;entreprise</h1>
      <p className="mb-6 text-sm text-gray-500">
        Identification détaillée de {companyName ?? "l'entreprise"} — utilisée
        pour renseigner automatiquement la liasse fiscale.
      </p>

      {!isOwner && (
        <p className="mb-4 rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-700">
          Seul le propriétaire du dossier peut modifier ces informations.
        </p>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
        <ProfileForm
          companyId={companyId}
          profile={profile}
          disabled={!isOwner}
        />
      </div>
    </div>
  );
}
