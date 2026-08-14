"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: {
  href: string;
  label: string;
  group?: string;
}[] = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/saisie", label: "Saisie de flux" },
  { href: "/journal", label: "Journal" },
  { href: "/compte-resultat", label: "Compte de Résultat" },
  { href: "/bilan", label: "Bilan" },
  { href: "/ratios", label: "Analyse des Ratios" },
  { href: "/liasse", label: "Liasse fiscale" },
  { href: "/immobilisations", label: "Suivi du Matériel" },
  { href: "/dettes-creances", label: "Dettes & créances" },
  { href: "/commandes", label: "Commandes" },
  { href: "/stocks", label: "État global", group: "Stocks" },
  { href: "/stocks/saisie", label: "Stock Input", group: "Stocks" },
  { href: "/stocks/par-article", label: "Stock par article", group: "Stocks" },
  { href: "/profil", label: "Profil de l'entreprise" },
  { href: "/parametres", label: "Paramètres" },
  { href: "/abonnement", label: "Abonnement" },
];

export default function NavLinks() {
  const pathname = usePathname();
  let lastGroup: string | undefined;

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const showGroupHeader = item.group && item.group !== lastGroup;
        lastGroup = item.group;

        return (
          <div key={item.href}>
            {showGroupHeader && (
              <p className="mt-3 px-3 pb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                {item.group}
              </p>
            )}
            <Link
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                item.group ? "ml-2" : ""
              } ${
                active
                  ? "bg-primary font-medium text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          </div>
        );
      })}
    </>
  );
}
