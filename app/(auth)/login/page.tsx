"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { requestPasswordReset } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isResetting, startReset] = useTransition();

  function handleReset(formData: FormData) {
    setResetMessage(null);
    startReset(async () => {
      const res = await requestPasswordReset(formData);
      setResetMessage(res?.message ?? res?.error ?? null);
    });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Erreur de connexion Supabase :", error);
      setError("Email ou mot de passe incorrect.");
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

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setShowReset((v) => !v);
              setResetMessage(null);
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Mot de passe oublié ?
          </button>
        </div>

        {showReset && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs text-gray-600">
              Entrez votre email pour recevoir un lien de réinitialisation.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                name="email"
                required
                placeholder="nom@entreprise.com"
                defaultValue={email}
                className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                id="reset-email"
              />
              <button
                type="button"
                disabled={isResetting}
                onClick={() => {
                  const input = document.getElementById(
                    "reset-email"
                  ) as HTMLInputElement | null;
                  const fd = new FormData();
                  fd.set("email", input?.value ?? "");
                  handleReset(fd);
                }}
                className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {isResetting ? "Envoi…" : "Envoyer"}
              </button>
            </div>
            {resetMessage && (
              <p className="mt-2 text-xs text-green-700">{resetMessage}</p>
            )}
          </div>
        )}

        <p className="text-center text-sm text-gray-500">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-primary">
            Créer un compte
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400">
          <Link href="/admin/login" className="hover:text-gray-600">
            Accès administrateur
          </Link>
        </p>
      </form>
    </div>
  );
}
