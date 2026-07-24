"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, Mail, Ban, RotateCcw, Trash2 } from "lucide-react";
import {
  setPlatformAdmin,
  resendConfirmationEmail,
  setUserBanned,
  deleteUserAccount,
} from "./user-actions";
import type { AdminUser } from "./users-table";

export default function UserRowActions({
  user,
  isSelf,
  onMessage,
}: {
  user: AdminUser;
  isSelf: boolean;
  onMessage: (msg: { type: "ok" | "err"; text: string }) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  function run(
    fn: () => Promise<{ error?: string; success?: boolean }>,
    okText: string
  ) {
    startTransition(async () => {
      const res = await fn();
      if (res?.error) {
        onMessage({ type: "err", text: res.error });
        return;
      }
      onMessage({ type: "ok", text: okText });
      router.refresh();
    });
  }

  if (confirmingDelete) {
    return (
      <div className="min-w-[220px] rounded-md border border-red-200 bg-red-50 p-2">
        <p className="mb-1 text-xs text-red-700">
          Suppression définitive. Saisissez{" "}
          <span className="font-medium">{user.email}</span> pour confirmer.
        </p>
        <input
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          placeholder="Confirmer l'email"
          className="mb-2 w-full rounded border border-red-300 px-2 py-1 text-xs"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending || confirmEmail.trim().length === 0}
            onClick={() =>
              run(
                () => deleteUserAccount(user.id, confirmEmail),
                "Compte supprimé."
              )
            }
            className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            {isPending ? "..." : "Supprimer définitivement"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmingDelete(false);
              setConfirmEmail("");
            }}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {user.isPlatformAdmin ? (
        <button
          type="button"
          disabled={isPending || isSelf}
          title={
            isSelf
              ? "Vous ne pouvez pas révoquer vos propres droits"
              : "Révoquer les droits administrateur"
          }
          onClick={() =>
            run(() => setPlatformAdmin(user.id, false), "Droits admin révoqués.")
          }
          className="inline-flex items-center gap-1 rounded border border-purple-300 px-2 py-1 text-xs text-purple-700 hover:bg-purple-50 disabled:opacity-40"
        >
          <ShieldOff className="h-3 w-3" />
          Révoquer admin
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending}
          title="Promouvoir administrateur de plateforme"
          onClick={() =>
            run(() => setPlatformAdmin(user.id, true), "Droits admin accordés.")
          }
          className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          <ShieldCheck className="h-3 w-3" />
          Promouvoir
        </button>
      )}

      {!user.emailConfirmed && (
        <button
          type="button"
          disabled={isPending}
          title="Renvoyer l'email de confirmation"
          onClick={() =>
            run(
              () => resendConfirmationEmail(user.email),
              "Email de confirmation renvoyé."
            )
          }
          className="inline-flex items-center gap-1 rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50 disabled:opacity-40"
        >
          <Mail className="h-3 w-3" />
          Renvoyer
        </button>
      )}

      {user.banned ? (
        <button
          type="button"
          disabled={isPending}
          title="Réactiver le compte"
          onClick={() =>
            run(() => setUserBanned(user.id, false), "Compte réactivé.")
          }
          className="inline-flex items-center gap-1 rounded border border-green-300 px-2 py-1 text-xs text-green-700 hover:bg-green-50 disabled:opacity-40"
        >
          <RotateCcw className="h-3 w-3" />
          Réactiver
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending || isSelf}
          title={
            isSelf
              ? "Vous ne pouvez pas suspendre votre propre compte"
              : "Suspendre le compte (connexion bloquée)"
          }
          onClick={() =>
            run(() => setUserBanned(user.id, true), "Compte suspendu.")
          }
          className="inline-flex items-center gap-1 rounded border border-orange-300 px-2 py-1 text-xs text-orange-700 hover:bg-orange-50 disabled:opacity-40"
        >
          <Ban className="h-3 w-3" />
          Suspendre
        </button>
      )}

      <button
        type="button"
        disabled={isPending || isSelf}
        title={
          isSelf
            ? "Vous ne pouvez pas supprimer votre propre compte"
            : "Supprimer définitivement le compte"
        }
        onClick={() => setConfirmingDelete(true)}
        className="inline-flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"
      >
        <Trash2 className="h-3 w-3" />
        Supprimer
      </button>
    </div>
  );
}
