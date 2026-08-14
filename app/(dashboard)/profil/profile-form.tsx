"use client";

import { useState } from "react";
import { updateCompanyProfile } from "./actions";
import { PROFILE_TEXT_FIELDS, type CompanyProfile } from "./fields";

export default function ProfileForm({
  companyId,
  profile,
  disabled,
}: {
  companyId: string;
  profile: CompanyProfile;
  disabled: boolean;
}) {
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const res = await updateCompanyProfile(companyId, formData);
    if (res?.error) setMessage({ kind: "error", text: res.error });
    else setMessage({ kind: "success", text: "Profil enregistré." });
    setLoading(false);
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-gray-100";

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PROFILE_TEXT_FIELDS.map((f) => (
          <div key={f.name} className={f.name === "address" ? "sm:col-span-2" : ""}>
            <label className="mb-1 block text-sm text-gray-600">{f.label}</label>
            {f.name === "address" ? (
              <textarea
                name={f.name}
                rows={2}
                defaultValue={profile[f.name] ?? ""}
                disabled={disabled}
                className={inputClass}
              />
            ) : (
              <input
                name={f.name}
                type={f.name === "contact_email" ? "email" : "text"}
                defaultValue={profile[f.name] ?? ""}
                disabled={disabled}
                placeholder={"placeholder" in f ? f.placeholder : undefined}
                className={inputClass}
              />
            )}
          </div>
        ))}

        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Effectif salarié
          </label>
          <input
            name="headcount"
            type="number"
            min={0}
            step="1"
            defaultValue={profile.headcount ?? ""}
            disabled={disabled}
            className={inputClass}
          />
        </div>
      </div>

      {message && (
        <p
          className={`text-sm ${
            message.kind === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || disabled}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Enregistrement…" : "Enregistrer le profil"}
      </button>
    </form>
  );
}
