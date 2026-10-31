import { NextResponse } from "next/server";
import { z } from "zod";
import { procitajZahtjevSesiju } from "@/lib/auth/requestSession";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { demoStornoItem } from "@/lib/demo/store";

const StornoSchema = z.object({
  razlog: z.enum(["Pogrešan unos", "Gost odustao", "Greška kuhinje", "Drugo"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sesija = await procitajZahtjevSesiju();
  if (sesija?.uloga !== "konobar") {
    return NextResponse.json({ greska: "Prijavite se kao konobar." }, { status: 401 });
  }

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ greska: "Neispravna stavka." }, { status: 400 });
  }
  const tijelo: unknown = await request.json().catch(() => null);
  const rezultat = StornoSchema.safeParse(tijelo);
  if (!rezultat.success) {
    return NextResponse.json({ greska: "Odaberite razlog storna." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    try {
      return NextResponse.json({ storno: await demoStornoItem({
        itemId: id, reason: rezultat.data.razlog, actor: sesija.ime,
      }) });
    } catch (error) {
      return NextResponse.json({ greska: error instanceof Error ? error.message : "Storno nije uspio." }, { status: 422 });
    }
  }

  const { data, error } = await supabase.rpc("storniraj_stavku", {
    p_stavka_id: id,
    p_razlog: rezultat.data.razlog,
    p_akter_ime: sesija.ime,
  });
  if (error) {
    console.error("Storno stavke nije uspjelo:", error);
    return NextResponse.json({ greska: error.message }, { status: 422 });
  }
  return NextResponse.json({ storno: data });
}
