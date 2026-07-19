"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName || undefined,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Si la confirmation par email est activée sur le projet Supabase,
    // aucune session n'est créée immédiatement : on informe l'utilisateur.
    if (!data.session) {
      setPendingConfirmation(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (pendingConfirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-700">
            Compte créé. Vérifiez votre boîte mail pour confirmer votre
            adresse avant de vous connecter.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm text-primary"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6"
      >
        <div>
          <h1 className="text-lg font-medium">Créer un compte</h1>
          <p className="text-sm text-gray-500">
            Votre entreprise sera créée automatiquement et restera privée à
            votre compte.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Nom complet
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Nom de l&apos;entreprise
          </label>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ex. Atelier Kadi Textile"
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="nom@entreprise.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Mot de passe
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>

        <p className="text-center text-sm text-gray-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-primary">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
