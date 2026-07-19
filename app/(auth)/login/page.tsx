"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Temporaire : affiche le message exact de Supabase pour diagnostiquer.
      // À remettre en message générique une fois le problème résolu.
      console.error("Erreur de connexion Supabase :", error);
      setError(`[DEBUG] ${error.message} (code: ${error.status ?? "?"})`);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6"
      >
        <h1 className="text-lg font-medium">Connexion à SMT</h1>

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
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p className="text-center text-sm text-gray-500">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-primary">
            Créer un compte
          </Link>
        </p>
      </form>
    </div>
  );
}
