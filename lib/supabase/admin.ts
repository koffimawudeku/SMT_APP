import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client "admin" utilisant la clé service_role : contourne la RLS.
 * À utiliser UNIQUEMENT dans du code serveur de confiance (webhooks,
 * tâches planifiées) — jamais exposé au navigateur, jamais dans du code
 * accessible depuis une requête utilisateur non authentifiée par ailleurs.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
