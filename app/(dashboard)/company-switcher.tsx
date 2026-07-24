"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { setActiveCompany, createDossier } from "./company-actions";

type Company = { id: string; name: string; role: string };

export default function CompanySwitcher({
  companies,
  activeCompanyId,
  activeCompanyName,
  logoUrl,
  userEmail,
}: {
  companies: Company[];
  activeCompanyId: string | null;
  activeCompanyName: string | null;
  logoUrl: string | null;
  userEmail: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function switchTo(companyId: string) {
    if (companyId === activeCompanyId) {
      setOpen(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await setActiveCompany(companyId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function onCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createDossier(formData);
      if (res?.error) {
        setError(res.error);
        return;
      }
      formRef.current?.reset();
      setCreating(false);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md p-1 text-left hover:bg-gray-50"
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={activeCompanyName ?? "Logo"}
            className="h-8 w-8 shrink-0 rounded object-contain"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-medium text-primary">
            {(activeCompanyName ?? "?").slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {activeCompanyName ?? "Aucune entreprise"}
          </p>
          <p className="truncate text-xs text-gray-500">{userEmail}</p>
        </div>
        {isPending ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />
        ) : (
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-400">
            Dossiers
          </p>
          <ul className="max-h-60 overflow-y-auto">
            {companies.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => switchTo(c.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="truncate">{c.name}</span>
                  {c.id === activeCompanyId && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-gray-100 pt-1">
            {creating ? (
              <form ref={formRef} action={onCreate} className="px-3 py-2">
                <input
                  name="name"
                  autoFocus
                  placeholder="Nom du nouveau dossier"
                  className="mb-2 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
                  >
                    {isPending ? "Création…" : "Créer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setError(null);
                    }}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
                Nouveau dossier
              </button>
            )}
          </div>

          {error && (
            <p className="px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
