import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    "/stocks",
    "/parametres",
    "/immobilisations",
    "/compte-resultat",
    "/bilan",
    "/ratios",
    "/abonnement",
    "/admin",
  ];
  const isProtectedRoute = PROTECTED_PREFIXES.some((p) =>
    request.nextUrl.pathname.startsWith(p)
  );
  const isAbonnementRoute = request.nextUrl.pathname.startsWith("/abonnement");
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Paywall : essai/abonnement expiré → redirige vers /abonnement,
  // sauf si l'utilisateur y est déjà (pour pouvoir payer), ou s'il est
  // sur /admin (un admin de plateforme n'est pas soumis au paywall).
  if (user && isProtectedRoute && !isAbonnementRoute && !isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profile?.organization_id) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("organization_id", profile.organization_id)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      const periodEnd = subscription?.current_period_end
        ? new Date(subscription.current_period_end)
        : null;
      const isWithinPeriod = periodEnd ? periodEnd.getTime() > Date.now() : false;
      const isActive =
        (subscription?.status === "trialing" || subscription?.status === "active") &&
        isWithinPeriod;

      if (!isActive) {
        return NextResponse.redirect(new URL("/abonnement", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
