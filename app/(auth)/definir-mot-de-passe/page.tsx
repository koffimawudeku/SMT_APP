"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function DefinirMotDePasseInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "invite";

  const [phase, setPhase] = useState<"verifying" | "ready" | "invalid" | "done">(
    "verifying"
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Étape 1 : valider le lien reçu par email pour ouvrir une session.
  useEffect(() => {
    let active = true;
    async function verify() {
      // Peut-être déjà connecté (lien déjà consommé dans cet onglet).
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        if (active) setPhase("ready");
        return;
      }
      if (!tokenHash) {
        if (active) setPhase("invalid");
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash,
      });
      if (active) setPhase(error ? "invalid" : "ready");
    }
    verify();
    return () => {
      active = false;
    };
  }, [supabase, tokenHash, type]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setPhase("done");
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  if (phase === "verifying") {
    return <Card>Vérification du lien…</Card>;
  }

  if (phase === "invalid") {
    return (
      <Card>
        <p className="text-sm text-gray-700">
          Ce lien est invalide ou a expiré. Demandez un nouveau lien depuis la
          page de connexion.
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm text-primary">
          Retour à la connexion
        </Link>
      </Card>
    );
  }

  if (phase === "done") {
    return <Card>Mot de passe enregistré. Redirection…</Card>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6"
      >
        <div>
          <h1 className="text-lg font-medium">Définir votre mot de passe</h1>
          <p className="text-sm text-gray-500">
            Choisissez un mot de passe pour accéder à SMT.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Nouveau mot de passe
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

        <div>
          <label className="mb-1 block text-sm text-gray-600">
            Confirmer le mot de passe
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Enregistrement…" : "Enregistrer et continuer"}
        </button>
      </form>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center">
        {children}
      </div>
    </div>
  );
}

export default function DefinirMotDePassePage() {
  return (
    <Suspense fallback={<Card>Chargement…</Card>}>
      <DefinirMotDePasseInner />
    </Suspense>
  );
}
