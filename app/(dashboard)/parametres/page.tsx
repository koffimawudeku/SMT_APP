import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { getCompanyMembers } from "@/lib/members";
import SettingsForm from "./settings-form";
import LogoUploadForm from "./logo-upload-form";
import MembersManager from "./members-manager";

export default async function ParametresPage() {
  const { companyId, companyName, initialCapital, logoUrl, role } =
    await getActiveCompany();

  if (!companyId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Aucune entreprise rattachée à votre compte.
      </div>
    );
  }

  const { members, invitations, canManage } = await getCompanyMembers(companyId);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-xl font-medium">Paramètres de l&apos;entreprise</h1>

      {role !== "owner" && (
        <p className="mb-4 text-sm text-orange-600">
          Seul le propriétaire du dossier peut modifier ces informations.
        </p>
      )}

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <LogoUploadForm
          companyId={companyId}
          currentLogoUrl={logoUrl}
          disabled={role !== "owner"}
        />
      </div>

      <SettingsForm
        companyId={companyId}
        currentName={companyName ?? ""}
        currentInitialCapital={initialCapital}
        disabled={role !== "owner"}
      />

      <div className="mt-6">
        <MembersManager
          companyId={companyId}
          members={members}
          invitations={invitations}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
