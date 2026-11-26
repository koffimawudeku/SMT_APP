export async function requestPasswordReset(formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Adresse email invalide." };
  }

  const email = parsed.data.email;

  try {
    const admin = createAdminClient();
    const { data, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (linkError) {
      // Cas normal si l'email n'existe pas : on ne le révèle pas au visiteur.
      console.error("[reset-password] generateLink:", linkError.message);
    }

    const hashedToken = data?.properties?.hashed_token;
    if (hashedToken) {
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL || "https://smt-app-seven.vercel.app"
      ).replace(/\/$/, "");
      const link = `${appUrl}/definir-mot-de-passe?token_hash=${hashedToken}&type=recovery`;
      const html = emailLayout(
        "Réinitialisation de mot de passe",
        `<p style="font-size:14px;line-height:1.5">Vous avez demandé à réinitialiser votre mot de passe SMT.</p>
         <p style="margin:20px 0">${emailButton(link, "Choisir un nouveau mot de passe")}</p>
         <p style="font-size:12px;color:#6b7280">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`
      );
      await sendEmail({ to: email, subject: "Réinitialisation de votre mot de passe SMT", html });
    }
  } catch (err) {
    // Rien n'est montré au visiteur, mais on garde la trace pour le débogage.
    console.error("[reset-password] échec :", err);
  }

  return {
    success: true,
    message:
      "Si un compte existe pour cette adresse, un email de réinitialisation vient d'être envoyé.",
  };
}
