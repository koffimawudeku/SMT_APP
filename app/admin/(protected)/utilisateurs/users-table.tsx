"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  organization: string | null;
  isPlatformAdmin: boolean;
  emailConfirmed: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  dossiers: { name: string; role: string }[];
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  comptable: "Comptable",
  consultant: "Consultant",
  viewer: "Lecture seule",
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

export default function UsersTable({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.fullName ?? "").toLowerCase().includes(q) ||
        (u.organization ?? "").toLowerCase().includes(q) ||
        u.dossiers.some((d) => d.name.toLowerCase().includes(q))
    );
  }, [users, query]);

  return (
    <>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un nom, email, dossier…"
          className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Utilisateur</th>
              <th className="px-4 py-2">Organisation</th>
              <th className="px-4 py-2">Dossiers &amp; rôles</th>
              <th className="px-4 py-2">Inscrit le</th>
              <th className="px-4 py-2">Dernière connexion</th>
              <th className="px-4 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 align-top">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{u.fullName || "—"}</span>
                    {u.isPlatformAdmin && (
                      <span
                        title="Administrateur de la plateforme"
                        className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{u.email}</div>
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {u.organization ?? "—"}
                </td>
                <td className="px-4 py-2">
                  {u.dossiers.length === 0 ? (
                    <span className="text-xs text-gray-400">Aucun dossier</span>
                  ) : (
                    <ul className="space-y-0.5">
                      {u.dossiers.map((d, i) => (
                        <li key={`${u.id}-${i}`} className="text-xs">
                          <span className="text-gray-700">{d.name}</span>
                          <span className="ml-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-gray-500">
                            {ROLE_LABELS[d.role] ?? d.role}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {formatDate(u.createdAt)}
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {u.lastSignInAt ? (
                    formatDate(u.lastSignInAt)
                  ) : (
                    <span className="text-orange-600">Jamais connecté</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {u.emailConfirmed ? (
                    <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                      Confirmé
                    </span>
                  ) : (
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-700">
                      Non confirmé
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            Aucun utilisateur ne correspond à cette recherche.
          </p>
        )}
      </div>
    </>
  );
}
