import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, emailLayout, emailButton } from "@/lib/email";

/**
 * Crée un compte via `generateLink` (type invite) et envoie l'email
 * d'invitation par Resend, avec un lien vers la page de définition du mot
 * de passe. `generateLink` NE déclenche PAS l'email intégré de Supabase :
 * on garde donc la main sur l'envoi (indépendant du SMTP Supabase).
 *
 * Retourne l'utilisateur créé (pour rattachement éventuel) et une erreur
 * d'email non bloquante : le compte peut exister même si l'email a échoué.
 */
export async function inviteNewUserByEmail(
  admin: SupabaseClient,
  {
    email,
    fullName,
    metadata,
    heading,
    intro,
  }: {
    email: string;
    fullName?: string | null;
    metadata?: Record<string, unknown>;
    heading: string;
    intro: string;
  }
): Promise<{ userId?: string; error?: string; emailError?: string }> {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: fullName ?? null, ...(metadata ?? {}) },
    },
  });

  if (error || !data?.user) {
    return { error: error?.message ?? "Création du compte impossible." };
  }

  const hashedToken = data.properties?.hashed_token;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = `${appUrl}/definir-mot-de-passe?token_hash=${hashedToken}&type=invite`;

  const html = emailLayout(
    heading,
    `<p style="font-size:14px;line-height:1.5">${intro}</p>
     <p style="font-size:14px;line-height:1.5">Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à la plateforme.</p>
     <p style="margin:20px 0">${emailButton(link, "Définir mon mot de passe")}</p>
     <p style="font-size:12px;color:#6b7280">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>${link}</p>`
  );

  const { error: emailError } = await sendEmail({
    to: email,
    subject: heading,
    html,
  });

  return { userId: data.user.id, emailError: emailError };
}

/**
 * Notifie un utilisateur EXISTANT qu'il a été ajouté à un dossier (il a
 * déjà un mot de passe, aucun lien d'activation nécessaire).
 */
export async function notifyCollaboratorAdded(
  email: string,
  dossierName: string
): Promise<{ error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const html = emailLayout(
    "Accès à un nouveau dossier",
    `<p style="font-size:14px;line-height:1.5">Vous avez été ajouté(e) au dossier <strong>${dossierName}</strong> sur SMT.</p>
     <p style="font-size:14px;line-height:1.5">Connectez-vous avec vos identifiants habituels : le dossier apparaîtra dans le sélecteur en haut de la barre latérale.</p>
     ${appUrl ? `<p style="margin:20px 0">${emailButton(`${appUrl}/login`, "Se connecter")}</p>` : ""}`
  );

  return sendEmail({ to: email, subject: "Vous avez accès à un nouveau dossier SMT", html });
}
