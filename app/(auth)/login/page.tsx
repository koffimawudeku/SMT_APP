"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { requestPasswordReset } from "./actions";

// Images de fond : à placer dans le dossier public/login/ du dépôt.
// Si une image manque, le dégradé de couleurs s'affiche à la place.
const SLIDES = ["/login/fond1.jpg", "/login/fond2.jpg", "/login/fond3.jpg"];

function Slides() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      6000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-emerald-600"
    >
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          style={{ backgroundImage: `url(${src})` }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/40" />
    </div>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
      <path d="M9.9 5.1A9.8 9.8 0 0112 5c5 0 9 4.5 10 7-0.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.4 8 2.9 10.1 2 12c1 2.5 5 7 10 7 1.6 0 3-.4 4.3-1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetIsError, setResetIsError] = useState(false);
  const [isResetting, startReset] = useTransition();

  function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetMessage(null);
    const fd = new FormData();
    fd.set("email", resetEmail);
    startReset(async () => {
      const res = await requestPasswordReset(fd);
      setResetIsError(!!res?.error);
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

  const champ =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Panneau gauche : images + message (ordinateur) */}
      <section className="relative hidden lg:block">
        <Slides />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <div className="text-2xl font-bold tracking-tight">SMT</div>
          <div>
            <h2 className="max-w-md text-4xl font-bold leading-tight">
              Tenez votre comptabilité. Préparez votre financement.
            </h2>
            <ul className="mt-6 space-y-3 text-base text-white/90">
              <li>✓ Suivi de trésorerie en temps réel</li>
              <li>✓ États financiers prêts à présenter aux banques</li>
              <li>✓ Liasse fiscale SMT simplifiée</li>
            </ul>
          </div>
          <p className="text-sm text-white/70">
            Système Minimal de Trésorerie, pour les entrepreneurs
          </p>
        </div>
      </section>

      {/* Panneau droit : formulaire (image en fond sur mobile) */}
      <section className="relative flex min-h-screen items-center justify-center p-4 sm:p-8 lg:bg-gray-50">
        <div className="absolute inset-0 lg:hidden">
          <Slides />
        </div>

        <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8 lg:shadow-none lg:bg-transparent lg:p-0">
          <div className="mb-6 lg:mb-8">
            <p className="text-2xl font-bold text-primary lg:hidden">SMT</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              Connexion
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Accédez à votre espace de gestion.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={champ}
                placeholder="nom@entreprise.com"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowReset((v) => !v);
                    setResetMessage(null);
                    setResetEmail(email);
                  }}
                  className="text-sm text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${champ} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-500 hover:text-gray-700"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <div aria-live="polite">
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          {showReset && (
            <form
              onSubmit={handleReset}
              className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4"
            >
              <p className="mb-3 text-sm text-gray-600">
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="nom@entreprise.com"
                  aria-label="Email pour la réinitialisation"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  type="submit"
                  disabled={isResetting}
                  className="rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isResetting ? "Envoi…" : "Envoyer"}
                </button>
              </div>
              {resetMessage && (
                <p className={`mt-3 text-sm ${resetIsError ? "text-red-700" : "text-green-700"}`}>
                  {resetMessage}
                </p>
              )}
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-600">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Créer un compte
            </Link>
          </p>

          <p className="mt-3 text-center text-xs text-gray-400">
            <Link href="/admin/login" className="hover:text-gray-600">
              Accès administrateur
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
