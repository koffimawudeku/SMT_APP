import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMT — Système Minimal de Trésorerie",
  description: "Gestion financière simplifiée pour TPE, PME et incubateurs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
