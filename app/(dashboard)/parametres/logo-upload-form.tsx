"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLogo } from "./actions";

export default function LogoUploadForm({
  companyId,
  currentLogoUrl,
  disabled,
}: {
  companyId: string;
  currentLogoUrl: string | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await updateLogo(companyId, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <label className="mb-1 block text-sm text-gray-600">
        Logo de l&apos;entreprise
      </label>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-gray-400">Aucun</span>
          )}
        </div>

        <input
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileChange}
          disabled={disabled}
          className="text-sm text-gray-600 disabled:opacity-50"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={disabled || loading}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-50"
      >
        {loading ? "Téléversement..." : "Enregistrer le logo"}
      </button>
      <p className="text-xs text-gray-400">PNG, JPEG, WEBP ou SVG — 2 Mo max.</p>
    </form>
  );
}
