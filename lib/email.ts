/**
 * Envoi d'emails transactionnels via Resend (API REST, sans dépendance).
 *
 * Variables d'environnement attendues (côté serveur uniquement) :
 * - RESEND_API_KEY  : clé API Resend
 * - RESEND_FROM     : expéditeur, ex. "SMT <no-reply@mondomaine.com>".
 *                     Par défaut "SMT <onboarding@resend.dev>", qui ne
 *                     délivre qu'à l'adresse du titulaire du compte Resend
 *                     (mode test) — un domaine vérifié est requis pour
 *                     envoyer à n'importe quel destinataire.
 */
const DEFAULT_FROM = "SMT <onboarding@resend.dev>";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      error:
        "RESEND_API_KEY absente — configurez-la dans les variables d'environnement pour l'envoi d'emails.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || DEFAULT_FROM,
        to: [to],
        subject,
        html,
        ...(text ? { text } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      return {
        error: `Envoi email refusé (${response.status}) : ${
          detail?.message ?? "erreur Resend"
        }`,
      };
    }

    return {};
  } catch {
    return { error: "Impossible de contacter le service d'email (Resend)." };
  }
}

/** Enveloppe HTML commune, sobre et compatible clients mail. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f3f4f6;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
    <h1 style="margin:0 0 16px;font-size:18px;color:#1A56A0">${title}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">SMT — Système Minimal de Trésorerie</p>
  </div>
</body></html>`;
}

/** Bouton d'action réutilisable dans les emails. */
export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1A56A0;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px">${label}</a>`;
}
