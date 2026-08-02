"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Bascule clair / sombre. L'état est persisté dans un cookie (lu côté
 * serveur par le layout racine pour éviter tout flash) et dans localStorage
 * (utilisé par le script anti-flash au tout premier chargement).
 */
export default function ThemeToggle({
  variant = "full",
}: {
  variant?: "full" | "icon";
}) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* stockage indisponible : le cookie suffit */
    }
    document.cookie = `theme=${next ? "dark" : "light"};path=/;max-age=31536000;samesite=lax`;
  }

  const Icon = dark ? Sun : Moon;
  const label = dark ? "Mode clair" : "Mode sombre";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
