"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailLayout, emailButton } from "@/lib/email";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Envoie un email de réinitialisation de mot de passe via Resend, avec un
 * lien vers /definir-mot-de-passe. Réponse volontairement générique : on ne
 * révèle jamais si l'email correspond à un compte (anti-énumération).
 */
export async function requestPasswordReset(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Adresse email invalide." };
  }

  const email = parsed.data.email;

  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    const hashedToken = data?.properties?.hashed_token;
    if (hashedToken) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const link = `${appUrl}/definir-mot-de-passe?token_hash=${hashedToken}&type=recovery`;
      const html = emailLayout(
        "Réinitialisation de mot de passe",
        `<p style="font-size:14px;line-height:1.5">Vous avez demandé à réinitialiser votre mot de passe SMT.</p>
         <p style="margin:20px 0">${emailButton(link, "Choisir un nouveau mot de passe")}</p>
         <p style="font-size:12px;color:#6b7280">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
      );
      await sendEmail({ to: email, subject: "Réinitialisation de votre mot de passe SMT", html });
    }
  } catch {
    // On n'expose aucune erreur interne au visiteur non authentifié.
  }

  return {
    success: true,
    message:
      "Si un compte existe pour cette adresse, un email de réinitialisation vient d'être envoyé.",
  };
}
