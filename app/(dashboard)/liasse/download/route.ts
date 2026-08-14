import { type NextRequest } from "next/server";
import { getActiveCompany } from "@/lib/supabase/get-active-company";
import { buildLiasseBuffer } from "@/lib/liasse/build";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const active = await getActiveCompany();
  if (!active.companyId) {
    return new Response("Aucun dossier actif.", { status: 400 });
  }

  const exercice = request.nextUrl.searchParams.get("exercice") ?? undefined;

  try {
    const { buffer, year } = await buildLiasseBuffer(
      {
        companyId: active.companyId,
        initialCapital: active.initialCapital,
        companyName: active.companyName,
      },
      exercice
    );

    const safeName = (active.companyName ?? "entreprise")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="liasse-smt-${safeName}-${year}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Erreur génération liasse:", e);
    return new Response(
      "Erreur lors de la génération de la liasse. Réessayez plus tard.",
      { status: 500 }
    );
  }
}
