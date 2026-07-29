"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "lucide-react";
import {
  adminCreateInscription,
  adminAddCollaborator,
} from "./user-invite-actions";

type Company = { id: string; name: string };
type Mode = "inscription" | "collaborateur";

export default function AddUserForm({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("inscription");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res =
        mode === "inscription"
          ? await adminCreateInscription(formData)
          : await adminAddCollaborator(formData);

      if (res?.error) {
        setMessage({ type: "err", text: res.error });
        return;
      }

      setMessage({
        type: "ok",
        text:
          mode === "inscription"
            ? "Utilisateur créé. Un email d'invitation lui a été envoyé pour définir son mot de passe."
            : "immediate" in res && res.immediate
              ? "Collaborateur rattaché au dossier."
              : "Collaborateur créé et rattaché. Un email d'invitation lui a été envoyé.",
      });
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white"
      >
        <UserPlus className="h-4 w-4" />
        Ajouter un utilisateur
      </button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Ajouter un utilisateur</h2>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setMessage(null);
          }}
          className="rounded p-1 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 inline-flex rounded-md border border-gray-200 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setMode("inscription")}
          className={`rounded px-3 py-1 ${
            mode === "inscription"
              ? "bg-primary/10 font-medium text-primary"
              : "text-gray-600"
          }`}
        >
          Nouvel utilisateur
        </button>
        <button
          type="button"
          onClick={() => setMode("collaborateur")}
          className={`rounded px-3 py-1 ${
            mode === "collaborateur"
              ? "bg-primary/10 font-medium text-primary"
              : "text-gray-600"
          }`}
        >
          Collaborateur
        </button>
      </div>

      <form action={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="email@exemple.com"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Nom complet <span className="text-gray-400">(optionnel)</span>
            </label>
            <input
              name="fullName"
              type="text"
              placeholder="Prénom Nom"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {mode === "inscription" ? (
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Nom de l&apos;entreprise
            </label>
            <input
              name="companyName"
              type="text"
              required
              placeholder="Ex. Atelier Kadi Textile"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">
              Un dossier et une organisation dédiés seront créés pour ce compte.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Dossier de rattachement
              </label>
              <select
                name="companyId"
                required
                defaultValue=""
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="" disabled>
                  Choisir un dossier…
                </option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Rôle</label>
              <select
                name="role"
                defaultValue="comptable"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="comptable">Comptable</option>
                <option value="consultant">Consultant</option>
                <option value="viewer">Lecture seule</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            {isPending ? "Envoi…" : "Ajouter"}
          </button>
          {message && (
            <p
              className={`text-xs ${
                message.type === "ok" ? "text-green-600" : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
