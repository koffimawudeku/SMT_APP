"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompanyForCurrentUser } from "./actions";

export default function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await createCompanyForCurrentUser(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        action={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6"
      >
        <div>
          <h1 className="text-lg font-medium">Créez votre entreprise</h1>
          <p className="mt-1 text-sm text-gray-500">
            Une dernière étape avant de commencer à saisir vos flux.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Nom de l&apos;entreprise
          </label>
          <input
            name="company_name"
            type="text"
            required
            autoFocus
            placeholder="Ex. Atelier Kadi Textile"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer mon entreprise"}
        </button>
      </form>
    </div>
  );
}
