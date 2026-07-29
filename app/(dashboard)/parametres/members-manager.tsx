"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Trash2, UserPlus, Clock, KeyRound, Copy } from "lucide-react";
import {
  inviteCollaborator,
  createCollaboratorWithPassword,
  removeMember,
  revokeInvitation,
} from "./members-actions";
import type { CompanyMember, PendingInvitation } from "@/lib/members";

type Method = "email" | "password";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  comptable: "Comptable",
  consultant: "Consultant",
  viewer: "Lecture seule",
};

export default function MembersManager({
  companyId,
  members,
  invitations,
  canManage,
}: {
  companyId: string;
  members: CompanyMember[];
  invitations: PendingInvitation[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [credential, setCredential] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onInvite(formData: FormData) {
    setMessage(null);
    setCredential(null);
    setCopied(false);
    startTransition(async () => {
      const res =
        method === "password"
          ? await createCollaboratorWithPassword(companyId, formData)
          : await inviteCollaborator(companyId, formData);

      if (res?.error) {
        setMessage({ type: "err", text: res.error });
        return;
      }
      formRef.current?.reset();

      if (method === "password") {
        if ("password" in res && res.password) {
          setCredential({ email: res.email as string, password: res.password });
          setMessage(null);
        } else {
          setMessage({
            type: "ok",
            text:
              ("message" in res && res.message) ||
              "Collaborateur rattaché au dossier.",
          });
        }
        router.refresh();
        return;
      }

      const emailError = "emailError" in res ? res.emailError : undefined;
      const immediate = "immediate" in res ? res.immediate : false;
      const base = immediate
        ? "Collaborateur ajouté au dossier."
        : "Invitation envoyée par email avec un lien pour définir le mot de passe.";
      setMessage({
        type: emailError ? "err" : "ok",
        text: emailError
          ? `${base} Mais l'email n'a pas pu être envoyé : ${emailError}`
          : base,
      });
      router.refresh();
    });
  }

  function onRemove(userId: string) {
    setMessage(null);
    startTransition(async () => {
      const res = await removeMember(companyId, userId);
      if (res?.error) setMessage({ type: "err", text: res.error });
      else router.refresh();
    });
  }

  function onRevoke(invitationId: string) {
    setMessage(null);
    startTransition(async () => {
      const res = await revokeInvitation(companyId, invitationId);
      if (res?.error) setMessage({ type: "err", text: res.error });
      else router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-medium">Collaborateurs</h2>
      <p className="mb-4 text-xs text-gray-500">
        Invitez des collaborateurs à accéder à ce dossier.
      </p>

      <ul className="mb-4 divide-y divide-gray-100">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm">
                {m.fullName || m.email}
                {m.isSelf && (
                  <span className="ml-1 text-xs text-gray-400">(vous)</span>
                )}
              </p>
              {m.fullName && (
                <p className="truncate text-xs text-gray-500">{m.email}</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {ROLE_LABELS[m.role] ?? m.role}
              </span>
              {canManage && !m.isSelf && (
                <button
                  type="button"
                  onClick={() => onRemove(m.userId)}
                  disabled={isPending}
                  title="Retirer du dossier"
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {invitations.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
            Invitations en attente
          </p>
          <ul className="divide-y divide-gray-100">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-2 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-orange-400" />
                  <span className="truncate text-sm text-gray-600">
                    {inv.email}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700">
                    {ROLE_LABELS[inv.role] ?? inv.role}
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => onRevoke(inv.id)}
                      disabled={isPending}
                      title="Annuler l'invitation"
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage ? (
        <div className="border-t border-gray-100 pt-4">
          <div className="mb-3 inline-flex rounded-md border border-gray-200 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                setMethod("email");
                setMessage(null);
                setCredential(null);
              }}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 ${
                method === "email"
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-gray-600"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Invitation par email
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("password");
                setMessage(null);
                setCredential(null);
              }}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 ${
                method === "password"
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-gray-600"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Mot de passe direct
            </button>
          </div>

          <form ref={formRef} action={onInvite}>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="email@exemple.com"
                  className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <select
                name="role"
                defaultValue="comptable"
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
              >
                <option value="comptable">Comptable</option>
                <option value="consultant">Consultant</option>
                <option value="viewer">Lecture seule</option>
              </select>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {method === "password" ? (
                  <KeyRound className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {method === "password" ? "Créer l'accès" : "Inviter"}
              </button>
            </div>
            {method === "password" && (
              <input
                name="fullName"
                type="text"
                placeholder="Nom complet (optionnel)"
                className="mt-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none sm:max-w-xs"
              />
            )}
            <p className="mt-2 text-xs text-gray-400">
              {method === "password"
                ? "Un mot de passe temporaire est généré et affiché une seule fois : communiquez-le vous-même au collaborateur."
                : "Un email d'invitation est envoyé avec un lien pour définir le mot de passe."}
            </p>
          </form>
        </div>
      ) : (
        <p className="border-t border-gray-100 pt-4 text-xs text-gray-500">
          Seul le propriétaire du dossier peut inviter des collaborateurs.
        </p>
      )}

      {credential && (
        <div className="mt-3 rounded-md border border-green-300 bg-green-50 p-3">
          <p className="mb-2 text-xs font-medium text-green-800">
            Accès créé. Notez ces identifiants — le mot de passe ne sera plus
            affiché.
          </p>
          <dl className="space-y-1 text-xs text-gray-700">
            <div className="flex gap-2">
              <dt className="w-20 text-gray-500">Email</dt>
              <dd className="font-mono">{credential.email}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="w-20 text-gray-500">Mot de passe</dt>
              <dd className="font-mono font-medium">{credential.password}</dd>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(
                      `Email : ${credential.email}\nMot de passe : ${credential.password}`
                    )
                    .then(() => setCopied(true));
                }}
                className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-1.5 py-0.5 text-gray-600 hover:bg-gray-50"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copié" : "Copier"}
              </button>
            </div>
          </dl>
        </div>
      )}

      {message && (
        <p
          className={`mt-3 text-xs ${
            message.type === "ok" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
