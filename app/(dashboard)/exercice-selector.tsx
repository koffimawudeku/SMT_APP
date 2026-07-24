"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Sélecteur d'exercice comptable partagé par le Journal, le Compte de
 * Résultat, le Bilan et les Ratios. Met à jour le paramètre `?exercice=`
 * dans l'URL, ce qui déclenche un nouveau rendu serveur de la page.
 */
export default function ExerciceSelector({
  years,
  selected,
}: {
  years: number[];
  selected: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("exercice", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-gray-600 print:hidden">
      <span>Exercice</span>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-primary focus:outline-none"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
            {y === currentYear ? " (en cours)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
