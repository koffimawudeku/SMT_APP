import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMT — Système Minimal de Trésorerie",
  description: "Gestion financière simplifiée pour TPE, PME et incubateurs.",
};

// Script anti-flash : applique le thème avant le premier rendu, à partir de
// localStorage puis, à défaut, de la préférence système.
const noFlashScript = `
try {
  var t = localStorage.getItem('theme');
  if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  if (t === 'dark') document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Source de vérité côté serveur : le cookie (posé par le sélecteur de thème).
  const theme = cookies().get("theme")?.value === "dark" ? "dark" : "";

  return (
    <html lang="fr" className={theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
