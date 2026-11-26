"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const WHATSAPP = "22890548176";
const URL_MENSUEL = "https://link.saspay.me/7c8odpeeqm4";
// Lien SaSPay du plan annuel : à ajouter dans Vercel (NEXT_PUBLIC_SASPAY_ANNUEL_URL)
const URL_ANNUEL: string | null = process.env.NEXT_PUBLIC_SASPAY_ANNUEL_URL || null;

type Etat = { chargement: boolean; dateFin: Date | null; actif: boolean };

function useAbonnement(): Etat {
  const [etat, setEtat] = useState<Etat>({ chargement: true, dateFin: null, actif: false });

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      // La règle de sécurité ne renvoie que les lignes de l'organisation de l'utilisateur
      const { data } = await supabase
        .from("subscriptions")
        .select("current_period_end, status")
        .in("status", ["active", "trialing"])
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      const fin = data?.current_period_end ? new Date(data.current_period_end) : null;
      setEtat({ chargement: false, dateFin: fin, actif: !!fin && fin.getTime() > Date.now() });
    })();
  }, []);

  return etat;
}

function whatsappLink(texte: string): string {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texte)}`;
}

type PlanCardProps = {
  titre: string;
  prix: string;
  unite: string;
  badge?: string;
  url: string | null;
  texteWhatsapp: string;
  recommande?: boolean;
};

function PlanCard({ titre, prix, unite, badge, url, texteWhatsapp, recommande }: PlanCardProps) {
  const bouton =
    "block rounded-lg bg-blue-500 py-3 text-center font-semibold text-white hover:bg-blue-600";
  return (
    <div className={`rounded-2xl bg-white p-6 ${recommande ? "border-2 border-blue-500" : "border"}`}>
      <p className="text-gray-600">
        {titre}
        {badge && (
          <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">{badge}</span>
        )}
      </p>
      <p className="my-3 text-3xl font-bold">
        {prix} <span className="text-base font-normal text-gray-500">{unite}</span>
      </p>

      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={bouton}>
          Payer {prix}
        </a>
      ) : (
        <a href={whatsappLink(texteWhatsapp)} target="_blank" rel="noopener noreferrer" className={bouton}>
          Demander par WhatsApp
        </a>
      )}
    </div>
  );
}

export default function AbonnementPage() {
  const { chargement, dateFin, actif } = useAbonnement();

  const joursRestants = dateFin
    ? Math.ceil((dateFin.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Abonnement</h1>
      <p className="mb-6 text-gray-600">Gérez votre essai gratuit ou votre abonnement SMT.</p>

      {!chargement && (
        <div
          className={`mb-6 rounded-xl border p-4 text-sm ${
            actif ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {dateFin ? (
            <>
              {actif ? "Votre accès est actif jusqu'au " : "Votre accès a expiré le "}
              <strong>{dateFin.toLocaleDateString("fr-FR")}</strong>
              {actif && joursRestants !== null && joursRestants <= 5 && (
                <span>
                  {" "}
                  ({joursRestants} jour{joursRestants > 1 ? "s" : ""} restant{joursRestants > 1 ? "s" : ""})
                </span>
              )}
            </>
          ) : (
            "Aucun abonnement actif. Choisissez un plan ci-dessous pour continuer à utiliser SMT."
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <PlanCard
          titre="Mensuel"
          prix="2 950 FCFA"
          unite="/mois"
          url={URL_MENSUEL}
          texteWhatsapp="Bonjour, je souhaite l'abonnement mensuel SMT (2 950 FCFA)."
        />
        <PlanCard
          titre="Annuel"
          badge="Recommandé"
          prix="35 400 FCFA"
          unite="/an"
          recommande
          url={URL_ANNUEL}
          texteWhatsapp="Bonjour, je souhaite l'abonnement annuel SMT (35 400 FCFA)."
        />
      </div>

      <p className="mt-6 text-sm text-gray-500">
        Paiement sécurisé via SaSPay. Après le paiement, envoyez votre reçu par WhatsApp pour activer votre
        compte (sous 24 h).{" "}
        <a
          href={whatsappLink("Bonjour, j'ai payé mon abonnement SMT. Voici ma preuve de paiement.")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Envoyer ma preuve de paiement
        </a>
      </p>
    </main>
  );
}
