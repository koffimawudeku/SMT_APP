"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Trash2, UserPlus, Clock } from "lucide-react";
import {
  inviteCollaborator,
  removeMember,
  revokeInvitation,
} from "./members-actions";
import type { CompanyMember, PendingInvitation } from "@/lib/members";

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
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onInvite(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await inviteCollaborator(companyId, formData);
      if (res?.error) {
        setMessage({ type: "err", text: res.error });
        return;
      }
      formRef.current?.reset();
      const emailError = "emailError" in res ? res.emailError : undefined;
      const base = res?.immediate
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
        <form ref={formRef} action={onInvite} className="border-t border-gray-100 pt-4">
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
              <UserPlus className="h-4 w-4" />
              Inviter
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-gray-100 pt-4 text-xs text-gray-500">
          Seul le propriétaire du dossier peut inviter des collaborateurs.
        </p>
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
