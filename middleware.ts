import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * L'utilisateur a-t-il accès à au moins un dossier dont l'organisation
 * dispose d'un abonnement actif (essai ou payant) ? En mode cabinet, un
 * collaborateur invité ne doit pas être bloqué par l'expiration de son
 * éventuelle organisation personnelle : il suffit qu'un des dossiers
 * auxquels il a accès soit couvert.
 *
 * Fail-open : en cas d'absence de clé service ou d'erreur, on n'empêche
 * pas l'accès — le paywall ne doit jamais casser tout le site.
 */
async function hasActiveAccess(userId: string): Promise<boolean> {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return true;

    const admin = createAdminClient();

    const [{ data: memberships }, { data: profile }] = await Promise.all([
      admin
        .from("company_members")
        .select("companies(organization_id)")
        .eq("user_id", userId),
      admin
        .from("profiles")
        .select("organization_id")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const orgIds = new Set<string>();
    for (const m of memberships ?? []) {
      const orgId = (m.companies as unknown as { organization_id: string } | null)
        ?.organization_id;
      if (orgId) orgIds.add(orgId);
    }
    if (profile?.organization_id) orgIds.add(profile.organization_id);

    // Aucun dossier rattaché : on laisse passer (cas onboarding).
    if (orgIds.size === 0) return true;

    const { data: subs } = await admin
      .from("subscriptions")
      .select("status, current_period_end")
      .in("organization_id", [...orgIds]);

    return (subs ?? []).some((s) => {
      const within = s.current_period_end
        ? new Date(s.current_period_end).getTime() > Date.now()
        : false;
      return (s.status === "trialing" || s.status === "active") && within;
    });
  } catch {
    return true;
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  const PROTECTED_PREFIXES = [
    "/dashboard",
    "/saisie",
    "/journal",
    "/dettes-creances",
    "/commandes",
    "/stocks",
    "/profil",
    "/parametres",
    "/immobilisations",
    "/compte-resultat",
    "/bilan",
    "/ratios",
    "/liasse",
    "/abonnement",
    "/admin",
  ];
  const isProtectedRoute =
    PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p)) &&
    !request.nextUrl.pathname.startsWith("/admin/login");
  const isAbonnementRoute = request.nextUrl.pathname.startsWith("/abonnement");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Paywall : redirige vers /abonnement si aucun dossier accessible n'est
  // couvert par un abonnement actif — sauf si l'utilisateur y est déjà (pour
  // pouvoir payer) ou s'il est sur /admin (non soumis au paywall).
  if (user && isProtectedRoute && !isAbonnementRoute && !isAdminRoute) {
    const allowed = await hasActiveAccess(user.id);
    if (!allowed) {
      return NextResponse.redirect(new URL("/abonnement", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
